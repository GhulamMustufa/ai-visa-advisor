# Agentic Workflow & Orchestration Architecture (Phase 4)

This document outlines the architecture for the Borderless AI's agentic workflow and the rationale behind the technology choices.

## Objective
To wrap strict deterministic engines and AI synthesis into a bounded, highly observable pipeline, ensuring the final output is accurate, grounded, and free of hallucinations.

## Technology Decision: Plain TypeScript Orchestration

We evaluated LangGraph, OpenAI Agents SDK, and AutoGen. We chose **Plain TypeScript Orchestration** for the following reasons:

1. **Determinism over Autonomy**: In immigration law, autonomy is dangerous. We do not want an AI agent recursively searching the web or inventing rules. We want a strict Directed Acyclic Graph (DAG) pipeline.
2. **Observability**: Managing state in memory via TypeScript allows us to capture an exact `DecisionTrace` at every step, without relying on third-party opaque cloud state.
3. **Cost and Latency**: Complex agent frameworks introduce massive token overhead and latency. Our bounded pipeline is significantly faster and cheaper.

## The Bounded Workflow

The system is designed as a sequence of specialized, narrowly scoped components:

1. **Profile Normalizer (Deterministic)**: Cleans and canonicalizes raw user input.
2. **Pathway Discovery (Deterministic)**: Filters the domain registry for candidate pathways.
3. **Eligibility Analyst (Deterministic)**: Evaluates pathways against hard rules, returning explicit score breakdowns and status blockers.
4. **Evidence Analyst (Hybrid)**: Retrieves authoritative evidence via semantic search and performs conflict resolution based on Authority Tiers.
5. **Final Synthesizer (LLM Agent)**: Translates the deterministic math and retrieved evidence into a human-readable explanation.
6. **Critic / Validator (LLM Agent)**: Acts as a safeguard. Reviews the Synthesizer's output against the ground-truth deterministic output to catch hallucinations.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator as Bounded Orchestrator
    participant Engine as Deterministic Engines
    participant Synth as Synthesizer Agent
    participant Critic as Critic Agent

    User->>Orchestrator: Submit Profile
    
    rect rgb(30, 41, 59)
    note right of Orchestrator: Internal Decision Trace Started
    Orchestrator->>Engine: Normalize & Evaluate
    Engine-->>Orchestrator: Eligibility Scores & Status
    Orchestrator->>Engine: Retrieve & Resolve Evidence
    Engine-->>Orchestrator: Grounding Evidence
    end

    loop Max Iterations (2)
        Orchestrator->>Synth: Generate Explanation
        Synth-->>Orchestrator: Proposed Output
        
        Orchestrator->>Critic: Validate Output vs Deterministic Ground Truth
        Critic-->>Orchestrator: { approved: boolean, feedback: string[] }
        
        opt is approved
            break
        end
    end
    
    alt Output Rejected after retries
        Orchestrator-->>User: Safe Fallback Message
    else Output Approved
        Orchestrator-->>User: Verified Final Response
    end
```

## Failure Handling Strategy
- **Timeouts**: The orchestrator wraps LLM calls in a 25-second timeout using `AbortController`.
- **Validation**: If the Critic rejects the output (e.g., detects a hallucination like "78% chance of approval"), the Orchestrator retries the Synthesizer with the Critic's feedback appended.
- **Fallback**: If the maximum iterations (`MAX_ITERATIONS = 2`) are exhausted without approval, the Orchestrator intercepts the payload and returns a sanitized, deterministic fallback response to prevent legal liability from a hallucinated claim.
