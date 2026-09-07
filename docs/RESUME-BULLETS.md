# Resume Bullets

These bullets are designed to emphasize the engineering impact, architectural complexity, and AI orchestration aspects of the AI Visa Advisor system. 

---

### AI Engineer Version
*Emphasizes LLM orchestration, evaluation, retrieval architectures, and deterministic alignment.*

- **Architected a Hybrid Neuro-Symbolic AI System**: Designed a decision-support engine evaluating complex immigration pathways by fusing LLM reasoning (Gemini 2.5) with a strictly typed deterministic rules engine, eliminating hallucination risks in high-stakes domains.
- **Engineered an Evidence-First RAG Pipeline**: Implemented semantic retrieval (pgvector, OpenAI Embeddings) prioritizing authoritative government sources; established citation validation enforcing exact quote extraction and source traceability.
- **Built an Automated AI Evaluation Framework**: Developed a continuous evaluation suite with 30 adversarial test cases (borderline points, contradiction traps, invalid profiles) measuring pipeline precision, recall, and strict JSON schema compliance.
- **Optimized LLM Latency & Cost**: Reduced assessment latency to ~2.2s and cost to ~$0.003 per run through parallelized retrieval, optimized context windows, and structured Zod parsing pipelines.

---

### Senior Full-Stack → AI Engineer Version
*Emphasizes the integration of AI within a robust, modern full-stack application and system design.*

- **Developed an AI-Powered Decision Dashboard**: Built an end-to-end Next.js application that evaluates user profiles against complex immigration laws, leveraging Serverless API routes and PostgreSQL for high-performance data persistence.
- **Integrated Isomorphic Deterministic Rules**: Engineered a shared TypeScript rules engine that calculates exact immigration points on the backend and powers a 0-latency "What-If" simulator on the client side without triggering expensive LLM calls.
- **Implemented LLM Orchestration & RAG**: Built a scalable AI pipeline utilizing pgvector for semantic search and Gemini 2.5 for unstructured reasoning, enforcing strict JSON output via Zod for predictable UI rendering.
- **Designed for Graceful Degradation & Observability**: Implemented structured logging, timeout handling, and fallback mechanisms for LLM rate limits to ensure enterprise-grade reliability in production environments.

---

### Backend/Platform Engineer Version
*Emphasizes system reliability, data modeling, performance, and deterministic constraints.*

- **Designed an Orchestration Engine for LLMs**: Built a robust, parallelized backend pipeline in Node.js/TypeScript that sequences semantic retrieval, deterministic validation, and LLM synthesis with strict timeout and fallback controls.
- **Enforced Deterministic Constraints on AI Output**: Created a type-safe rules engine that acts as a firewall against LLM hallucinations, ensuring all AI-generated points and eligibility metrics strictly adhere to hardcoded statutory thresholds.
- **Optimized Vector Retrieval & Persistence**: Deployed and managed a Supabase/pgvector database for semantic search; implemented telemetry and structured JSON logging to trace request latencies across embedding and generation phases.
- **Built a 0-Latency Simulation Layer**: Architected an isomorphic evaluation model that allows complex mathematical recalculations to be offloaded entirely to the client, reducing server load and eliminating unnecessary LLM API costs.
