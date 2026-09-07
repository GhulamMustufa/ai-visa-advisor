import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// We require OPENAI_API_KEY and Supabase credentials in the environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase credentials missing");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    
    // Insert into Supabase
    const { error } = await supabase
      .from("immigration_evidence")
      .upsert({
        source_id: item.source_id,
        authority_tier: item.authority_tier,
        country: item.country,
        jurisdiction: item.jurisdiction,
        pathway: item.pathway,
        claim_type: item.claim_type,
        effective_from: item.effective_from,
        effective_until: item.effective_until,
        source_url: item.source_url,
        source_title: item.source_title,
        verification_status: item.verification_status,
        content: item.content,
        content_hash,
        embedding
      }, { onConflict: "source_id" });

    if (error) {
      console.error(`Failed to insert ${item.source_id}:`, error);
    } else {
      console.log(`Successfully ingested: ${item.source_id}`);
    }
  }
  
  console.log("Seeding complete.");
}

seed().catch(console.error);
