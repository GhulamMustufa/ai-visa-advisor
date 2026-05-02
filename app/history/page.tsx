"use client";

import { useEffect, useMemo, useState } from "react";
import type { Goal, TargetRegion, VisaProfile } from "@/lib/types";

type HistoryPathway = {
  name: string;
  country: string;
  score: number;
};

type HistoryItem = {
  id: number;
  requestId: string;
  createdAt: string;
  promptVersion: string;
  model: string;
  profile: VisaProfile;
  result: { pathways: HistoryPathway[] };
};

const REGIONS: Array<{ value: TargetRegion; label: string }> = [
  { value: "canada", label: "Canada" },
  { value: "uk", label: "UK" },
  { value: "australia-new-zealand", label: "Australia/New Zealand" },
  { value: "germany-nordics", label: "Germany/Northern Europe" },
  { value: "southern-europe", label: "Southern Europe" },
  { value: "middle-east", label: "Middle East" },
  { value: "usa", label: "USA" },
  { value: "sg-my", label: "Singapore/Malaysia" },
  { value: "jp-kr", label: "Japan/South Korea" },
  { value: "easy-entry", label: "Easy Entry Countries" },
];

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<"" | Goal>("");
  const [region, setRegion] = useState<"" | TargetRegion>("");
  const [compareIds, setCompareIds] = useState<number[]>([]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams();
      q.set("limit", "40");
      if (goal) q.set("goal", goal);
      if (region) q.set("region", region);
      const res = await fetch(`/api/history?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (ignore) return;
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load history");
        setItems([]);
      } else {
        setItems(Array.isArray(data.items) ? data.items : []);
      }
      setLoading(false);
    }
    run().catch(() => {
      if (!ignore) {
        setError("Failed to load history");
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [goal, region]);

  const compareItems = useMemo(
    () => items.filter((i) => compareIds.includes(i.id)).slice(0, 2),
    [items, compareIds],
  );

  function avgScore(item: HistoryItem): number {
    if (!item.result.pathways.length) return 0;
    return Math.round(
      item.result.pathways.reduce((sum, p) => sum + Number(p.score || 0), 0) /
        item.result.pathways.length,
    );
  }

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Latest checks</h1>
        <p className="mt-2 text-sm text-slate-600">
          Filter by goal/region, then compare any two submissions.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <select
          value={goal}
          onChange={(e) => setGoal((e.target.value || "") as "" | Goal)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">All goals</option>
          <option value="work">Work</option>
          <option value="study">Study</option>
          <option value="pr">PR</option>
        </select>
        <select
          value={region}
          onChange={(e) => setRegion((e.target.value || "") as "" | TargetRegion)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="self-center text-sm text-slate-500">Selected to compare: {compareIds.length}/2</p>
      </div>

      {compareItems.length === 2 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Compare</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {compareItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()} - {item.profile.goal.toUpperCase()} -{" "}
                  {item.profile.targetRegion}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Avg score: {avgScore(item)}%
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Top pathway: {item.result.pathways[0]?.name ?? "N/A"} (
                  {item.result.pathways[0]?.score ?? 0}%)
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">
            Delta: {avgScore(compareItems[0]) - avgScore(compareItems[1])} points
          </p>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-600">Loading history...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-slate-600">No saved checks found in DB yet.</p>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {item.profile.nationality} - {item.profile.goal.toUpperCase()} -{" "}
                  {item.profile.targetRegion}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Avg score {avgScore(item)}% | Model {item.model} | {item.promptVersion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCompare(item.id)}
                className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium ${
                  compareIds.includes(item.id)
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {compareIds.includes(item.id) ? "Selected" : "Compare"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
