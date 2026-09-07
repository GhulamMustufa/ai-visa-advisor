import { Pool } from "pg";
import crypto from "crypto";

// We require OPENAI_API_KEY and DATABASE_URL in the environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const MOCK_EVIDENCE = [
  {
    source_id: "ircc-express-entry-1",
    authority_tier: 1,
    country: "Canada",
    jurisdiction: "Federal",
    pathway: "Express Entry",
    claim_type: "language_requirement",
    effective_from: "2023-01-01T00:00:00Z",
    effective_until: null,
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html",
    source_title: "IRCC Language Requirements for Express Entry",
    verification_status: "VERIFIED",
    content: "To be eligible for Express Entry under the Federal Skilled Worker Program, you must prove your English or French language skills with a minimum level of Canadian Language Benchmark (CLB) 7 in all four abilities (writing, reading, listening, and speaking).",
  },
  {
    source_id: "ircc-express-entry-2",
    authority_tier: 1,
    country: "Canada",
    jurisdiction: "Federal",
    pathway: "Express Entry",
    claim_type: "funds_requirement",
    effective_from: "2024-05-28T00:00:00Z",
    effective_until: "2025-05-28T00:00:00Z",
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html",
    source_title: "IRCC Proof of Funds 2024",
    verification_status: "VERIFIED",
    content: "For a single applicant, the minimum proof of funds required for Express Entry (FSW and FST programs) is $13,757 CAD.",
  },
  {
    source_id: "uk-skilled-worker-1",
    authority_tier: 1,
    country: "UK",
    jurisdiction: "National",
    pathway: "Skilled Worker",
    claim_type: "salary_threshold",
    effective_from: "2024-04-04T00:00:00Z",
    effective_until: null,
    source_url: "https://www.gov.uk/skilled-worker-visa/your-job",
    source_title: "UK Gov Skilled Worker Salary Requirements",
    verification_status: "VERIFIED",
    content: "You’ll usually need to be paid at least £38,700 per year or the 'going rate' for your job, whichever is higher, to qualify for a Skilled Worker visa.",
  },
  {
    source_id: "uk-skilled-worker-2",
    authority_tier: 4, // Secondary source, lower authority
    country: "UK",
    jurisdiction: "National",
    pathway: "Skilled Worker",
    claim_type: "salary_threshold",
    effective_from: "2023-01-01T00:00:00Z",
    effective_until: null,
    source_url: "https://example-immigration-blog.com/uk-visa",
    source_title: "Blog: UK Visa Guide",
    verification_status: "UNVERIFIED",
    content: "The minimum salary for a UK Skilled Worker visa is £26,200. Make sure your employer pays this.", // CONFLICTING CLAIM
  }
];

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function seed() {
  console.log("Starting evidence ingestion...");
  
  for (const item of MOCK_EVIDENCE) {
    console.log(`Processing: ${item.source_id}...`);
    
    // Hash content
    const content_hash = crypto.createHash('sha256').update(item.content).digest('hex');
    
    // Generate embedding
    const embedding = await generateEmbedding(item.content);
    
    // Insert into DB
    const embeddingStr = `[${embedding.join(',')}]`;
    try {
      await pool.query(
        `INSERT INTO immigration_evidence 
          (source_id, authority_tier, country, jurisdiction, pathway, claim_type, effective_from, effective_until, source_url, source_title, verification_status, content, content_hash, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (source_id) DO UPDATE SET
          authority_tier = EXCLUDED.authority_tier,
          country = EXCLUDED.country,
          jurisdiction = EXCLUDED.jurisdiction,
          pathway = EXCLUDED.pathway,
          claim_type = EXCLUDED.claim_type,
          effective_from = EXCLUDED.effective_from,
          effective_until = EXCLUDED.effective_until,
          source_url = EXCLUDED.source_url,
          source_title = EXCLUDED.source_title,
          verification_status = EXCLUDED.verification_status,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          embedding = EXCLUDED.embedding,
          updated_at = timezone('utc'::text, now())`,
        [
          item.source_id, item.authority_tier, item.country, item.jurisdiction, item.pathway, item.claim_type, 
          item.effective_from, item.effective_until, item.source_url, item.source_title, item.verification_status, 
          item.content, content_hash, embeddingStr
        ]
      );
      console.log(`Successfully ingested: ${item.source_id}`);
    } catch (error) {
      console.error(`Failed to insert ${item.source_id}:`, error);
    }
  }
  
  console.log("Seeding complete.");
  await pool.end();
}

seed().catch(console.error);
