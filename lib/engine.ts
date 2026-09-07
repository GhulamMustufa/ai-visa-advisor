import type { 
  NormalizedProfile, 
  Requirement, 
  EvaluatedRequirement, 
  DeterministicEvaluation, 
  EligibilityStatus 
} from "./types";
import type { PathwayDomain } from "./domain";

function evaluateRequirement(profile: NormalizedProfile, req: Requirement): EvaluatedRequirement {
  let met = false;
  let notes = "";

  // A real implementation would parse the requirement ID or type and map it to specific deterministic checks.
  // We mock a few critical ones for demonstration of the architecture.
  switch (req.id) {
    case "req-ca-exp":
      met = profile.original.yearsExperience >= 1;
      notes = met ? "Has >= 1 year experience" : "Less than 1 year experience";
      break;
    case "req-ca-lang":
    case "req-au-lang":
      met = ["B2", "C1", "C2"].includes(profile.languageLevelCEFR);
      notes = met ? `Language level ${profile.languageLevelCEFR} meets threshold` : "Language level insufficient";
      break;
    case "req-ca-funds":
      met = profile.original.savingsUsd >= 10000;
      notes = met ? "Sufficient funds declared" : "Insufficient settlement funds";
      break;
    case "req-uk-lang":
      met = ["B1", "B2", "C1", "C2"].includes(profile.languageLevelCEFR);
      notes = met ? "Meets B1 minimum" : "Language level below B1";
      break;
    case "req-au-age":
      met = profile.original.age < 45;
      notes = met ? "Under 45 years old" : "Over age limit";
      break;
    case "req-us-degree":
      met = ["bachelor", "master", "phd"].includes(profile.original.education);
      notes = met ? "Has degree" : "Missing required degree";
      break;
    default:
      // For conditions we can't deterministically evaluate from the basic profile (e.g., job offer),
      // we assume they are missing/conditional.
      met = false;
      notes = "Requires external validation (e.g., job offer, assessment)";
      break;
  }

  return { ...req, met, notes };
}

function calculateBaseScore(profile: NormalizedProfile, pathway: PathwayDomain): number {
  let score = 0;
  
  // Basic deterministic point scoring (re-implemented cleanly from legacy lib/score.ts concepts)
  if (profile.original.education === "phd") score += 25;
  else if (profile.original.education === "master") score += 20;
  else if (profile.original.education === "bachelor") score += 15;
  
  if (profile.original.yearsExperience >= 5) score += 15;
  else if (profile.original.yearsExperience >= 3) score += 10;
  
  if (["C1", "C2"].includes(profile.languageLevelCEFR)) score += 24;
  else if (profile.languageLevelCEFR === "B2") score += 16;
  else if (profile.languageLevelCEFR === "B1") score += 8;

  if (profile.original.age >= 20 && profile.original.age <= 29) score += 12;
  else if (profile.original.age >= 30 && profile.original.age <= 39) score += 8;

  if (profile.isSTEM || profile.isHealthcare) score += 10;

  return score;
}

export function evaluateEligibility(profile: NormalizedProfile, pathway: PathwayDomain): DeterministicEvaluation {
  const evaluatedReqs = pathway.requirements.map(req => evaluateRequirement(profile, req));
  
  const satisfiedRequirements = evaluatedReqs.filter(r => r.met);
  const missingRequirements = evaluatedReqs.filter(r => !r.met && r.type !== "hard");
  const blockingRequirements = evaluatedReqs.filter(r => !r.met && r.type === "hard");

  let status: EligibilityStatus = "ELIGIBLE";
  
  if (blockingRequirements.length > 0) {
    status = "NOT_ELIGIBLE";
  } else if (missingRequirements.length > 0) {
    status = "CONDITIONAL";
  }

  const baseScore = calculateBaseScore(profile, pathway);
  const maxScore = 100; // Normalized scale for comparison

  // If there's a strict threshold (like AU 65 points), adjust status
  if (pathway.baseScoreThreshold && baseScore < pathway.baseScoreThreshold && status === "ELIGIBLE") {
    status = "NOT_ELIGIBLE";
  }

  return {
    pathwayId: pathway.id,
    status,
    baseScore,
    maxScore,
    satisfiedRequirements,
    missingRequirements,
    blockingRequirements
  };
}
