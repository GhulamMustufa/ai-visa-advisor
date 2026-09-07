import type { DeterministicEvaluation, Evidence, CriticResult, RankedPathway } from "./types";
import { withRetry } from "./retry";

export async function evaluateSynthesizerOutput(
  apiKey: string,
  synthesizerOutputText: string,
  topEvaluations: DeterministicEvaluation[],
  evidenceList: Evidence[]
): Promise<CriticResult> {
  const modelUsed = "gpt-4o-mini"; // Using a fast, cheap model for the critic

  const prompt = `You are a strict QA Critic for an immigration AI system.
Your job is to read the proposed output from a junior synthesizer agent and reject it if it violates our strict deterministic rules.

RULE 1: The synthesizer MUST NOT invent "chance of approval" percentages or probabilistic forecasts (e.g. "You have a 78% chance").
RULE 2: The synthesizer MUST accurately reflect the deterministic Eligibility Status. (If the deterministic status says "BLOCKED", the synthesizer cannot claim they are "ELIGIBLE").
RULE 3: The synthesizer MUST NOT hallucinate citations. It can only cite the URLs provided in the Grounding Evidence.

Proposed Synthesizer Output:
${synthesizerOutputText}

Deterministic Ground Truth (Status & Scores):
${JSON.stringify(topEvaluations.map(e => ({ pathwayId: e.pathwayId, status: e.status, baseScore: e.baseScore })), null, 2)}

Grounding Evidence URLs available:
${JSON.stringify(evidenceList.map(e => e.source_url), null, 2)}

Evaluate the output. If it violates ANY rules, set "approved" to false and provide explicit "feedback". Otherwise, approve it.`;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          signal: controller.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelUsed,
            temperature: 0,
            max_tokens: 500,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "critic_evaluation",
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["approved", "feedback", "hallucinated_claims"],
                  properties: {
                    approved: { type: "boolean" },
                    feedback: { type: "array", items: { type: "string" } },
                    hallucinated_claims: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!openaiRes.ok) throw new Error(await openaiRes.text());
        const data = await openaiRes.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Empty critic response");
        return JSON.parse(content) as CriticResult;
      } finally {
        clearTimeout(timer);
      }
    },
    { attempts: 2, baseDelayMs: 200 }
  );
}
