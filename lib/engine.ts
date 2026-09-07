import type { 
  NormalizedProfile, 
  Requirement, 
  EvaluatedRequirement, 
  DeterministicEvaluation, 
  EligibilityStatus,
  ScoreBreakdown,
  WhatIfScenario,
  MarginalAction
} from "./types";
import type { PathwayDomain } from "./domain";
// We'll import calculateMarginalImprovements from lib/marginal.ts after we create it
import { calculateMarginalImprovements } from "./marginal";

import type { Condition } from "./types";

// Helper function to resolve dot notation paths (e.g., "original.age")
function resolveField(obj: any, path: string): any {
  return path.split('.').reduce((o, p) => o && o[p], obj);
}

function evaluateCondition(profile: NormalizedProfile, condition: Condition): boolean {
  if (condition.operator === "and") {
    return condition.conditions.every(c => evaluateCondition(profile, c));
  }
  if (condition.operator === "or") {
    return condition.conditions.some(c => evaluateCondition(profile, c));
  }

  // At this point, TS needs help knowing it's a field-based condition
  const fieldCondition = condition as { operator: string; field: string; value: any };
  const profileValue = resolveField(profile, fieldCondition.field);

  switch (fieldCondition.operator) {
    case ">=":
      return profileValue >= fieldCondition.value;
    case "<=":
      return profileValue <= fieldCondition.value;
    case "===":
      return profileValue === fieldCondition.value;
    case "<":
      return profileValue < fieldCondition.value;
    case ">":
      return profileValue > fieldCondition.value;
    case "in":
      return Array.isArray(fieldCondition.value) && fieldCondition.value.includes(profileValue);
    default:
      return false;
  }
}

export function evaluateRequirement(profile: NormalizedProfile, req: Requirement): EvaluatedRequirement {
  let met = false;
  let notes = "";

  if (req.condition) {
    met = evaluateCondition(profile, req.condition);
    notes = met ? "Requirement condition met" : "Requirement condition failed";
  } else {
    // If no condition is provided, default to false (requires AI review)
    met = false;
    notes = "REQUIRES_AI_REVIEW";
  }

  return { 
    ...req, 
    met, 
    notes, 
    scoreImpact: met ? req.pointsAwarded : 0 
  };
}

export function evaluateEligibility(profile: NormalizedProfile, pathway: PathwayDomain): DeterministicEvaluation {
  const evaluatedReqs = pathway.requirements.map(req => evaluateRequirement(profile, req));
  
  const satisfiedRequirements = evaluatedReqs.filter(r => r.met);
  const missingRequirements = evaluatedReqs.filter(r => !r.met && r.type !== "hard");
  const blockingRequirements = evaluatedReqs.filter(r => !r.met && r.type === "hard");

  let status: EligibilityStatus = "ELIGIBLE";
  
  if (blockingRequirements.length > 0) {
    status = "BLOCKED"; // HARD OVERRIDE
  } else if (missingRequirements.length > 0) {
    status = "CONDITIONALLY_ELIGIBLE";
  }

  // Calculate base score simply by summing up the points awarded by satisfied requirements
  const baseScore = satisfiedRequirements.reduce((sum, req) => sum + req.scoreImpact, 0);
  const maxScore = pathway.requirements.reduce((sum, req) => sum + req.pointsAwarded, 0);

  // If there's a strict threshold (e.g. Express Entry 67), enforce it
  if (pathway.baseScoreThreshold && baseScore < pathway.baseScoreThreshold && status !== "BLOCKED") {
    status = "INSUFFICIENT_EVIDENCE"; 
  }

  // Breakdown for explainability
  const eligibilityPoints = satisfiedRequirements.filter(r => r.type === 'hard').reduce((sum, req) => sum + req.scoreImpact, 0);
  const maxEligibilityPoints = pathway.requirements.filter(r => r.type === 'hard').reduce((sum, req) => sum + req.pointsAwarded, 0);
  
  const profilePoints = satisfiedRequirements.filter(r => r.type === 'points').reduce((sum, req) => sum + req.scoreImpact, 0);
  const maxProfilePoints = pathway.requirements.filter(r => r.type === 'points').reduce((sum, req) => sum + req.pointsAwarded, 0);

  const scoreBreakdown: ScoreBreakdown = {
    eligibilityFit: maxEligibilityPoints > 0 ? (eligibilityPoints / maxEligibilityPoints) * 100 : 100,
    profileStrength: maxProfilePoints > 0 ? (profilePoints / maxProfilePoints) * 100 : 100,
    evidenceQuality: 0, // Injected later by API route after retrieval
    competitiveness: maxScore > 0 ? (baseScore / maxScore) * 100 : 100
  };

  const marginalImprovements = calculateMarginalImprovements(evaluatedReqs, baseScore);
  const topWhatIfScenario = marginalImprovements.length > 0 ? {
    targetAction: marginalImprovements[0],
    newEligibilityStatus: blockingRequirements.length === 1 && blockingRequirements[0].id === marginalImprovements[0].requirementId ? "CONDITIONALLY_ELIGIBLE" : status,
    newBaseScore: baseScore + marginalImprovements[0].pointImpact
  } : undefined;

  return {
    pathwayId: pathway.id,
    status,
    baseScore,
    maxScore,
    scoreBreakdown,
    satisfiedRequirements,
    missingRequirements,
    blockingRequirements,
    marginalImprovements,
    topWhatIfScenario
  };
}
