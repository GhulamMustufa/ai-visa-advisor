import type { NormalizedProfile, RankedPathway, Evidence, DeterministicEvaluation } from "./types";
import { PATHWAY_REGISTRY } from "./domain";

export function buildAIOrchestratorPrompt(
  profile: NormalizedProfile, 
  topEvaluations: DeterministicEvaluation[],
  evidenceList: Evidence[]
): string {
  
  // Hydrate evaluations with full domain info for the prompt context
  const contextPathways = topEvaluations.map(evalData => {
    const domainData = PATHWAY_REGISTRY.find(p => p.id === evalData.pathwayId);
    return {
      name: domainData?.name || evalData.pathwayId,
      country: domainData?.country || "Unknown",
      eligibilityStatus: evalData.status,
      baseScore: evalData.baseScore,
      scoreBreakdown: evalData.scoreBreakdown,
      satisfiedRequirements: evalData.satisfiedRequirements.map(r => ({ desc: r.description, points: r.scoreImpact })),
      missingRequirements: evalData.missingRequirements.map(r => r.description),
      blockingRequirements: evalData.blockingRequirements.map(r => r.description),
      topWhatIfScenario: evalData.topWhatIfScenario
    };
  });

  const structuredEvidence = evidenceList.map(e => ({
    authority_tier: e.authority_tier,
    country: e.country,
    pathway: e.pathway,
    claim_type: e.claim_type,
    content: e.content,
    source_url: e.source_url,
    source_title: e.source_title
  }));

  return `You are a senior immigration case analyst. Your task is to EXPLAIN the deterministic scores and 'What-If' simulations provided to you.
  
CRITICAL INSTRUCTIONS ON EXPLAINABILITY AND TONE:
1. DO NOT INVENT SCORES OR STATUSES. You must strictly use the deterministic metrics provided below.
2. DO NOT use misleading probabilistic phrasing like "You have a 78% chance of approval."
3. DO use objective Fit/Readiness framing like: "Your profile strongly fits this pathway (Profile Strength: 85%), but lack of sponsorship currently blocks eligibility."
4. If a pathway is BLOCKED, explicitly state that hard requirements override soft scores.
5. Explain EXACTLY where points come from (e.g. "+15 points for Master's degree").
6. Highlight the 'What-If' scenarios provided deterministically (e.g. "If you complete action X, your score will increase by Y and status will become Z").

Applicant Profile:
${JSON.stringify({
  nationality: profile.original.nationality,
  age: profile.original.age,
  education: profile.original.education,
  yearsExperience: profile.original.yearsExperience,
  canonicalOccupation: profile.canonicalOccupation,
  languageLevelCEFR: profile.languageLevelCEFR,
  savingsUsd: profile.original.savingsUsd
}, null, 2)}

Deterministic Context Pathways (EXPLAIN THESE EXACTLY):
${JSON.stringify(contextPathways, null, 2)}

Official Grounding Evidence (USE THIS TO BACK UP CLAIMS):
${JSON.stringify(structuredEvidence, null, 2)}

OUTPUT REQUIREMENTS:
1. Return exactly the top pathways provided in the context, using their exact name and country.
2. For each pathway, write a "reason" (max 400 chars) explaining WHY they got this status and score based on the point breakdown, hard requirements, and evidence.
3. Extract specific "weaknesses" from the missing/blocking requirements.
4. Provide concrete "next_steps".
5. Estimate a realistic timeline based on the sources.
6. Under "top_improvement", output the exact action from the deterministic \`topWhatIfScenario\` and describe its numeric impact (e.g., "Secure sponsorship to change status from BLOCKED to ELIGIBLE").
7. ONLY cite URLs explicitly provided in the Official Grounding Evidence. Do not hallucinate citations.
8. Output valid JSON matching the requested schema.`;
}
