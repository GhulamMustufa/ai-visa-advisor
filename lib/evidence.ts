import { db } from "./db";
import type { Evidence, TargetRegion, VisaProfile, NormalizedProfile } from "./types";

// Fallback logic for when OpenAI isn't configured, so the app still builds and runs
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // If no key, return dummy vector to prevent crashing in dev
    return new Array(1536).fill(0);
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    console.error("OpenAI embedding error", await res.text());
    return new Array(1536).fill(0);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function retrieveEvidence(
  profile: VisaProfile,
  normalizedProfile: NormalizedProfile,
  pathwayId?: string,
  limit: number = 10
): Promise<Evidence[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("No OPENAI_API_KEY, returning empty evidence.");
    return [];
  }

  // 1. Query Transformation: Generate targeted search queries
  let searchQueries: string[] = [];
  try {
    const prompt = `You are an expert immigration paralegal. Generate 3 distinct, highly targeted search queries to find the exact legal requirements, exceptions, or processing times for this applicant.
    
Applicant Info: ${profile.age} years old, ${profile.nationality} citizen, ${normalizedProfile.canonicalOccupation}, ${profile.education}. Goal: ${profile.goal} in ${profile.targetRegion}.
Pathway: ${pathwayId || "general"}

Output EXACTLY 3 queries as a JSON array of strings. No markdown formatting. Example: ["Express Entry CRS cutoff score tech draw", "Federal Skilled Worker proof of funds requirement", "Software Engineer NOC code Canada LMIA"]`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      }),
    });
    clearTimeout(timer);
    
    if (res.ok) {
      const data = await res.json();
      const content = data.choices[0].message.content.trim();
      // Remove any markdown block wrapping if the LLM didn't listen
      const cleanContent = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      searchQueries = JSON.parse(cleanContent);
    }
  } catch (err) {
    console.warn("Query transformation failed, falling back to basic query.", err);
  }

  if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
    searchQueries = [
      `Visa requirements for ${normalizedProfile.canonicalOccupation} seeking ${profile.goal} in ${profile.targetRegion}.`
    ];
  }

  // 2. Execute parallel vector searches
  const regionToCountryMap: Record<string, string> = {
    canada: "Canada", uk: "UK", "australia-new-zealand": "Australia", usa: "USA",
  };
  const filterCountry = regionToCountryMap[profile.targetRegion] || null;
  let allEvidence: Evidence[] = [];

  try {
    const searchPromises = searchQueries.map(async (queryText) => {
      const embedding = await getEmbedding(queryText);
      const embeddingStr = `[${embedding.join(',')}]`;
      const res = await db.query(
        `SELECT * FROM match_evidence($1, $2, $3, $4, $5)`,
        [embeddingStr, 0.3, limit, filterCountry, pathwayId || null]
      );
      return (res.rows as Evidence[]) || [];
    });

    const resultsList = await Promise.all(searchPromises);
    allEvidence = resultsList.flat();
  } catch (err) {
    console.warn("Skipping DB evidence retrieval (likely running in CLI without Next.js request scope).");
    return [];
  }

  // 3. Deduplicate exact chunks retrieved across multiple queries
  const uniqueEvidenceMap = new Map<string, Evidence>();
  for (const e of allEvidence) {
    if (e && e.id) {
      uniqueEvidenceMap.set(e.id, e);
    }
  }

  return filterByAuthority(Array.from(uniqueEvidenceMap.values()));
}

/**
 * Ensures that if high-authority (Tier 1-2) evidence exists for a specific claim,
 * lower-authority (Tier 3-5) evidence for that SAME claim is dropped.
 */
function filterByAuthority(evidence: Evidence[]): Evidence[] {
  const filtered: Evidence[] = [];
  
  // Group by claim_type + country + pathway
  const groups: Record<string, Evidence[]> = {};
  for (const e of evidence) {
    const key = `${e.claim_type}-${e.country}-${e.pathway || "general"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  for (const key in groups) {
    const group = groups[key];
    const hasHighAuthority = group.some(e => e.authority_tier <= 2);
    
    if (hasHighAuthority) {
      // Keep only Tier 1 & 2 if they exist for this claim
      filtered.push(...group.filter(e => e.authority_tier <= 2));
    } else {
      // Otherwise keep whatever we have
      filtered.push(...group);
    }
  }

  // Deduplicate and return
  return Array.from(new Map(filtered.map(e => [e.id, e])).values());
}
