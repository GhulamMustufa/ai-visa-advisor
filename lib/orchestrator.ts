import type { VisaProfile, ScoreResponse, RankedPathway, Evidence } from "./types";
import { normalizeProfile } from "./profile";
import { getPathwaysForRegion, PATHWAY_REGISTRY } from "./domain";
import { evaluateEligibility } from "./engine";
import { rankPathways } from "./recommendation";
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
      return await retrieveEvidence(profile, normalizedProfile, topEvaluations[0]?.pathwayId, 10);
    });
    
    trace.recordRetrieval(evidenceList.map(e => e.source_id));
    detectConflicts(evidenceList); // Internal logging
    
    // Phase 4: AI Synthesizer (Single Pass, Strict JSON)
    const currentPrompt = buildAIOrchestratorPrompt(normalizedProfile, topEvaluations, evidenceList);
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
                          "name", "country", "reason", "weaknesses", "documents", "next_steps", "citations", "estimated_timeline", "top_improvement", "eligibilityStatus", "source_freshness"
                        ], properties: {
                          name: { type: "string" }, country: { type: "string" }, reason: { type: "string" }, weaknesses: { type: "array", items: { type: "string" } }, documents: { type: "array", items: { type: "string" } }, next_steps: { type: "array", items: { type: "string" } }, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } }, estimated_timeline: { type: "string" }, top_improvement: { type: "string" }, eligibilityStatus: { type: "string" }, source_freshness: { type: "string", enum: ["VERIFIED", "STALE", "UNKNOWN"] }
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
        summary: "Your profile has been deterministically evaluated, but our AI assistant could not confidently verify the qualitative advice. Please refer to the raw metrics.",
        pathways: topEvaluations.map(e => ({
          name: e.pathwayId, country: "Unknown", reason: "AI validation failed. Hard requirements apply.",
          weaknesses: [], documents: [], next_steps: [], citations: [], estimated_timeline: "Unknown",
          top_improvement: "Review deterministic requirements.", eligibilityStatus: e.status,
          source_freshness: "UNKNOWN"
        }))
      };
    }

    const finalPathways: RankedPathway[] = topEvaluations.map(evalData => {
      const aiData = parsedAIResponse.pathways.find((p: any) => p.name.includes(evalData.pathwayId) || p.name === evalData.pathwayId) || parsedAIResponse.pathways[0];
      const domainData = PATHWAY_REGISTRY.find(p => p.id === evalData.pathwayId);
      return {
        ...evalData,
        name: domainData?.name || aiData.name,
        country: domainData?.country || aiData.country,
        status: evalData.status,
        reason: aiData.reason, weaknesses: aiData.weaknesses, documents: aiData.documents,
        next_steps: aiData.next_steps, citations: aiData.citations, estimated_timeline: aiData.estimated_timeline,
        top_improvement: aiData.top_improvement,
        source_freshness: aiData.source_freshness as any,
      };
    });

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
