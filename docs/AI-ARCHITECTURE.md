# AI Decision-Support Architecture

This document describes the Phase 1 architectural refactor of the Borderless AI.

## Core Principle
**The LLM is NOT the source of truth.** Immigration rules are strictly mathematical, logically deterministic, and legally codified. The architecture separates the exact calculation of eligibility from the nuanced explanation of that eligibility.

## Component Architecture

1. **Profile Normalization Layer (`lib/profile.ts`)**
   - Converts raw strings and implicit metrics into canonical, strongly typed representations (e.g., standardizing "full stack dev" to "Software Engineer" and "IELTS 7" to "CEFR C1").
2. **Domain Model (`lib/domain.ts`)**
   - Defines explicitly what a `Requirement` is (hard, conditional, points). It holds the baseline rules, minimum thresholds, and points matrices without muddying the AI prompt.
3. **Eligibility Engine (`lib/engine.ts`)**
   - Purely deterministic rules engine. It returns explicit statuses (`ELIGIBLE`, `NOT_ELIGIBLE`) and calculates an exact base score by evaluating the normalized profile against the domain requirements.
4. **Recommendation Engine (`lib/recommendation.ts`)**
   - Ranks and filters the deterministically evaluated pathways. Separates technical eligibility from practical recommendation.
5. **AI Reasoning Layer (`lib/ai.ts`)**
   - Orchestrates the LLM. It hands the LLM the pre-calculated, fixed eligibility scores and statuses. The LLM's only job is to synthesize this data, generate human-readable weaknesses, next steps, and determine a confidence score based on missing evidence.

## Data Flow & Trust Boundaries

```mermaid
flowchart TD
    subgraph Client
      A[Raw User Profile]
    end

    subgraph Deterministic Boundary
      B[Profile Normalizer]
      C[Domain Requirements]
      D[Eligibility Engine]
      E[Recommendation Engine]
    end

    subgraph AI Boundary
      F[Contextual Prompt Builder]
      G[LLM (gpt-4o-mini)]
    end

    subgraph Output
      H[Response Validator]
      I[Persisted JSON Payload]
    end

    A --> B
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

### Deterministic vs AI Responsibilities

| Responsibility | Handled By | Trust Level |
|----------------|------------|-------------|
| Calculating Points | Eligibility Engine (`lib/engine.ts`) | High (Deterministic) |
| Establishing Eligibility | Eligibility Engine (`lib/engine.ts`) | High (Deterministic) |
| Ranking Options | Recommendation Engine | High (Deterministic) |
| Explaining Weaknesses | LLM (`lib/ai.ts`) | Medium (Generative) |
| Suggesting Next Steps | LLM (`lib/ai.ts`) | Medium (Generative) |
| Evaluating Confidence | LLM (`lib/ai.ts`) | Medium (Generative) |

## Failure Modes

1. **LLM Hallucination of Scores**: 
   - *Mitigation*: The `baseScore` and `eligibilityStatus` are extracted *before* the AI is invoked, and mapped back to the AI's output in `app/api/score/route.ts`. If the AI hallucinates a score, it is ignored and overwritten by the deterministic truth.
2. **LLM Schema Failure**:
   - *Mitigation*: Fallback to standard HTTP 502 with structured error logging.

## Remaining Technical Debt (Phase 2 Focus)
- **True Semantic RAG**: `lib/rag.ts` still uses static keyword matching. It must be migrated to `pgvector` and embedded against official documents.
- **Evaluation Pipeline**: We need a testing matrix (`__tests__/evals`) to measure the LLM-as-a-judge against golden outputs.
- **Source Freshness Pipeline**: We need a mechanism to ingest and update the domain model requirements over time without manual code updates.
