import { NextResponse } from "next/server";
import { z } from "zod";
import type { EnglishTest, Pathway, TargetRegion, VisaProfile } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, log } from "@/lib/logger";
import { withRetry } from "@/lib/retry";
import { retrieveSources } from "@/lib/rag";
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

const REGION_LABEL: Record<TargetRegion, string> = {
  canada: "Canada",
  uk: "UK",
  "australia-new-zealand": "Australia/New Zealand",
  "germany-nordics": "Germany/Northern Europe",
  "southern-europe": "Southern Europe",
  "middle-east": "Middle East",
  usa: "USA",
  "sg-my": "Singapore/Malaysia",
  "jp-kr": "Japan/South Korea",
  "easy-entry": "Easy Entry Countries",
};

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

type ModelResponse = {
  pathways: Pathway[];
};

function deriveVariantMode(profile: VisaProfile): "strict" | "balanced" | "very_strict" {
  let weaknesses = 0;
  if (profile.savingsUsd < 5000) weaknesses++;
  if (profile.englishTest === "none") weaknesses++;
  if (profile.yearsExperience < 2) weaknesses++;
  if (profile.education === "high_school") weaknesses++;
  if (weaknesses >= 3) return "very_strict";
  if (weaknesses >= 1) return "strict";
  return "balanced";
}

function normalizeFieldOfWork(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (/\b(backend|frontend|full.?stack|software|web\s*dev|developer|programmer|coder)\b/.test(s)) return "Software Engineer";
  if (/\b(data\s*sci|ml|machine\s*learn|ai\b|deep\s*learn)\b/.test(s)) return "Data Scientist / ML Engineer";
  if (/\b(nurs|rn\b|registered\s*nurse)\b/.test(s)) return "Registered Nurse";
  if (/\b(doctor|physician|mbbs|md\b|gp\b|surgeon)\b/.test(s)) return "Medical Doctor";
  if (/\b(account|cpa\b|chartered\s*acc)\b/.test(s)) return "Accountant / CPA";
  if (/\b(teacher|tutor|educator|lecturer)\b/.test(s)) return "Teacher / Educator";
  if (/\b(cyber|infosec|security\s*eng)\b/.test(s)) return "Cybersecurity Engineer";
  if (/\b(civil|structural|mechanical|electrical\s*eng)\b/.test(s)) return "Engineer";
  return raw;
}

function buildSystemPrompt(profile: VisaProfile): string {
  return [
    `You are a senior immigration case analyst specializing in ${profile.nationality} applicants targeting ${REGION_LABEL[profile.targetRegion]}.`,
    "Your style is brutally honest, conservative, and practical.",
    "Do not be motivational or optimistic unless profile strength truly justifies it.",
    "",
    "Core rules:",
    "- Never invent visa routes, country programs, or legal claims.",
    "- If uncertain, lower score and explain exactly why uncertainty exists.",
    "- Penalize weak profiles aggressively (especially low savings, weak/no language proof, low experience).",
    "- Prefer higher scores only for evidence-backed strengths (skilled field, stronger education, stronger language, realistic pathway fit).",
    "- Give concrete, application-level advice; avoid generic statements.",
    "",
    "Scoring behavior:",
    "- Treat score as probability-like, not encouragement.",
    "- Assume refusal risk is meaningful unless profile evidence is strong.",
    "- Most real applicants fall in the 30–65 range; 86–100 is rare.",
    "",
    "Output discipline:",
    "- Return valid JSON only, matching the requested schema exactly.",
    "- No markdown, no prose outside JSON, no extra keys.",
  ].join("\n");
}

function buildUserPrompt(profile: VisaProfile): string {
  const variant = deriveVariantMode(profile);
  const normalizedField = normalizeFieldOfWork(profile.fieldOfWork);
  const likelySkilledField =
    /(engineer|developer|software|it|data|nurse|doctor|pharmac|account|finance|cyber|ai|ml|teacher|architect|mechanic|electric|weld|technician)/i.test(
      normalizedField,
    );
  const sources = retrieveSources(profile.targetRegion, profile.goal, 3);
  const sourcesPrompt = sources
    .map((s, i) => `${i + 1}. ${s.title} — ${s.url}\n   ${s.summary}\n   Key criteria:\n${s.criteria.split("\n").map((l) => `   ${l}`).join("\n")}`)
    .join("\n\n");

  return `Analyze this immigration profile and return the top 3 visa pathways with honest success probabilities.

Profile JSON:
${JSON.stringify(
    {
      ...profile,
      fieldOfWork: normalizedField,
      targetRegionLabel: REGION_LABEL[profile.targetRegion],
    },
    null,
    2,
  )}

Before scoring each pathway, use the "_thinking" field to:
- Identify the 2-3 strongest and 2-3 weakest aspects of this profile
- Note which pathways are realistic for the selected region
- Estimate a realistic score range before committing
Keep _thinking under 300 characters.

Output field constraints:
- reason: max 400 characters — explain WHY this specific score, referencing actual profile data
- weaknesses: 3-5 bullets — specific to this profile, not generic
- documents: 5-8 checklist items — pathway-specific, not generic
- next_steps: 3-5 bullets — concrete actions, not platitudes
- score_drivers: exactly 3 items — format "Factor: +Npts" or "Factor: -Npts" (e.g. "Master's degree: +12pts")
- estimated_timeline: realistic process duration (e.g. "6-12 months", "18-24 months")
- top_improvement: single most impactful action to raise score, under 120 characters
- citations: must reference only the provided official sources below

IMPORTANT scoring rules:
- Be realistic, not optimistic
- Penalize heavily: savingsUsd < 5000, englishTest is "none", yearsExperience < 2
- Prefer higher scores only for: skilled profession + higher education (Master/PhD) + strong language
- Do not hallucinate visa programs — only real, well-known pathways for the selected region
- If uncertain about a pathway, lower the score and explain why in reason

Official sources — ground ALL guidance in these only:
${sourcesPrompt}

Scoring anchors:
- 0-29: very unlikely without major profile changes
- 30-49: weak profile; possible only via indirect routes (study/employer)
- 50-69: plausible but competitive; significant conditions apply
- 70-85: strong profile; not guaranteed but realistic
- 86-100: rare; only for exceptionally strong, verified profiles

Profile scoring hints:
- skilled_field_detected: ${likelySkilledField ? "yes" : "no"}
- profile_variation_mode: ${variant}
  - strict: emphasize refusal risk and documentation burden
  - balanced: weigh risks and strengths equally
  - very_strict: apply tighter probability ceilings; assume adverse case

Return only JSON. No markdown, no code fences, no commentary.`;
}

function tryParseModelJson(raw: string): ModelResponse | null {
  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (!fenced) return null;
  return safeJsonParse(fenced);
}

function safeJsonParse(input: string): ModelResponse | null {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const maybe = parsed as Partial<ModelResponse>;
    if (!Array.isArray(maybe.pathways)) return null;
    const pathways = maybe.pathways.filter(Boolean);
    const valid = pathways.every((p) => {
      const item = p as Partial<Pathway>;
      return (
        typeof item.name === "string" &&
        typeof item.country === "string" &&
        typeof item.score === "number" &&
        Number.isFinite(item.score) &&
        typeof item.reason === "string" &&
        Array.isArray(item.weaknesses) &&
        Array.isArray(item.documents) &&
        Array.isArray(item.next_steps)
      );
    });
    if (!valid) return null;
    return {
      pathways: pathways.map((p) => {
        const item = p as Pathway;
        return {
          name: item.name.trim(),
          country: item.country.trim(),
          score: Math.max(0, Math.min(100, Math.round(item.score))),
          reason: item.reason.trim(),
          weaknesses: item.weaknesses.map((x) => String(x).trim()).filter(Boolean),
          documents: item.documents.map((x) => String(x).trim()).filter(Boolean),
          next_steps: item.next_steps.map((x) => String(x).trim()).filter(Boolean),
          citations: Array.isArray(item.citations)
            ? item.citations
                .map((c) => {
                  const v = c as { title?: unknown; url?: unknown };
                  return {
                    title: String(v.title ?? "").trim(),
                    url: String(v.url ?? "").trim(),
                  };
                })
                .filter((c) => c.title && c.url)
            : [],
          estimated_timeline: typeof item.estimated_timeline === "string" ? item.estimated_timeline.trim() : "",
          top_improvement: typeof item.top_improvement === "string" ? item.top_improvement.trim() : "",
          score_drivers: Array.isArray(item.score_drivers)
            ? item.score_drivers.map((x) => String(x).trim()).filter(Boolean)
            : [],
        };
      }),
    };
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
        headers: {
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      },
    );
  }
  log("info", "score_request_received", { requestId, ip });

  // Identify user and enforce free-tier limit for authenticated users.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const subscription = await getUserSubscription(user.id);
    const isPro = subscription?.plan === "pro" && subscription.status === "active";
    if (!isPro) {
      const used = await countMonthlySubmissions(user.id);
      if (used >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${FREE_MONTHLY_LIMIT} assessments/month). Upgrade to Pro for unlimited access.`,
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
  const testScore = parseOptionalTestScore(d.englishTest, d.testScore);
  const profile: VisaProfile = {
    nationality: d.nationality,
    targetRegion: d.targetRegion,
    age: Math.round(d.age),
    education: d.education,
    yearsExperience: Math.round(d.yearsExperience),
    fieldOfWork: d.fieldOfWork,
    englishTest: d.englishTest,
    testScore,
    savingsUsd: Math.round(d.savingsUsd),
    goal: d.goal,
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on server" },
      { status: 500 },
    );
  }

  const systemPrompt = buildSystemPrompt(profile);
  const userPrompt = buildUserPrompt(profile);
  const modelFallback = ["gpt-4o-mini", "gpt-4o-mini"];
  let text = "";
  let modelUsed = modelFallback[0];
  let lastErrorDetails = "";

  for (const model of modelFallback) {
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
                model,
                temperature: 0.25,
                max_tokens: 2400,
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "visa_pathways",
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: ["pathways"],
                      properties: {
                        pathways: {
                          type: "array",
                          minItems: 1,
                          items: {
                            type: "object",
                            additionalProperties: false,
                            required: [
                              "_thinking",
                              "name",
                              "country",
                              "score",
                              "reason",
                              "weaknesses",
                              "documents",
                              "next_steps",
                              "citations",
                              "estimated_timeline",
                              "top_improvement",
                              "score_drivers",
                            ],
                            properties: {
                              _thinking: { type: "string" },
                              name: { type: "string" },
                              country: { type: "string" },
                              score: { type: "number" },
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
                              score_drivers: { type: "array", items: { type: "string" } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
              }),
            });
            if (!openaiRes.ok) {
              const errText = await openaiRes.text();
              if (openaiRes.status === 429 || openaiRes.status >= 500) {
                throw new Error(errText);
              }
              lastErrorDetails = errText;
              throw new Error("NON_RETRYABLE");
            }
            return (await openaiRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
          } finally {
            clearTimeout(timer);
          }
        },
        { attempts: 2, baseDelayMs: 300 },
      );
      text = raw.choices?.[0]?.message?.content?.trim() ?? "";
      modelUsed = model;
      if (text) break;
    } catch (err) {
      if (String((err as Error)?.message ?? "") === "NON_RETRYABLE") {
        break;
      }
      lastErrorDetails = (err as Error)?.message ?? String(err);
    }
  }
  if (!text) {
    log("error", "score_request_model_failure", { requestId, ip, details: lastErrorDetails });
    return NextResponse.json(
      { error: "AI service temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const parsed = tryParseModelJson(text);

  if (!parsed) {
    log("warn", "score_response_invalid_json", { requestId, ip, modelUsed });
    return NextResponse.json(
      {
        error: "OpenAI returned invalid JSON",
        raw: text,
      },
      { status: 502 },
    );
  }

  // Strip internal reasoning field before returning to client.
  parsed.pathways.forEach((p) => { delete (p as Pathway & { _thinking?: string })._thinking; });

  const promptVersion = "visa-prompt-v4-rag";
  const sources = retrieveSources(profile.targetRegion, profile.goal, 3).map((s) => ({
    title: s.title,
    url: s.url,
  }));
  try {
    await persistSubmission({
      requestId,
      ip,
      userId: user?.id ?? null,
      promptVersion,
      model: modelUsed,
      profile,
      sources,
      result: parsed,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    log("warn", "score_persist_failed", {
      requestId,
      ip,
      promptVersion,
      modelUsed,
      details: err instanceof Error ? err.message : String(err),
    });
  }
  log("info", "score_request_completed", {
    requestId,
    ip,
    modelUsed,
    promptVersion,
    latencyMs: Date.now() - startedAt,
  });

  return NextResponse.json(parsed);
}
