import type { VisaProfile, ScoreResponse, RankedPathway, Evidence } from "./types";
import { normalizeProfile } from "./profile";
import { getPathwaysForRegion, PATHWAY_REGISTRY } from "./domain";
import { buildAIOrchestratorPrompt } from "./ai";
import { retrieveEvidence } from "./evidence";
import { detectConflicts } from "./validation";
import { TraceContext } from "./trace";
import { evaluateSynthesizerOutput } from "./critic";
import { log } from "./logger";
import { withRetry, RetryableError } from "./retry";
import { openAiCircuitBreaker } from "./circuit-breaker";

function safeJsonParse(input: string): { pathways: any[], summary: string } | null {
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function runVisaAssessment(profile: VisaProfile, requestId: string): Promise<{ response: ScoreResponse, trace: TraceContext, evidenceList: Evidence[] }> {
  const trace = new TraceContext(requestId);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  let finalResponse: ScoreResponse | null = null;
  let modelUsed = "gpt-4o-mini";
  
  try {
    const normalizedProfile = normalizeProfile(profile);
    const pathways = getPathwaysForRegion(profile.targetRegion);
    
    // Phase 1: Evidence Grounding (Retrieval)
    const evidenceList = await trace.runStep("retrieveEvidence", async () => {
      return await retrieveEvidence(profile, normalizedProfile, pathways[0]?.id, 10);
    });
    
    trace.recordRetrieval(evidenceList.map(e => e.source_id));
    detectConflicts(evidenceList); // Internal logging
    
    // Phase 2: AI Synthesizer (Single Pass, Strict JSON)
    const currentPrompt = buildAIOrchestratorPrompt(normalizedProfile, pathways, evidenceList);
    let parsedAIResponse: any = null;
    let approved = false;
    
    // Check Circuit Breaker before starting AI loop
    if (await openAiCircuitBreaker.isOpen()) {
      log("warn", "circuit_breaker_open_skipping_ai", { requestId });
    } else {
      const text = await trace.runStep(`synthesize_iteration`, async () => {
        return await withRetry(async () => {
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
                          "name", "country", "baseScore", "reason", "weaknesses", "documents", "next_steps", "citations", "estimated_timeline", "top_improvement", "eligibilityStatus", "source_freshness"
                        ], properties: {
                          name: { type: "string" }, country: { type: "string" }, baseScore: { type: "number" }, reason: { type: "string" }, weaknesses: { type: "array", items: { type: "string" } }, documents: { type: "array", items: { type: "string" } }, next_steps: { type: "array", items: { type: "string" } }, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } }, estimated_timeline: { type: "string" }, top_improvement: { type: "string" }, eligibilityStatus: { type: "string" }, source_freshness: { type: "string", enum: ["VERIFIED", "STALE", "UNKNOWN"] }
                        }
                      }
                    }
                  }
                }}},
                messages: [{ role: "user", content: currentPrompt }],
              }),
            });
            
            if (!openaiRes.ok) {
              if (openaiRes.status === 429) {
                const retryAfter = openaiRes.headers.get("Retry-After");
                const ms = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
                throw new RetryableError("Rate limited by OpenAI", ms);
              }
              throw new Error(await openaiRes.text());
            }
            const resJson = await openaiRes.json();
            trace.recordModelInfo(modelUsed, resJson.usage?.prompt_tokens || 0, resJson.usage?.completion_tokens || 0);
            await openAiCircuitBreaker.recordSuccess();
            return resJson.choices?.[0]?.message?.content?.trim() ?? "";
          } catch (err: any) {
            if (err.name !== "RetryableError" && err.name !== "AbortError") {
              await openAiCircuitBreaker.recordFailure();
            }
            throw err;
          } finally {
            clearTimeout(timer);
          }
        }, { attempts: 3, baseDelayMs: 1000 });
      });

      parsedAIResponse = safeJsonParse(text);
      if (parsedAIResponse) {
        approved = true;
      }
    }

    if (!approved) {
      log("warn", "agent_exhausted_retries", { requestId });
      parsedAIResponse = {
        summary: "Our AI assistant could not confidently verify the qualitative advice.",
        pathways: pathways.map(e => ({
          name: e.name, country: e.country, baseScore: 0, reason: "AI validation failed.",
          weaknesses: [], documents: [], next_steps: [], citations: [], estimated_timeline: "Unknown",
          top_improvement: "Review official guidelines.", eligibilityStatus: "UNKNOWN",
          source_freshness: "UNKNOWN"
        }))
      };
    }

    // Calculate baseline profile metrics so scoreBreakdown is never empty
    const eduScore = profile.education === "phd" ? 28 : profile.education === "master" ? 24 : profile.education === "bachelor" ? 16 : 8;
    const expScore = profile.yearsExperience >= 8 ? 24 : profile.yearsExperience >= 5 ? 20 : profile.yearsExperience >= 3 ? 15 : profile.yearsExperience >= 1 ? 8 : 0;
    const savingsScore = profile.savingsUsd >= 50000 ? 24 : profile.savingsUsd >= 25000 ? 18 : profile.savingsUsd >= 10000 ? 12 : profile.savingsUsd >= 5000 ? 6 : 0;
    const langScore = profile.englishTest !== "none" ? 20 : 0;
    
    const profileStrength = Math.min(100, Math.round(((eduScore + expScore) / 52) * 100));
    const competitiveness = Math.min(100, Math.round(((langScore + expScore + savingsScore) / 68) * 100));
    const baselineComposite = Math.min(100, Math.round(eduScore + expScore + savingsScore + langScore));

    const finalPathways: RankedPathway[] = parsedAIResponse.pathways.map((aiData: any) => {
      const domainData = pathways.find(p => p.name === aiData.name || p.id === aiData.name) || pathways[0];
      const effectiveBaseScore = typeof aiData.baseScore === "number" && aiData.baseScore > 0 
        ? aiData.baseScore 
        : baselineComposite;

      return {
        pathwayId: domainData?.id || "unknown",
        name: aiData.name,
        country: aiData.country,
        status: aiData.eligibilityStatus || (effectiveBaseScore >= 70 ? "ELIGIBLE" : effectiveBaseScore >= 45 ? "CONDITIONALLY_ELIGIBLE" : "BLOCKED"),
        baseScore: effectiveBaseScore,
        maxScore: 100,
        scoreBreakdown: { 
          eligibilityFit: effectiveBaseScore, 
          profileStrength, 
          evidenceQuality: 100, 
          competitiveness 
        },
        satisfiedRequirements: [],
        missingRequirements: [],
        blockingRequirements: [],
        marginalImprovements: [],
        reason: aiData.reason, 
        weaknesses: aiData.weaknesses, 
        documents: aiData.documents,
        next_steps: aiData.next_steps, 
        citations: aiData.citations, 
        estimated_timeline: aiData.estimated_timeline,
        top_improvement: aiData.top_improvement,
        source_freshness: aiData.source_freshness as any,
      };
    }).sort((a: RankedPathway, b: RankedPathway) => b.baseScore - a.baseScore);

    const overallScore = finalPathways.length > 0 
      ? Math.round(finalPathways.reduce((sum: number, e: RankedPathway) => sum + e.baseScore, 0) / finalPathways.length)
      : 0;

    finalResponse = {
      overall_score: overallScore,
      summary: parsedAIResponse.summary,
      pathways: finalPathways
    };

    trace.complete("success");
    return { response: finalResponse, trace, evidenceList };

  } catch (error) {
    trace.complete("error");
    throw error;
  }
}
