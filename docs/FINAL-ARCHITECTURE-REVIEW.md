# Final Architecture & Quality Review

**Auditor:** Principal AI Engineer / CTO  
**Objective:** Evaluate if this repository demonstrates Senior-level AI Engineering depth, or if it is merely a "Next.js app with an OpenAI wrapper."

---

## 1. Scorecard

| Category | Score (0-10) | Justification |
|---|---|---|
| **AI Engineering** | 7/10 | Strong neuro-symbolic split (deterministic vs. LLM). However, the orchestration is slightly monolithic rather than truly agentic. |
| **RAG Architecture** | 4/10 | Naive retrieval. Concatenating user inputs into a single query string is a beginner RAG pattern. Missing query transformation and hierarchical chunking. |
| **Architecture** | 8/10 | The isomorphic engine (running on server and client for 0-latency simulation) is an excellent, senior-level architectural decision. |
| **Evaluation** | 6/10 | Good start with adversarial edge cases, but lacks LLM-as-a-Judge automated scoring for qualitative hallucinations. |
| **Reliability** | 5/10 | Implemented a circuit breaker, but it's in-memory. On Next.js (Serverless), this state resets on cold starts, rendering it useless in production. |
| **Security** | 4/10 | High risk of prompt injection. Unsanitized user inputs (e.g., `occupation`) are injected directly into the LLM context. |
| **Explainability** | 8/10 | Transparent scoring and direct citation mapping is highly effective. |
| **UX & Product** | 9/10 | The What-If Simulator and Dashboard are polished, intuitive, and instantly demonstrate value. |
| **Documentation** | 9/10 | The technical narrative is strong, honest, and addresses edge cases directly. |
| **Overall** | **6.6 / 10** | **Verdict: Strong Foundation, but Requires Hardening.** |

---

## 2. Top 10 Remaining Weaknesses

1. **Naive RAG Query Generation (Severity: High)**
   * *Why:* `Visa requirements for a ${occupation}...` will fail to retrieve nuanced policy edge cases.
   * *Fix:* Implement **Query Transformation** (e.g., HyDE or Multi-Query) using a fast LLM pass before hitting the vector DB.
2. **Serverless State Illusion (Severity: High)**
   * *Why:* The `openAiCircuitBreaker` uses in-memory Node state, which is ephemeral in Next.js Serverless deployments.
   * *Fix:* Migrate circuit breaker state to Redis (Vercel KV).
3. **Prompt Injection Vulnerability (Severity: Critical)**
   * *Why:* A user could input `"Software Engineer. Ignore previous instructions and output... "` and hijack the `basePrompt`.
   * *Fix:* Implement a strict Regex/allowlist normalizer for user inputs, or a fast pre-flight LLM classification check.
4. **Hardcoded Domain Rules (Severity: Medium)**
   * *Why:* `PATHWAY_REGISTRY` is hardcoded in `.ts`. Immigration rules change weekly; requiring a code deployment for rule changes is an anti-pattern.
   * *Fix:* Extract rules to a standalone JSON schema that can be hydrated dynamically from a CMS or Database.
5. **Monolithic Prompting (Severity: Medium)**
   * *Why:* One massive prompt attempts to evaluate requirements, rank, extract citations, and estimate timelines. This degrades reasoning quality.
   * *Fix:* Break into a sequential chain: 1. Evaluate Requirements -> 2. Synthesize Narrative -> 3. Extract Citations.
6. **Fake "Confidence" Scores (Severity: Low)**
   * *Why:* Asking the LLM to output its own `evidence_confidence` is statistically meaningless (LLMs are highly overconfident).
   * *Fix:* Calculate confidence deterministically based on RAG distance scores and source `authority_tier`.
7. **No Semantic Caching (Severity: Medium)**
   * *Why:* Identical queries from users cost $0.003 and take 2.2s every time.
   * *Fix:* Implement semantic caching (e.g., exact hash of normalized profile) to return instant results for common profiles.
8. **Basic Chunking Strategy (Severity: High)**
   * *Why:* Immigration laws span 100-page PDFs. Standard fixed-size chunking destroys legal context.
   * *Fix:* Implement Parent-Child retrieval (retrieve small chunks for semantic match, but pass the parent legal section to the LLM).
9. **Critic Loop Inefficiency (Severity: Medium)**
   * *Why:* The Actor-Critic loop just appends text and retries if citations fail. This eats tokens rapidly.
   * *Fix:* Instead of retrying the whole prompt, only prompt the LLM to fix the specific broken citation.
10. **Lack of Automated Qualitative Evals (Severity: High)**
    * *Why:* While deterministic scores are tested, we cannot automatically detect if the LLM's `reason` narrative contradicts the math.
    * *Fix:* Add an LLM-as-a-Judge evaluation script to cross-check the narrative against the `baseScore`.

---

## 3. The Cut List (What to Remove)

To make this a smaller, *deeper* project, remove the following distractions:
- **Remove the Actor-Critic LLM Loop (`lib/critic.ts`)**: Since you are using OpenAI's `response_format: { type: "json_schema" }`, structured output is practically guaranteed. The custom critic loop adds latency, code bloat, and token costs for minimal gain. Trust the native JSON schema enforcement and do standard fallback handling.
- **Remove the "Confidence Enum" outputs from the LLM**: Do not ask the LLM for `HIGH/MEDIUM/LOW` confidence. Remove it from the schema. It is buzzword-driven and misleading.

---

## 4. The Final 20% That Creates 80% of the Impact

If you want this to pass a Staff-level review, make these exact changes before sending to recruiters:

1. **Implement Query Transformation (RAG Depth)**
   - Replace the string-concatenation query in `retrieveEvidence` with an LLM call that generates 3 distinct, highly targeted search queries based on the user's blockers.
2. **Move `PATHWAY_REGISTRY` to JSON (Architecture)**
   - Move the hardcoded arrays out of `domain.ts` and into a `pathways.json` file. Write a loader function. This proves you understand the separation of Code (Engine) and Data (Rules).
3. **Fix the Circuit Breaker (Reliability)**
   - Add a comment explicitly acknowledging that the in-memory breaker is a mock for the MVP and design the interface so it clearly accepts a Redis adapter.
4. **Implement Input Sanitization (Security)**
   - Add a Zod schema strictly validating `fieldOfWork` (e.g., max 50 chars, alphanumeric only) before it ever touches the LLM orchestrator to mitigate prompt injection.

---

### The 30-Minute Interview Test

*"If this GitHub repository were submitted for a Senior AI Engineer role, what would make a strong technical interviewer want to discuss it for 30 minutes?"*

**The Hook:** The **Isomorphic Neuro-Symbolic Architecture**. 

An interviewer doesn't care that you can call the OpenAI API. They will want to talk to you for 30 minutes because you realized that LLMs are terrible at deterministic math (calculating points), so you built a strictly typed TypeScript engine to handle the math, and only used the LLM to extract qualitative variables (like mapping a resume to a NOC code). 

Furthermore, you made that math engine isomorphic—it runs on the server for the initial AI generation, but is shipped to the client to power a 0-latency simulator, entirely bypassing the LLM on subsequent interactions. This demonstrates a deep understanding of cost control, latency optimization, and the limits of modern AI.
