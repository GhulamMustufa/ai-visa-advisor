# Scoring Methodology (Phase 3)

The AI Visa Advisor uses a strictly deterministic, explainable scoring engine. The LLM is **never** used to invent approval probabilities or make up scores. The LLM acts solely as a natural-language explainer for the mathematical output of the deterministic engine.

## Multi-Dimensional Architecture

A standard flat "points" score is insufficient for explaining complex immigration pathways. The engine breaks down readiness into distinct dimensions:

1. **Eligibility Fit**: Measures whether the applicant meets all `hard` requirements (e.g., age limits, language thresholds).
2. **Profile Strength**: Measures subjective or competitive points (e.g., holding a PhD vs. a Bachelor's).
3. **Evidence Quality**: Measures the authority and freshness of the retrieved evidence backing the analysis (injected during the retrieval phase).

## Hard Requirement Overrides

If a user fails a single `type: "hard"` requirement (e.g., they require an employer sponsor for the US H-1B, but do not have one), their status is immediately flagged as **`BLOCKED`**. 

Soft points cannot override hard blockers. The LLM is strictly instructed not to present high soft scores as "high likelihood of approval" if the pathway is `BLOCKED`.

## Marginal Improvement Engine ("What-If" Simulator)

To provide actionable advice, the system runs a deterministic What-If simulation:

1. **Identify Gaps**: It isolates all `missingRequirements` and `blockingRequirements`.
2. **Retrieve Metrics**: It pulls deterministic heuristics defined in the domain for that requirement (`cost`, `time`, `difficulty`, `certainty`).
3. **Calculate ROI**: It ranks actions using a Return on Investment (ROI) heuristic: 
   `ROI = (Impact * Certainty) / (Cost * Time * Difficulty)`
4. **Simulate Outcome**: It selects the top-ranked action, temporarily marks it as `met` in memory, and recalculates the `baseScore` and `eligibilityStatus`.
5. **Output**: The system surfaces the exact point delta (e.g. "+15 points") and status change (e.g. "BLOCKED → CONDITIONALLY_ELIGIBLE") to the LLM to explain to the user.

## Data Structure

Every requirement has explicit points and action heuristics attached.
```typescript
{
  id: "req-ca-exp",
  type: "hard",
  description: "Minimum 1 year of continuous skilled work experience.",
  pointsAwarded: 15,
  resolutionActionName: "Gain 1 Year Skilled Experience",
  actionMetrics: { cost: 1, time: 5, difficulty: 4, certainty: 5 }
}
```

This guarantees 100% transparency. If the user asks "Why did I get 68 points?", the API trace explicitly links every single point to a fulfilled requirement node.
