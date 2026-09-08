import type { RankedPathway, VisaProfile } from "./types";

export const RESULT_STORAGE_KEY = "borderless-ai-result";

export type StoredResult = {
  overall_score: number;
  summary: string;
  pathways: RankedPathway[];
  profileSummary: VisaProfile;
};

export function parseStoredResult(raw: string | null): StoredResult | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredResult>;
    if (!Array.isArray(data.pathways) || data.pathways.length === 0) {
      return null;
    }
    
    // For now we trust the JSON payload because it's either from our API or Demo file
    // Ideally this would use Zod, but since it's local storage parsing, we cast.
    return data as StoredResult;
  } catch {
    return null;
  }
}
