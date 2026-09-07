import type { DeterministicEvaluation, EligibilityStatus } from "./types";

export type RankedEvaluation = DeterministicEvaluation & {
  rankScore: number;
};

function getStatusMultiplier(status: EligibilityStatus): number {
  switch (status) {
    case "ELIGIBLE": return 1.0;
    case "LIKELY_ELIGIBLE": return 0.9;
    case "CONDITIONAL": return 0.7;
    case "INSUFFICIENT_EVIDENCE": return 0.4;
    case "NOT_ELIGIBLE": return 0.1; // Still ranks but very low
  }
}

export function rankPathways(evaluations: DeterministicEvaluation[]): RankedEvaluation[] {
  const ranked = evaluations.map(evaluation => {
    // Rank score is a combination of the base point score and the eligibility status multiplier.
    // In a real system, this would also factor in processing times, financial burden, and success rates.
    const multiplier = getStatusMultiplier(evaluation.status);
    const rankScore = evaluation.baseScore * multiplier;
    
    return {
      ...evaluation,
      rankScore
    };
  });

  // Sort descending by rank score
  return ranked.sort((a, b) => b.rankScore - a.rankScore);
}
