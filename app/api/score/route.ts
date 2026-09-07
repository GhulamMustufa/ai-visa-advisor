import { NextResponse } from "next/server";
import { z } from "zod";
import type { EnglishTest, TargetRegion, VisaProfile, ScoreResponse, RankedPathway } from "@/lib/types";
import { normalizeProfile } from "@/lib/profile";
import { getPathwaysForRegion, PATHWAY_REGISTRY } from "@/lib/domain";
import { evaluateEligibility } from "@/lib/engine";
import { rankPathways } from "@/lib/recommendation";
import { buildAIOrchestratorPrompt } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, log } from "@/lib/logger";
import { withRetry } from "@/lib/retry";
import {
  persistSubmission,
  countMonthlySubmissions,
  getUserSubscription,
} from "@/lib/persistence";
import { createClient } from "@/utils/supabase/server";
import { FREE_MONTHLY_LIMIT } from "@/lib/stripe";

const REGIONS = [
  "canada",
  "uk",
  "australia-new-zealand",
  "germany-nordics",
  "southern-europe",
  "middle-east",
  "usa",
  "sg-my",
  "jp-kr",
  "easy-entry",
] as const;
const EDUCATION = ["high_school", "bachelor", "master", "phd"] as const;
const ENGLISH = ["none", "ielts", "toefl"] as const;
const GOALS = ["work", "study", "pr"] as const;

const profileSchema = z.object({
  nationality: z.string().trim().min(1, "nationality is required"),
  targetRegion: z.enum(REGIONS),
  age: z.coerce.number().int().min(18).max(80),
  education: z.enum(EDUCATION),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  fieldOfWork: z.string().trim().min(1, "fieldOfWork is required"),
  englishTest: z.enum(ENGLISH),
  testScore: z.coerce.number().nullable().optional(),
  savingsUsd: z.coerce.number().min(0).max(50_000_000),
  goal: z.enum(GOALS),
});

function parseOptionalTestScore(
  englishTest: EnglishTest,
  raw: unknown,
): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (englishTest === "none") return null;
  if (englishTest === "ielts") return Math.min(9, Math.max(0, n));
  return Math.min(120, Math.max(0, n));
}

function safeJsonParse(input: string): { pathways: RankedPathway[], summary: string } | null {
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    log("warn", "rate_limited", { requestId, ip, retryAfterMs: rate.retryAfterMs });
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      },
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const subscription = await getUserSubscription(user.id);
    const isPro = subscription?.plan === "pro" && subscription.status === "active";
    if (!isPro) {
      const used = await countMonthlySubmissions(user.id);
      if (used >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${FREE_MONTHLY_LIMIT} assessments/month). Upgrade to Pro.`,
            upgradeRequired: true,
          },
          { status: 402 },
        );
      }
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = profileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const d = validation.data;
  const profile: VisaProfile = {
    nationality: d.nationality,
    targetRegion: d.targetRegion,
    age: Math.round(d.age),
    education: d.education,
    yearsExperience: Math.round(d.yearsExperience),
    fieldOfWork: d.fieldOfWork,
    englishTest: d.englishTest,
    testScore: parseOptionalTestScore(d.englishTest, d.testScore),
    savingsUsd: Math.round(d.savingsUsd),
    goal: d.goal,
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  // Phase 1: Deterministic Engine Execution
  const normalizedProfile = normalizeProfile(profile);
  const pathways = getPathwaysForRegion(profile.targetRegion);
  const evaluations = pathways.map(p => evaluateEligibility(normalizedProfile, p));
  const topEvaluations = rankPathways(evaluations).slice(0, 3);
  
  // Overall score logic (Deterministic)
  const overallScore = topEvaluations.length > 0 
    ? Math.round(topEvaluations.reduce((sum, e) => sum + e.baseScore, 0) / topEvaluations.length)
    : 0;

  // Phase 1: AI Reasoning Orchestration
  const userPrompt = buildAIOrchestratorPrompt(normalizedProfile, topEvaluations);
  
  let text = "";
  let modelUsed = "gpt-4o-mini";
  let lastErrorDetails = "";

  try {
    const raw = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25_000);
        try {
          const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            signal: controller.signal,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelUsed,
              temperature: 0.2,
              max_tokens: 2400,
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "visa_analysis",
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["summary", "pathways"],
                    properties: {
                      summary: { type: "string", description: "A highly concise 2 sentence summary of the applicant's overall situation." },
                      pathways: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: [
                            "name", "country", "reason", "weaknesses", "documents", 
                            "next_steps", "citations", "estimated_timeline", 
                            "top_improvement", "eligibility_confidence", 
                            "recommendation_confidence", "evidence_confidence", "source_freshness"
                          ],
                          properties: {
                            name: { type: "string" },
                            country: { type: "string" },
                            reason: { type: "string" },
                            weaknesses: { type: "array", items: { type: "string" } },
                            documents: { type: "array", items: { type: "string" } },
                            next_steps: { type: "array", items: { type: "string" } },
                            citations: {
                              type: "array",
                              items: {
                                type: "object",
                                additionalProperties: false,
                                required: ["title", "url"],
                                properties: {
                                  title: { type: "string" },
                                  url: { type: "string" },
                                },
                              },
                            },
                            estimated_timeline: { type: "string" },
                            top_improvement: { type: "string" },
                            eligibility_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                            recommendation_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                            evidence_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                            source_freshness: { type: "string", enum: ["VERIFIED", "STALE", "UNKNOWN"] },
                          },
                        },
                      },
                    },
                  },
                },
              },
              messages: [{ role: "user", content: userPrompt }],
            }),
          });
          if (!openaiRes.ok) throw new Error(await openaiRes.text());
          return (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
        } finally {
          clearTimeout(timer);
        }
      },
      { attempts: 2, baseDelayMs: 300 },
    );
    text = raw.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    lastErrorDetails = (err as Error)?.message ?? String(err);
  }

  if (!text) {
    log("error", "score_request_model_failure", { requestId, ip, details: lastErrorDetails });
    return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 502 });
  }

  const parsedAIResponse = safeJsonParse(text);
  if (!parsedAIResponse) {
    return NextResponse.json({ error: "OpenAI returned invalid JSON" }, { status: 502 });
  }

  // Merge deterministic evaluation data with AI qualitative data
  const finalPathways: RankedPathway[] = topEvaluations.map(evalData => {
    const aiData = parsedAIResponse.pathways.find(p => p.name.includes(evalData.pathwayId) || p.name === evalData.pathwayId) 
                   || parsedAIResponse.pathways[0]; // fallback
                   
    const domainData = PATHWAY_REGISTRY.find(p => p.id === evalData.pathwayId);
    
    return {
      ...evalData,
      name: domainData?.name || aiData.name,
      country: domainData?.country || aiData.country,
      reason: aiData.reason,
      weaknesses: aiData.weaknesses,
      documents: aiData.documents,
      next_steps: aiData.next_steps,
      citations: aiData.citations,
      estimated_timeline: aiData.estimated_timeline,
      top_improvement: aiData.top_improvement,
      eligibility_confidence: aiData.eligibility_confidence as any,
      recommendation_confidence: aiData.recommendation_confidence as any,
      evidence_confidence: aiData.evidence_confidence as any,
      source_freshness: aiData.source_freshness as any,
    };
  });

  const finalResponse: ScoreResponse = {
    overall_score: overallScore,
    summary: parsedAIResponse.summary,
    pathways: finalPathways
  };

  const promptVersion = "visa-prompt-v5-deterministic";
  try {
    await persistSubmission({
      requestId,
      ip,
      userId: user?.id ?? null,
      promptVersion,
      model: modelUsed,
      profile,
      sources: [], // Explicit source tracking moved to Phase 2
      result: { pathways: finalResponse.pathways.map(p => ({
        name: p.name, country: p.country, score: p.baseScore, reason: p.reason, 
        weaknesses: p.weaknesses, documents: p.documents, next_steps: p.next_steps, citations: p.citations
      }))},
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    log("warn", "score_persist_failed", { requestId, ip, promptVersion, modelUsed, details: String(err) });
  }

  log("info", "score_request_completed", { requestId, ip, modelUsed, promptVersion, latencyMs: Date.now() - startedAt });
  return NextResponse.json(finalResponse);
}
