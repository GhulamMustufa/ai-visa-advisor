export const RECENT_SUBMISSIONS_KEY = "visa-score-mvp-recent-submissions";
const MAX_RECENT = 10;

export type RecentSubmission = {
  submittedAt: string;
  nationality: string;
  targetRegion: string;
  goal: string;
  fieldOfWork: string;
};

export function pushRecentSubmission(entry: RecentSubmission): RecentSubmission[] {
  const current = readRecentSubmissions();
  const next = [entry, ...current].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SUBMISSIONS_KEY, JSON.stringify(next));
  return next;
}

export function readRecentSubmissions(): RecentSubmission[] {
  try {
    const raw = localStorage.getItem(RECENT_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const v = item as Partial<RecentSubmission>;
        return {
          submittedAt: String(v.submittedAt ?? ""),
          nationality: String(v.nationality ?? ""),
          targetRegion: String(v.targetRegion ?? ""),
          goal: String(v.goal ?? ""),
          fieldOfWork: String(v.fieldOfWork ?? ""),
        };
      })
      .filter(
        (x) =>
          x.submittedAt &&
          x.nationality &&
          x.targetRegion &&
          x.goal &&
          x.fieldOfWork,
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}
