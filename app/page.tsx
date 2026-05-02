"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readRecentSubmissions,
  type RecentSubmission,
} from "@/lib/submissions";

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString();
}

const REGIONS: Record<string, string> = {
  canada: "🇨🇦 Canada",
  uk: "🇬🇧 UK",
  "australia-new-zealand": "🇦🇺 Australia / NZ",
  "germany-nordics": "🇩🇪 Germany",
  "southern-europe": "🌍 Southern Europe",
  "middle-east": "🕌 Middle East",
  usa: "🇺🇸 USA",
  "sg-my": "🇸🇬 Singapore / Malaysia",
  "jp-kr": "🇯🇵 Japan / South Korea",
  "easy-entry": "✈️ Easy Entry",
};

export default function Home() {
  const [recent, setRecent] = useState<RecentSubmission[]>([]);

  useEffect(() => {
    setRecent(readRecentSubmissions());
  }, []);

  return (
    <main className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-[500px] bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.15),transparent_65%)]" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Honest immigration scoring — not wishful thinking
            </p>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Know Your Real<br />
              <span className="text-accent">Visa Chances</span><br />
              Before You Apply
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
              Most online calculators tell you what you want to hear.
              We use a conservative scoring model grounded in official government
              sources — so you invest time and money in routes that actually work for your profile.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/form"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-600"
              >
                Check My Chances — Free
              </Link>
              <Link
                href="/explore"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Explore Regions
              </Link>
            </div>

            {/* Real stats only */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: "10", label: "Regions covered" },
                { value: "17", label: "Official sources" },
                { value: "Free", label: "To get started" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-lg font-semibold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              No account required to run your first assessment.
            </p>
          </div>

          {/* Example result card — showcases new output fields */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft lg:sticky lg:top-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Example result
              </p>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                Score: 64 / 100
              </span>
            </div>

            <p className="font-semibold text-slate-900">Canada Express Entry</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[64%] rounded-full bg-amber-500" />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Eligible for Express Entry pool, but CRS score (~440) falls below current draw
              cutoffs. A provincial nomination or Canadian job offer would guarantee an
              invitation.
            </p>

            <div className="mt-4 space-y-2">
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-700">Score drivers</p>
                <ul className="mt-1.5 space-y-1 text-slate-500">
                  <li className="flex justify-between"><span>Master&apos;s degree</span><span className="text-emerald-600 font-medium">+12 pts</span></li>
                  <li className="flex justify-between"><span>IELTS 7.5 (proficient)</span><span className="text-emerald-600 font-medium">+10 pts</span></li>
                  <li className="flex justify-between"><span>No Canadian work exp.</span><span className="text-rose-500 font-medium">−18 pts</span></li>
                </ul>
              </div>

              <div className="rounded-lg bg-indigo-50 p-3 text-xs">
                <p className="font-medium text-indigo-700">Top improvement</p>
                <p className="mt-1 text-indigo-600">Get a Canadian job offer — adds 200 CRS points and guarantees invitation</p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="text-slate-400">⏱</span>
                <span>Estimated timeline: <strong>12–18 months</strong></span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Conservative model. Guidance only — not legal advice.
            </p>
          </div>
        </div>
      </section>

      {/* ── What you actually get ─────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-lg font-semibold text-slate-900">
            What you get from every assessment
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Not a generic score — a full breakdown you can act on today.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Honest probability score",
                text: "0–100 score calibrated like a real refusal risk — 86+ is rare by design. You'll know where you actually stand.",
              },
              {
                icon: "📋",
                title: "Exact document checklist",
                text: "5–8 pathway-specific documents you need to gather, not a generic list copied from Wikipedia.",
              },
              {
                icon: "📉",
                title: "Score drivers breakdown",
                text: "See exactly what pushed your score up or down — Master's +12, no job offer −18 — so you know what to fix.",
              },
              {
                icon: "🔧",
                title: "Single top improvement",
                text: "The one change that would raise your score most — ranked by actual impact on the visa criteria.",
              },
              {
                icon: "⏱",
                title: "Realistic timeline",
                text: "How long the process actually takes: 3–6 months or 18–24 months. No false urgency.",
              },
              {
                icon: "📎",
                title: "Official source citations",
                text: "Every recommendation is grounded in 17 government sources — IRCC, GOV.UK, Home Affairs, USCIS, and more.",
              },
            ].map((f) => (
              <article key={f.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-lg font-semibold text-slate-900">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Fill your profile",
              text: "Nationality, education, work experience, English test score, savings, and immigration goal. Takes about 2 minutes.",
            },
            {
              step: "2",
              title: "Get scored pathways",
              text: "Our AI scores your top 3 visa routes using official criteria — points thresholds, salary floors, language minimums.",
            },
            {
              step: "3",
              title: "Act on the gaps",
              text: "Use the score drivers and top improvement tip to fix weak spots before spending money on visa applications.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 bg-card p-5">
              <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                {s.step}
              </div>
              <p className="text-sm font-semibold text-slate-900">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why honest scoring matters ────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-indigo-50/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Our philosophy</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                We score like a skeptical immigration officer, not a travel agent
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Most free tools inflate scores to keep you optimistic. We do the opposite —
                our model penalises low savings, missing language tests, and insufficient
                experience because those are exactly the reasons real applications get refused.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                A score of 64% here is more useful than a score of 90% somewhere else,
                because it points to the exact gaps you need to close before you apply.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Weak savings (<$5k)", impact: "Heavy penalty" },
                { label: "No English test", impact: "Heavy penalty" },
                { label: "Under 2 years experience", impact: "Penalised" },
                { label: "High school only", impact: "Strict mode" },
                { label: "Master's or PhD", impact: "Score boost" },
                { label: "Skilled profession", impact: "Score boost" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <span className="text-slate-700">{r.label}</span>
                  <span className={`font-medium ${r.impact.includes("boost") ? "text-emerald-600" : "text-rose-500"}`}>
                    {r.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Covered regions ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-lg font-semibold text-slate-900">10 regions covered</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-500">
          Each region has dedicated official sources with real scoring criteria.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {Object.values(REGIONS).map((label) => (
            <span
              key={label}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Recent checks (localStorage) ─────────────────────── */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Your recent checks</h2>
              <Link href="/history" className="text-xs text-accent hover:underline">
                View all →
              </Link>
            </div>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={`${item.submittedAt}-${item.nationality}-${item.fieldOfWork}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>
                    <span className="font-medium">{item.nationality}</span>
                    {" · "}{REGIONS[item.targetRegion] ?? item.targetRegion}
                    {" · "}{item.goal.toUpperCase()}
                    {" · "}{item.fieldOfWork}
                  </span>
                  <span className="ml-4 shrink-0 text-xs text-slate-400">{fmtTime(item.submittedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-8 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Stop guessing. Check your actual chances.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            A 2-minute profile check is better than months of research based on
            best-case scenarios. Find out where you stand and exactly what to fix.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/form"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-7 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-600"
            >
              Start Free Assessment
            </Link>
            <Link
              href="/explore"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Explore Regions First
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No account required · Free to start · No credit card
          </p>
        </div>
      </section>
    </main>
  );
}
