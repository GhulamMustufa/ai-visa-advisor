import { NextResponse } from "next/server";
import { z } from "zod";
import type { EnglishTest, TargetRegion, VisaProfile, ScoreResponse, RankedPathway } from "@/lib/types";
import { normalizeProfile } from "@/lib/profile";
import { getPathwaysForRegion, PATHWAY_REGISTRY } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, log } from "@/lib/logger";
import { runVisaAssessment } from "@/lib/orchestrator";
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
  nationality: z.string().trim().min(1, "nationality is required").max(50, "nationality too long").regex(/^[a-zA-Z\s\-]+$/, "Invalid characters in nationality"),
  targetRegion: z.enum(REGIONS),
  age: z.coerce.number().int().min(18).max(80),
  education: z.enum(EDUCATION),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  fieldOfWork: z.string().trim().min(1, "fieldOfWork is required").max(50, "fieldOfWork too long").regex(/^[a-zA-Z0-9\s,\.\-&]+$/, "Invalid characters in field of work"),
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

  const promptVersion = "visa-prompt-v7-agentic";
  let modelUsed = "gpt-4o-mini";

  try {
    const { response, trace, evidenceList } = await runVisaAssessment(profile, requestId);

    try {
      await persistSubmission({
        requestId,
        ip,
        userId: user?.id ?? null,
        promptVersion,
        model: modelUsed,
        profile,
        sources: evidenceList.map(e => e.source_id),
        result: { pathways: response.pathways.map(p => ({
          name: p.name, country: p.country, score: p.baseScore, reason: p.reason, 
          weaknesses: p.weaknesses, documents: p.documents, next_steps: p.next_steps, citations: p.citations
        }))},
        latencyMs: Date.now() - startedAt,
      });
    } catch (err) {
      log("warn", "score_persist_failed", { requestId, ip, promptVersion, modelUsed, details: String(err) });
    }

    log("info", "score_request_completed", { requestId, ip, modelUsed, promptVersion, latencyMs: Date.now() - startedAt });
    return NextResponse.json(response);

  } catch (error) {
    log("error", "score_request_pipeline_failure", { requestId, ip, error: (error as Error).message });
    return NextResponse.json({ error: "An error occurred during evaluation." }, { status: 500 });
  }
}
