import { createClient } from "@/utils/supabase/server";
import type { Evidence, TargetRegion } from "./types";

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
  queryText: string,
  targetRegion: TargetRegion,
  pathwayId?: string,
  limit: number = 10
): Promise<Evidence[]> {
  let data: any = null;
  let error: any = null;

  try {
    const embedding = await getEmbedding(queryText);

    // Map TargetRegion to the 'country' metadata used in the DB
    const regionToCountryMap: Record<string, string> = {
      canada: "Canada",
      uk: "UK",
      "australia-new-zealand": "Australia",
      usa: "USA",
    };
    const filterCountry = regionToCountryMap[targetRegion] || null;

    const supabase = createClient();
    const res = await supabase.rpc("match_evidence", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: limit,
      filter_country: filterCountry,
      filter_pathway: pathwayId || null,
    });
    data = res.data;
    error = res.error;
  } catch (err) {
    console.warn("Skipping DB evidence retrieval (likely running in CLI without Next.js request scope).");
    return [];
  }

  if (error || !data) {
    console.error("Failed to retrieve evidence:", error);
    return [];
  }

  return filterByAuthority(data as Evidence[]);
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
