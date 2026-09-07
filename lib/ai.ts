import type { NormalizedProfile, RankedPathway, Evidence } from "./types";
import type { RankedEvaluation } from "./recommendation";
import { PATHWAY_REGISTRY } from "./domain";

export function buildAIOrchestratorPrompt(
  profile: NormalizedProfile, 
  topEvaluations: RankedEvaluation[],
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
      satisfiedRequirements: evalData.satisfiedRequirements.map(r => r.description),
      missingRequirements: evalData.missingRequirements.map(r => r.description),
      blockingRequirements: evalData.blockingRequirements.map(r => r.description),
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

  return `You are a senior immigration case analyst. Your task is to explain and synthesize the deterministic eligibility results provided to you.
  
DO NOT INVENT SCORES. DO NOT INVENT ELIGIBILITY STATUS. 
You must strictly use the \`eligibilityStatus\` and \`baseScore\` provided in the Context Pathways below.

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

Deterministic Context Pathways (USE THESE EXACTLY):
${JSON.stringify(contextPathways, null, 2)}

Official Grounding Evidence (USE THIS TO BACK UP CLAIMS):
${JSON.stringify(structuredEvidence, null, 2)}

INSTRUCTIONS:
1. Return exactly the top pathways provided in the context, using their exact name, country, and baseScore.
2. For each pathway, write a "reason" (max 400 chars) explaining WHY they got this status and score based on the satisfied/missing requirements and grounding evidence.
3. Extract specific "weaknesses" from the missing or blocking requirements.
4. List specific "documents" they will need based on the pathway.
5. Provide concrete "next_steps".
6. Estimate a realistic timeline based on the sources.
7. Identify the "top_improvement" (e.g. "Take IELTS to reach C1" or "Secure a job offer").
8. Assign confidence scores (HIGH/MEDIUM/LOW) for eligibility, recommendation, and evidence.
9. ONLY cite URLs that are explicitly provided in the Official Grounding Evidence. Do not hallucinate citations.
10. Output valid JSON matching the requested schema.`;
}
