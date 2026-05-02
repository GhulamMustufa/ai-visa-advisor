"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseStoredResult, RESULT_STORAGE_KEY } from "@/lib/storage";
import type { PathwayResult, ProfileSummary, StoredResult } from "@/lib/storage";

function scoreTone(score: number) {
  if (score >= 70) {
    return {
      text: "text-emerald-700",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 40) {
    return {
      text: "text-amber-700",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
  };
}

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function profileSummaryHtml(p: ProfileSummary): string {
  const english =
    p.englishTest === "none"
      ? "None"
      : `${p.englishTest.toUpperCase()}${p.testScore != null ? ` (${p.testScore})` : ""}`;
  return `
    <ul class="meta">
      <li><strong>Nationality:</strong> ${esc(p.nationality)}</li>
      <li><strong>Target region:</strong> ${esc(p.targetRegion)}</li>
      <li><strong>Age:</strong> ${p.age}</li>
      <li><strong>Education:</strong> ${esc(p.education)}</li>
      <li><strong>Experience:</strong> ${p.yearsExperience} years</li>
      <li><strong>Field:</strong> ${esc(p.fieldOfWork)}</li>
      <li><strong>English test:</strong> ${esc(english)}</li>
      <li><strong>Savings (USD):</strong> $${p.savingsUsd.toLocaleString()}</li>
      <li><strong>Goal:</strong> ${esc(p.goal.toUpperCase())}</li>
    </ul>
  `;
}

function pathwayChecklistHtml(pathway: PathwayResult): string {
  return `
    <h1>${esc(pathway.name)} - ${esc(pathway.country)}</h1>
    <p class="score">Estimated success score: ${pathway.score}%</p>
    <h2>Required documents checklist</h2>
    <ul class="checklist">
      ${pathway.documents
        .map(
          (doc) => `<li><label><input type="checkbox" /> <span>${esc(doc)}</span></label></li>`,
        )
        .join("")}
    </ul>
  `;
}

function openPrintChecklist(pathway: PathwayResult, summary: ProfileSummary) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${esc(pathway.name)} Checklist</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 24px; line-height: 1.45; }
        h1 { margin: 0 0 4px; font-size: 24px; }
        h2 { margin: 20px 0 8px; font-size: 16px; }
        .score { margin: 0; color: #475569; }
        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .meta { margin: 0; padding-left: 18px; }
        .meta li { margin: 4px 0; }
        .checklist { list-style: none; padding: 0; margin: 8px 0 0; }
        .checklist li { margin: 8px 0; }
        .checklist label { display: flex; align-items: flex-start; gap: 8px; }
        @media print { body { padding: 12px; } }
      </style>
    </head>
    <body>
      <div class="card">
        ${pathwayChecklistHtml(pathway)}
      </div>
      <div class="card">
        <h2>User profile summary</h2>
        ${profileSummaryHtml(summary)}
      </div>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const w = window.open(blobUrl, "_blank", "width=900,height=900");
  if (w) {
    w.addEventListener("load", () => {
      setTimeout(() => {
        try {
          w.print();
        } catch {
          // Ignore browser-specific print errors.
        }
        URL.revokeObjectURL(blobUrl);
      }, 250);
    });
    return;
  }

  // Popup blocked: fall back to downloading the file directly.
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${pathway.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-checklist.html`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

function explainScoreDrivers(profile: ProfileSummary): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  if (profile.education === "master" || profile.education === "phd") {
    positive.push("Higher education improves points/eligibility in many pathways.");
  } else if (profile.education === "high_school") {
    negative.push("Lower education narrows skilled-route competitiveness.");
  }
  if (profile.yearsExperience >= 5) {
    positive.push("Solid work experience strengthens employability evidence.");
  } else if (profile.yearsExperience < 2) {
    negative.push("Low experience (<2 years) is a major rejection risk.");
  }
  if (profile.englishTest !== "none" && (profile.testScore ?? 0) > 0) {
    positive.push("Language proof reduces uncertainty and improves score confidence.");
  } else {
    negative.push("No language score is heavily penalized.");
  }
  if (profile.savingsUsd >= 15000) {
    positive.push("Strong savings improve funds credibility.");
  } else if (profile.savingsUsd < 5000) {
    negative.push("Low savings (<$5k) weakens financial viability.");
  }
  return { positive, negative };
}

function simulatedDelta(profile: ProfileSummary, simulatedIelts: number, simulatedSavings: number): number {
  let delta = 0;
  if (profile.englishTest === "none") {
    delta += simulatedIelts >= 7 ? 12 : simulatedIelts >= 6 ? 8 : 4;
  } else {
    const current = profile.testScore ?? 0;
    delta += Math.max(0, simulatedIelts - Math.max(0, current)) * 2.2;
  }
  const savingsBoost = Math.floor((simulatedSavings - profile.savingsUsd) / 5000);
  delta += Math.max(0, Math.min(4, savingsBoost)) * 3;
  return Math.round(delta);
}

export default function ResultsPage() {
  const [data, setData] = useState<StoredResult | null | undefined>(undefined);
  const [simulatedIelts, setSimulatedIelts] = useState(7.5);
  const [simulatedSavings, setSimulatedSavings] = useState(15000);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    setData(parseStoredResult(raw));
  }, []);

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-600">
        Loading…
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No results yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Complete the form first—results are stored in your browser for this session.
        </p>
        <Link
          href="/form"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft hover:bg-indigo-600"
        >
          Go to form
        </Link>
      </main>
    );
  }

  const drivers = explainScoreDrivers(data.profileSummary);
  const delta = simulatedDelta(data.profileSummary, simulatedIelts, simulatedSavings);
  const simulatedScores = data.pathways.slice(0, 3).map((p) => ({
    name: p.name,
    base: p.score,
    projected: Math.max(0, Math.min(100, p.score + delta)),
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <p>
          This tool provides AI-generated guidance, not legal advice. Always
          consult an official immigration consultant before making decisions.
        </p>
        <p className="mt-1 text-amber-800">
          Data based on general immigration patterns, not real-time embassy
          rules.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Results
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Top 3 visa options
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Conservative estimate generated from your submitted profile.
          </p>
        </div>
        <Link
          href="/form"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-600"
        >
          Try Another Profile
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Score explainability</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Increased your score</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {drivers.positive.length ? drivers.positive.map((p) => <li key={p}>{p}</li>) : <li>No major strengths detected.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Decreased your score</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {drivers.negative.length ? drivers.negative.map((n) => <li key={n}>{n}</li>) : <li>No major penalties detected.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Improve profile simulation</h2>
        <p className="mt-1 text-xs text-slate-600">
          Preview effect if you improve IELTS and savings. This is a fast estimate, not a model rerun.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            IELTS target
            <input
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={simulatedIelts}
              onChange={(e) => setSimulatedIelts(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-sm text-slate-700">
            Savings target (USD)
            <input
              type="number"
              min={0}
              step={500}
              value={simulatedSavings}
              onChange={(e) => setSimulatedSavings(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-slate-800">
          {simulatedScores.map((s) => (
            <li key={s.name}>
              {s.name}: {s.base}% {"->"} <span className="font-semibold">{s.projected}%</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="space-y-4">
        {data.pathways.slice(0, 3).map((opt, i) => {
          const tone = scoreTone(opt.score);
          return (
          <li
            key={`${opt.country}-${opt.name}-${i}`}
            className="rounded-2xl border border-slate-200/80 bg-card p-6 shadow-soft"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Option {i + 1}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {opt.name}{" "}
                  <span className="text-slate-400">· {opt.country}</span>
                </h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${tone.badge}`}>
                {opt.score}%
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Success score</span>
                <span className={tone.text}>{opt.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${tone.bar}`} style={{ width: `${opt.score}%` }} />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => openPrintChecklist(opt, data.profileSummary)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Download Checklist
                </button>
              </div>
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Why this score</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{opt.reason}</p>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Weaknesses</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {opt.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Required documents</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {opt.documents.map((doc) => (
                    <li key={doc} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-[10px] leading-none text-slate-500">
                        ✓
                      </span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Next steps</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {opt.next_steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </section>

              {opt.citations && opt.citations.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">Official sources</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {opt.citations.map((source) => (
                      <li key={`${source.url}-${source.title}`}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline decoration-current/40 underline-offset-2 hover:opacity-85"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </li>
          );
        })}
      </ul>

      <div className="mt-10 flex justify-center">
        <Link
          href="/form"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-600"
        >
          Try Another Profile
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p>
          This tool provides AI-generated guidance, not legal advice. Always
          consult an official immigration consultant before making decisions.
        </p>
        <p className="mt-1">
          Data based on general immigration patterns, not real-time embassy
          rules.
        </p>
      </div>
    </main>
  );
}
