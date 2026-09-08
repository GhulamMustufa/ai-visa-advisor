import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages } from 'ai';
import { Pool } from 'pg';

// Initialize Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text.replace(/\n/g, ' '),
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Embedding API error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get the user's latest question
    const latestMessage = messages[messages.length - 1];
    const userQuery = latestMessage.content;

    // 1. Generate an embedding of the user's question
    const embedding = await generateEmbedding(userQuery);
    const embeddingStr = `[${embedding.join(',')}]`;

    // 2. Query Neon DB for the most relevant context using pgvector cosine distance (<=>) or Euclidean (<->)
    // We use <=> (cosine distance) for OpenAI embeddings
    const queryResult = await pool.query(
      `SELECT country, pathway, source_title, content, source_url, 1 - (embedding <=> $1) AS similarity
       FROM immigration_evidence
       WHERE 1 - (embedding <=> $1) > 0.3
       ORDER BY embedding <=> $1
       LIMIT 5`,
      [embeddingStr]
    );

    const contextRows = queryResult.rows;
    
    let contextString = "No specific visa evidence found in the database for this query.";
    if (contextRows.length > 0) {
      contextString = contextRows.map((row, i) => {
        return `--- Evidence ${i+1} ---
Country: ${row.country}
Visa/Pathway: ${row.pathway}
Source: ${row.source_title} (${row.source_url})
Details:
${row.content}
`;
      }).join("\n");
    }

    // 3. Construct System Prompt
    const systemPrompt = `You are the AI Visa Advisor, an expert immigration assistant.
Your goal is to answer the user's questions strictly based on the provided Official Evidence.

IMPORTANT RULES:
1. ONLY use the information provided in the Official Evidence below. 
2. If the user asks about a country or visa that is NOT in the Official Evidence, gracefully decline. DO NOT hallucinate or guess. Say "I'm sorry, I don't currently have official government rules for [Country] in my database."
3. When providing an answer, always cite your sources by mentioning the Country, Visa Name, and Source URL provided in the evidence.
4. Format your responses beautifully using Markdown (bullet points, bold text for emphasis).
5. Be concise, helpful, and professional.

OFFICIAL EVIDENCE:
${contextString}
`;

    // 4. Stream response using Vercel AI SDK
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      temperature: 0.1,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
