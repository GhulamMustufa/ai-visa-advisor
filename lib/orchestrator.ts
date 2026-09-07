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
      const queryText = `Visa requirements for a ${normalizedProfile.canonicalOccupation} seeking ${profile.goal} in ${profile.targetRegion}. Age: ${profile.age}. English Level: ${normalizedProfile.languageLevelCEFR}.`;
      return await retrieveEvidence(queryText, profile.targetRegion, topEvaluations[0]?.pathwayId, 10);
    });
    
    trace.recordRetrieval(evidenceList.map(e => e.source_id));
    detectConflicts(evidenceList); // Internal logging
    
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
          trace.recordModelInfo(modelUsed, resJson.usage?.prompt_tokens || 0, resJson.usage?.completion_tokens || 0);
          return resJson.choices?.[0]?.message?.content?.trim() ?? "";
        } finally {
          clearTimeout(timer);
        }
      });

      parsedAIResponse = safeJsonParse(text);
      if (!parsedAIResponse) throw new Error("OpenAI returned invalid JSON");

      const criticResult = await trace.runStep(`critic_evaluation_${iteration}`, async () => {
        return await evaluateSynthesizerOutput(apiKey, text, topEvaluations, evidenceList);
      });

      if (criticResult.approved) {
        approved = true;
      } else {
        trace.recordRetry(criticResult);
        currentPrompt = basePrompt + `\n\nCRITIC FEEDBACK FROM PREVIOUS ATTEMPT (FIX THESE):\n- ${criticResult.feedback.join("\n- ")}`;
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
          eligibility_confidence: "LOW", recommendation_confidence: "LOW", evidence_confidence: "LOW", source_freshness: "UNKNOWN"
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
    return { response: finalResponse, trace, evidenceList };

  } catch (error) {
    trace.complete("error");
    throw error;
  }
}
