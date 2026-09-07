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

export function evaluateRequirement(profile: NormalizedProfile, req: Requirement): EvaluatedRequirement {
  let met = false;
  let notes = "";

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
    case "req-ca-lang-c1":
      met = ["C1", "C2"].includes(profile.languageLevelCEFR);
      notes = met ? `Language level ${profile.languageLevelCEFR} awards advanced points` : "Language level below advanced";
      break;
    case "req-ca-funds":
      met = profile.original.savingsUsd >= 10000;
      notes = met ? "Sufficient funds declared" : "Insufficient settlement funds";
      break;
    case "req-ca-edu-bachelor":
    case "req-us-degree":
      met = ["bachelor", "master", "phd"].includes(profile.original.education);
      notes = met ? "Has degree" : "Missing required degree";
      break;
    case "req-ca-edu-master":
      met = ["master", "phd"].includes(profile.original.education);
      notes = met ? "Has advanced degree" : "Missing advanced degree";
      break;
    case "req-ca-age-optimal":
      met = profile.original.age >= 20 && profile.original.age <= 29;
      notes = met ? "In optimal age range" : "Outside optimal age range";
      break;
    case "req-ca-stem":
      met = profile.isSTEM || profile.isHealthcare;
      notes = met ? "Occupation is in STEM/Healthcare" : "Occupation not in priority list";
      break;
    case "req-uk-lang":
      met = ["B1", "B2", "C1", "C2"].includes(profile.languageLevelCEFR);
      notes = met ? "Meets B1 minimum" : "Language level below B1";
      break;
    case "req-ae-salary":
      // Using savingsUsd as a proxy for monthly salary for MVP simulator purposes
      met = profile.original.savingsUsd >= 8100;
      notes = met ? "Salary requirement met" : "Salary below 30,000 AED threshold";
      break;
    case "req-es-income":
      // Proxy for EUR 2500/month
      met = profile.original.savingsUsd >= 2600;
      notes = met ? "Income requirement met" : "Income below 200% Spanish minimum wage";
      break;
    case "req-my-income":
      met = profile.original.savingsUsd >= 2000;
      notes = met ? "Income requirement met" : "Income below threshold";
      break;
    case "req-th-funds":
      met = profile.original.savingsUsd >= 14000;
      notes = met ? "Sufficient funds" : "Insufficient funds";
      break;
    case "req-jp-points":
      // Mock points calculation
      met = profile.original.yearsExperience >= 5 && (profile.original.education === "master" || profile.original.education === "phd");
      notes = met ? "Likely meets 70 points" : "Insufficient points based on experience/education";
      break;
    case "req-de-degree":
      met = ["bachelor", "master", "phd"].includes(profile.original.education);
      notes = met ? "Has recognized degree" : "Missing degree";
      break;
    default:
      // Hard things like sponsorships, job offers, or lotteries default to false unless explicitly mocked
      met = false;
      notes = "Requires external validation or action (e.g., job offer, assessment)";
      break;
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
