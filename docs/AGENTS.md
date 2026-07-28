# AI Model & Agent Context: AI Visa Advisor

The core value of the application is its deterministic, highly-constrained AI scoring engine. It does not use LangChain or heavy agent frameworks; instead, it relies on strict prompt engineering and OpenAI's Structured Outputs (JSON Schema).

## The Model
- **Model**: `gpt-4o-mini`
- **Temperature**: `0.25` (Low variance to ensure consistent scoring)
- **Max Tokens**: 2400

## Prompt Engineering Architecture

### 1. Dynamic System Prompt
The system prompt establishes a persona of a "brutally honest, conservative, and practical" senior immigration analyst. It strictly forbids hallucinating visa routes or giving overly optimistic advice.

### 2. Context Injection (RAG)
Instead of semantic vector search, the app uses deterministic Retrieval-Augmented Generation (`lib/rag.ts`). 
- 17 official government sources are hardcoded.
- Based on the user's `targetRegion` and `goal` (e.g., Canada + PR), `retrieveSources(region, goal)` pulls the top 3 relevant sources.
- These sources contain *actual scoring criteria* (e.g., "CRS thresholds: 470+", "IELTS: 6.0 minimum").

### 3. Profile Variation Mode (`deriveVariantMode`)
The system analyzes the user's input before hitting the LLM and calculates a "weakness score" (e.g., low savings, no English test, low experience). 
- 0 weaknesses: `balanced`
- 1-2 weaknesses: `strict`
- 3+ weaknesses: `very_strict`
This mode is injected into the prompt as an explicit hint to force the LLM to cap probability scores for weak profiles.

### 4. Chain-of-Thought via `_thinking` (CRITICAL)
The most important architectural feature of the AI integration.
- The JSON Schema requested from OpenAI mandates a `_thinking` string field as the very first property in the `pathway` array.
- The prompt instructs the model to use `_thinking` to "identify the 2-3 strongest and weakest aspects... and estimate a realistic score range before committing."
- **Why this matters**: LLMs reason better when they generate tokens. By forcing it to output its reasoning *before* outputting the `score` integer, the score accuracy drastically improves.
- **Security/UX**: The `_thinking` field is explicitly deleted by the server (`delete p._thinking;`) before the JSON is returned to the frontend. The user never sees the internal reasoning.

## Fallback Parsing
Even with structured JSON schema, the app uses a `tryParseModelJson` utility that handles markdown code fences (` ```json `) in case the model wraps the output unnecessarily.
