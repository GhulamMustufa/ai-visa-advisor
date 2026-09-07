import type { EvaluatedRequirement, MarginalAction } from "./types";

export function calculateMarginalImprovements(
  evaluatedReqs: EvaluatedRequirement[], 
  currentScore: number
): MarginalAction[] {
  const actions: MarginalAction[] = [];

  const unmetReqs = evaluatedReqs.filter(r => !r.met);

  for (const req of unmetReqs) {
    if (!req.resolutionActionName || !req.actionMetrics) {
      continue;
    }

    const { cost, time, difficulty, certainty } = req.actionMetrics;
    const impact = req.pointsAwarded;

    // We still want to list actions that don't give "points" but resolve a hard requirement
    // So we assign a pseudo-impact for resolving a blocking or conditional requirement.
    const effectiveImpact = impact === 0 && (req.type === 'hard' || req.type === 'conditional') ? 50 : impact;

    if (effectiveImpact > 0) {
      // Heuristic ROI formula: (Impact * Certainty) / (Cost * Time * Difficulty)
      // Multiply by 10 for more readable numbers
      const roiScore = (effectiveImpact * certainty) / (cost * time * difficulty) * 10;

      actions.push({
        actionName: req.resolutionActionName,
        pointImpact: impact,
        metrics: req.actionMetrics,
        roiScore,
        requirementId: req.id
      });
    }
  }

  // Sort by highest ROI first
  actions.sort((a, b) => b.roiScore - a.roiScore);

  return actions;
}
