import { NextResponse } from "next/server";
import { z } from "zod";
import type { EnglishTest, TargetRegion, VisaProfile, ScoreResponse, RankedPathway } from "@/lib/types";
import { normalizeProfile } from "@/lib/profile";
import { getPathwaysForRegion, PATHWAY_REGISTRY } from "@/lib/domain";
import { evaluateEligibility } from "@/lib/engine";
import { rankPathways } from "@/lib/recommendation";
import { buildAIOrchestratorPrompt } from "@/lib/ai";
import { retrieveEvidence } from "@/lib/evidence";
import { validateCitations, detectConflicts } from "@/lib/validation";
import { TraceContext } from "@/lib/trace";
import { evaluateSynthesizerOutput } from "@/lib/critic";
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

  const trace = new TraceContext(requestId);

  let finalResponse: ScoreResponse | null = null;
  let modelUsed = "gpt-4o-mini";
  const promptVersion = "visa-prompt-v7-agentic";

  try {
    // Phase 1: Deterministic Engine Execution
    const { normalizedProfile, topEvaluations, overallScore } = await trace.runStep("evaluateEligibility", async () => {
      const np = normalizeProfile(profile);
      const pathways = getPathwaysForRegion(profile.targetRegion);
      const evaluations = pathways.map(p => evaluateEligibility(np, p));
      const top = rankPathways(evaluations).slice(0, 3);
      const score = top.length > 0 
        ? Math.round(top.reduce((sum, e) => sum + e.baseScore, 0) / top.length)
        : 0;
      return { normalizedProfile: np, topEvaluations: top, overallScore: score };
    });
    
    // Phase 2: Evidence Grounding (Retrieval)
    const evidenceList = await trace.runStep("retrieveEvidence", async () => {
      const queryText = `Visa requirements for a ${normalizedProfile.canonicalOccupation} seeking ${profile.goal} in ${profile.targetRegion}. Age: ${profile.age}. English Level: ${normalizedProfile.languageLevelCEFR}.`;
      const evidence = await retrieveEvidence(queryText, profile.targetRegion, topEvaluations[0]?.pathwayId, 10);
      return evidence;
    });
    
    trace.recordRetrieval(evidenceList.map(e => e.source_id));
    
    // Phase 4: Bounded AI Synthesizer and Critic Loop
    let basePrompt = buildAIOrchestratorPrompt(normalizedProfile, topEvaluations, evidenceList);
    let currentPrompt = basePrompt;
    
    let parsedAIResponse: any = null;
    const MAX_ITERATIONS = 2;
    let iteration = 0;
    let approved = false;

    while (iteration < MAX_ITERATIONS && !approved) {
      iteration++;
      
      const text = await trace.runStep(`synthesize_iteration_${iteration}`, async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25_000);
        try {
          const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            signal: controller.signal,
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: modelUsed,
              temperature: 0.2,
              max_tokens: 2400,
              response_format: { type: "json_schema", json_schema: { name: "visa_analysis", schema: {
                type: "object", additionalProperties: false, required: ["summary", "pathways"],
                properties: {
                  summary: { type: "string" },
                  pathways: {
                    type: "array", minItems: 1, items: {
                      type: "object", additionalProperties: false, required: [
                        "name", "country", "reason", "weaknesses", "documents", "next_steps", "citations", "estimated_timeline", "top_improvement", "eligibilityStatus", "eligibility_confidence", "recommendation_confidence", "evidence_confidence", "source_freshness"
                      ], properties: {
                        name: { type: "string" }, country: { type: "string" }, reason: { type: "string" }, weaknesses: { type: "array", items: { type: "string" } }, documents: { type: "array", items: { type: "string" } }, next_steps: { type: "array", items: { type: "string" } }, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } }, estimated_timeline: { type: "string" }, top_improvement: { type: "string" }, eligibilityStatus: { type: "string" }, eligibility_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] }, recommendation_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] }, evidence_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] }, source_freshness: { type: "string", enum: ["VERIFIED", "STALE", "UNKNOWN"] }
                      }
                    }
                  }
                }
              }}},
              messages: [{ role: "user", content: currentPrompt }],
            }),
          });
          if (!openaiRes.ok) throw new Error(await openaiRes.text());
          const resJson = await openaiRes.json();
          // Mocking tokens for observability
          trace.recordModelInfo(modelUsed, resJson.usage?.prompt_tokens || 0, resJson.usage?.completion_tokens || 0);
          return resJson.choices?.[0]?.message?.content?.trim() ?? "";
        } finally {
          clearTimeout(timer);
        }
      });

      parsedAIResponse = safeJsonParse(text);
      if (!parsedAIResponse) {
        throw new Error("OpenAI returned invalid JSON");
      }

      // Critic Step
      const criticResult = await trace.runStep(`critic_evaluation_${iteration}`, async () => {
        return await evaluateSynthesizerOutput(apiKey, text, topEvaluations, evidenceList);
      });

      if (criticResult.approved) {
        approved = true;
      } else {
        trace.recordRetry(criticResult);
        // Append Critic feedback for next iteration
        currentPrompt = basePrompt + `\n\nCRITIC FEEDBACK FROM PREVIOUS ATTEMPT (FIX THESE):\n- ${criticResult.feedback.join("\n- ")}`;
      }
    }

    if (!approved) {
      log("warn", "agent_exhausted_retries", { requestId, ip });
      // Fallback response for safety
      parsedAIResponse = {
        summary: "Your profile has been deterministically evaluated, but our AI assistant could not confidently verify the qualitative advice. Please refer to the raw metrics.",
        pathways: topEvaluations.map(e => ({
          name: e.pathwayId, country: "Unknown", reason: "AI validation failed. Hard requirements apply.",
          weaknesses: [], documents: [], next_steps: [], citations: [], estimated_timeline: "Unknown",
          top_improvement: "Review deterministic requirements.", eligibilityStatus: e.status,
          eligibility_confidence: "LOW", recommendation_confidence: "LOW", evidence_confidence: "LOW", source_freshness: "UNKNOWN"
        }))
      };
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
      status: evalData.status, // Always strictly preserve deterministic status
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

    finalResponse = {
      overall_score: overallScore,
      summary: parsedAIResponse.summary,
      pathways: finalPathways
    };

    trace.complete("success");

    try {
      await persistSubmission({
        requestId,
        ip,
        userId: user?.id ?? null,
        promptVersion,
        model: modelUsed,
        profile,
        sources: evidenceList.map(e => e.source_id),
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

  } catch (error) {
    trace.complete("error");
    log("error", "score_request_pipeline_failure", { requestId, ip, error: (error as Error).message });
    return NextResponse.json({ error: "An error occurred during evaluation." }, { status: 500 });
  }
}
