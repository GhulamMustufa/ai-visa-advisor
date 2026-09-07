import type { Evidence, DataFreshness, CitationValidationResult, ConflictDetectionResult, Citation } from "./types";

export function evaluateFreshness(evidence: Evidence): DataFreshness {
  const now = new Date();
  
  if (evidence.effective_until) {
    const expiration = new Date(evidence.effective_until);
    if (now > expiration) {
      return "EXPIRED";
    }
  }

  // If we retrieved it more than 180 days ago and it has no explicit expiration, flag it as stale
  const retrieved = new Date(evidence.retrieved_at);
  const msIn180Days = 180 * 24 * 60 * 60 * 1000;
  
  if (now.getTime() - retrieved.getTime() > msIn180Days) {
    return "STALE";
  }

  return "VERIFIED";
}

export function detectConflicts(evidenceList: Evidence[]): ConflictDetectionResult[] {
  const results: ConflictDetectionResult[] = [];
  
  // Group by claim type
  const groups: Record<string, Evidence[]> = {};
  for (const e of evidenceList) {
    const key = `${e.claim_type}-${e.country}-${e.pathway || "general"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  for (const key in groups) {
    const group = groups[key];
    if (group.length <= 1) continue;

    // Check if the contents (or hashes) differ significantly between items of the same claim.
    // In a real system, you'd extract the exact numeric value (e.g. $10,000 vs $12,000).
    // Here we just check if content_hash differs across the group.
    const firstHash = group[0].content_hash;
    const hasConflict = group.some(e => e.content_hash !== firstHash);
    
    if (hasConflict) {
      // User preference: Do not throw an error. Resolve by preferring the highest authority tier (lowest number),
      // then by freshness (most recently retrieved).
      const sorted = [...group].sort((a, b) => {
        if (a.authority_tier !== b.authority_tier) {
          return a.authority_tier - b.authority_tier;
        }
        return new Date(b.retrieved_at).getTime() - new Date(a.retrieved_at).getTime();
      });

      results.push({
        hasConflict: true,
        conflictingClaims: group,
        resolvedEvidence: sorted[0],
        message: `Conflict detected for ${key}. Resolved by trusting Tier ${sorted[0].authority_tier} source over others.`
      });
    }
  }

  return results;
}

export function validateCitations(llmCitations: Citation[], providedEvidence: Evidence[]): CitationValidationResult {
  const errors: string[] = [];

  for (const citation of llmCitations) {
    // Look for a matching URL in the evidence provided to the LLM
    const matchedEvidence = providedEvidence.find(
      e => e.source_url.toLowerCase() === citation.url.toLowerCase() || 
           e.source_title.toLowerCase().includes(citation.title.toLowerCase())
    );

    if (!matchedEvidence) {
      errors.push(`Citation mismatch: The LLM cited '${citation.title}' (${citation.url}) which was NOT in the provided evidence. Potential hallucination.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
