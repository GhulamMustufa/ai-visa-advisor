# Interview Story: AI Visa Advisor

Use this document to prepare for technical interviews. It provides honest, architecturally sound answers to why this system was built the way it was.

---

### Why did you build this?
Immigration is a high-stakes, data-dense domain where traditional software falls short because rules are qualitative and constantly shifting, but pure AI falls short because it hallucinates points and thresholds. I wanted to build a system that bridged this gap—using AI for what it's good at (synthesizing dense government texts, evaluating qualitative requirements) and traditional software for what it's good at (deterministic math and hard rules). 

### Why not simply use ChatGPT?
ChatGPT is a black box. If it tells a user they qualify for a Canadian visa, it doesn't prove *how* it calculated their CRS score, nor does it guarantee it's using the threshold from the draw that happened yesterday. In immigration, a hallucination isn't just an error; it can ruin someone's life plan. We needed explainability, strict rule adherence, and exact citations—things a standard chatbot UI fundamentally cannot provide.

### Why RAG?
Immigration policies, processing times, and financial thresholds change frequently. We cannot rely on the base training weights of an LLM. RAG allows us to inject the absolute latest government documents into the context window. More importantly, it allows us to enforce an "evidence-first" approach where the LLM is instructed to *only* generate answers if the provided RAG context explicitly supports them.

### Why deterministic rules?
Because math is math. If the UK Skilled Worker visa requires exactly £38,700, and the user makes £35,000, they are blocked. An LLM might try to be "helpful" and say they are "almost eligible" or hallucinate an exception. By pulling the points calculations and hard threshold checks out of the LLM and into a strictly typed TypeScript engine (`lib/engine.ts`), we treat the LLM as an analyst, but the code acts as the ultimate judge. 

### Why LLM?
If deterministic rules are so great, why use AI at all? Because not all rules are math. Requirements like "Must prove ties to home country," "Must hold a degree in a related specialty," or "Occupation must be in high demand" require qualitative synthesis. The LLM excels at reading a user's messy, unstructured background and mapping it to these qualitative legal definitions using the RAG context.

### How do you prevent hallucination?
Three layers of defense:
1. **The Deterministic Engine**: The LLM doesn't award points. It just tags requirements as `met` or `unmet`. The code awards the points.
2. **Authoritative Retrieval**: We strictly filter RAG results by domain authority (Tier 1: .gov, Tier 2: legal counsel).
3. **Post-Processing Citation Validation**: The LLM is forced to return exact URLs and quotes in its JSON response. If the URL it cites wasn't in the context we explicitly fed it, we flag it as a hallucination.

### How do you evaluate it?
I built an automated evaluation suite (`__tests__/evals`) with 30 adversarial profiles. These aren't just "happy path" cases. They include:
- Borderline points (exactly 1 point below the cutoff)
- Hallucination traps (asking for visas that don't exist)
- Conflicting information (e.g., claiming a Master's degree but only 2 years of total education)
The framework measures Pipeline Latency, Cost, Citation Precision, and strictly checks if the system correctly blocks users it is supposed to block.

### What happens when sources conflict?
This is a real problem in RAG. We resolve this via the **Authority Tier system**. An official government portal (`.gov.uk`) will always override a law firm's blog post. If two government sources conflict (e.g., an outdated page vs. a new press release), the prompt is explicitly instructed to favor the most recent `last_updated` date provided in the metadata.

### How do you handle stale immigration rules?
The deterministic engine's `PATHWAY_REGISTRY` is updated manually or via a verified data pipeline for hard thresholds (like age points). The RAG database is regularly synced with government RSS feeds and official gazettes. We explicitly show a "Source Freshness" indicator in the UI so the user knows exactly when the data was last validated.

### Why did you choose this architecture?
I chose Next.js and Serverless functions for speed of iteration and deployment. I used pgvector via Supabase because it allowed me to keep relational user data (profiles, history) and vector embeddings in the exact same Postgres database, simplifying infrastructure. I chose Gemini 2.5 Flash because it is incredibly fast and cheap for large context windows, which is essential when stuffing 10+ government documents into a prompt.

### What would you change at 10x scale?
At 10x scale, the synchronous LLM call during the `POST /api/score` request becomes a bottleneck. I would:
1. Move the orchestration to an asynchronous queue (e.g., Inngest or AWS SQS).
2. Implement semantic caching (e.g., Redis) so if two identical 25-year-old Software Engineers from India apply, we don't rerun the LLM, we just return the cached deterministic calculation.
3. Fine-tune a smaller, cheaper model strictly on immigration assessments to reduce reliance on generic foundational models.

### What are the biggest limitations?
1. **Legal Liability**: It is still fundamentally not legal advice. The system can miss edge cases (e.g., a past criminal conviction the user didn't mention).
2. **Context Window Limits**: Sometimes an immigration pathway requires synthesizing a 200-page PDF. Standard chunking loses the holistic context. We are exploring hierarchical retrieval to solve this.
3. **Data Ingestion**: Keeping the `PATHWAY_REGISTRY` deterministic rules up-to-date currently requires manual engineering effort. Automating the extraction of rules from text into executable code is the next frontier.
