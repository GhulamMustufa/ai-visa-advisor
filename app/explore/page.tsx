"use client";

import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { useMemo, useState } from "react";

function toneForCost(value: "Low" | "Medium" | "High") {
  if (value === "Low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function toneForDifficulty(value: "Easy" | "Medium" | "Hard") {
  if (value === "Easy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function toneForSpeed(value: "Fast" | "Medium" | "Slow") {
  if (value === "Fast") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

type GoalFilter = "Any" | "Work" | "Study" | "PR";
type BudgetFilter = "Any" | "Low" | "Medium" | "High";
type DifficultyFilter = "Any" | "Easy" | "Medium" | "Hard";

function matchesGoal(goal: GoalFilter, regionText: string): boolean {
  if (goal === "Any") return true;
  if (goal === "Work") return /(work|job|employer|sponsor|employment)/i.test(regionText);
  if (goal === "Study") return /(study|student|graduate|university|post-study)/i.test(regionText);
  return /(pr|permanent residence|citizenship|long-term)/i.test(regionText);
}

export default function ExplorePage() {
  const [goal, setGoal] = useState<GoalFilter>("Any");
  const [budget, setBudget] = useState<BudgetFilter>("Any");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("Any");

  const cards = useMemo(() => {
    return REGIONS.map((region) => {
      const regionText = [
        region.name,
        region.shortDescription,
        region.bestFor,
        ...region.pros,
        ...region.cons,
      ].join(" ");
      const goalMatch = matchesGoal(goal, regionText);
      const budgetMatch = budget === "Any" || region.cost === budget;
      const difficultyMatch =
        difficulty === "Any" || region.difficulty === difficulty;
      const isMatch = goalMatch && budgetMatch && difficultyMatch;
      return { region, isMatch };
    });
  }, [goal, budget, difficulty]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Explore
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Explore Immigration Options by Region
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          Quick regional snapshot to compare complexity, costs, and momentum before
          running a profile check.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-soft sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800">Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as GoalFilter)}
            className="w-full rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-800 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option>Any</option>
            <option>Work</option>
            <option>Study</option>
            <option>PR</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800">Budget</span>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value as BudgetFilter)}
            className="w-full rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-800 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option>Any</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800">Difficulty tolerance</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
            className="w-full rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-800 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option>Any</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ region, isMatch }) => (
          <article
            key={region.id}
            className={`flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all ${
              isMatch
                ? "border-accent ring-2 ring-accent/40"
                : "border-slate-200 opacity-45 saturate-50"
            }`}
          >
            <h2 className="text-lg font-semibold text-slate-900">{region.name}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {region.countries.join(", ")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {region.shortDescription}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForCost(region.cost)}`}
              >
                Cost: {region.cost}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForDifficulty(region.difficulty)}`}
              >
                Difficulty: {region.difficulty}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForSpeed(region.speed)}`}
              >
                Speed: {region.speed}
              </span>
            </div>

            <div className="mt-4 text-sm">
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">Best for:</span>{" "}
                {region.bestFor}
              </p>
            </div>

            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-100 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">
                Pros &amp; Cons
              </summary>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-emerald-700">Pros</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                    {region.pros.map((pro) => (
                      <li key={pro}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-rose-700">Cons</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                    {region.cons.map((con) => (
                      <li key={con}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            <div className="mt-5 pt-1">
              <Link
                href={`/form?region=${encodeURIComponent(region.id)}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-indigo-600"
              >
                Check My Chances
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
