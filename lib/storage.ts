export const RESULT_STORAGE_KEY = "visa-score-mvp-result";

export type PathwayResult = {
  name: string;
  country: string;
  score: number;
  reason: string;
  weaknesses: string[];
  documents: string[];
  next_steps: string[];
  citations?: Array<{ title: string; url: string }>;
};

export type ProfileSummary = {
  nationality: string;
  targetRegion: string;
  age: number;
  education: string;
  yearsExperience: number;
  fieldOfWork: string;
  englishTest: string;
  testScore: number | null;
  savingsUsd: number;
  goal: string;
};

export type StoredResult = {
  pathways: PathwayResult[];
  profileSummary: ProfileSummary;
};

export function parseStoredResult(raw: string | null): StoredResult | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredResult>;
    if (!Array.isArray(data.pathways) || data.pathways.length === 0) {
      return null;
    }
    const pathways = data.pathways
      .filter(Boolean)
      .map((p) => {
        const v = p as Partial<PathwayResult>;
        return {
          name: String(v.name ?? "").trim(),
          country: String(v.country ?? "").trim(),
          score: Number(v.score ?? 0),
          reason: String(v.reason ?? "").trim(),
          weaknesses: Array.isArray(v.weaknesses) ? v.weaknesses.map(String) : [],
          documents: Array.isArray(v.documents) ? v.documents.map(String) : [],
          next_steps: Array.isArray(v.next_steps) ? v.next_steps.map(String) : [],
          citations: Array.isArray(v.citations)
            ? v.citations
                .map((c) => {
                  const item = c as { title?: unknown; url?: unknown };
                  return {
                    title: String(item.title ?? "").trim(),
                    url: String(item.url ?? "").trim(),
                  };
                })
                .filter((c) => c.title && c.url)
            : [],
        } satisfies PathwayResult;
      })
      .filter((p) => p.name && p.country && Number.isFinite(p.score))
      .slice(0, 3)
      .map((p) => ({
        ...p,
        score: Math.max(0, Math.min(100, Math.round(p.score))),
      }));

    const s = (data.profileSummary ?? {}) as Partial<ProfileSummary>;
    const profileSummary: ProfileSummary = {
      nationality: String(s.nationality ?? "").trim(),
      targetRegion: String(s.targetRegion ?? "").trim(),
      age: Number(s.age ?? 0),
      education: String(s.education ?? "").trim(),
      yearsExperience: Number(s.yearsExperience ?? 0),
      fieldOfWork: String(s.fieldOfWork ?? "").trim(),
      englishTest: String(s.englishTest ?? "").trim(),
      testScore: s.testScore == null ? null : Number(s.testScore),
      savingsUsd: Number(s.savingsUsd ?? 0),
      goal: String(s.goal ?? "").trim(),
    };

    const hasSummary =
      profileSummary.nationality &&
      profileSummary.targetRegion &&
      Number.isFinite(profileSummary.age) &&
      profileSummary.education &&
      Number.isFinite(profileSummary.yearsExperience) &&
      profileSummary.fieldOfWork &&
      profileSummary.englishTest &&
      Number.isFinite(profileSummary.savingsUsd) &&
      profileSummary.goal;

    if (pathways.length === 0 || !hasSummary) return null;
    return { pathways, profileSummary };
  } catch {
    return null;
  }
}
