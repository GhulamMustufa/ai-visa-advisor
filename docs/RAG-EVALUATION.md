# Evidence Grounding & RAG Evaluation Methodology

This document outlines the methodology used to measure and evaluate the Evidence Grounding and Retrieval-Augmented Generation (RAG) system in Phase 2 of the AI Visa Advisor.

## Objective
The objective of this evaluation is to prove that the system retrieves authoritative, accurate, and relevant immigration evidence to back up its deterministic evaluations, and gracefully handles conflicts and missing data.

## Metrics Assessed
We measure the retrieval pipeline mathematically before it even reaches the LLM to prevent GIGO (Garbage In, Garbage Out).

1. **Retrieval Precision**: The percentage of retrieved evidence chunks that are genuinely relevant and authoritative for the user's query. (Prevents hallucinations caused by too much irrelevant context).
2. **Retrieval Recall**: The percentage of necessary, ground-truth evidence chunks that were successfully retrieved by the system. (Prevents missing critical requirements).
3. **Citation Accuracy**: (Measured post-generation) Evaluates whether the LLM hallucinated any URLs or source titles that were not provided in the prompt context.

## Dataset Design (`__tests__/evals/rag-dataset.json`)
We evaluate the system against a suite of specialized scenarios:
- **Correct Retrieval**: Testing baseline semantic match.
- **Irrelevant Retrieval Robustness**: Testing if the system can return `0` sources when a user asks about a requirement that doesn't exist (e.g., job offer for a visa that doesn't require one).
- **Stale/Conflicting Handling**: Testing if the system correctly resolves a conflict (e.g., Tier 1 says $10,000, Tier 4 says $12,000) by dropping the Tier 4 claim from the context window *before* the LLM sees it.

## Execution
To run the evaluation script:
```bash
npx tsx __tests__/evals/run-rag-eval.ts
```

The script will query the `pgvector` database via the `retrieveEvidence` pipeline and output a detailed breakdown of Precision and Recall across the dataset.
