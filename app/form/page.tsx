"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Education, EnglishTest, Goal, TargetRegion } from "@/lib/types";
import { RESULT_STORAGE_KEY } from "@/lib/storage";
import { pushRecentSubmission } from "@/lib/submissions";

const REGIONS: { id: string; value: TargetRegion; label: string }[] = [
  { id: "canada", value: "canada", label: "Canada" },
  { id: "uk", value: "uk", label: "UK" },
  { id: "australia-new-zealand", value: "australia-new-zealand", label: "Australia/New Zealand" },
  { id: "germany-nordics", value: "germany-nordics", label: "Germany/Northern Europe" },
  { id: "southern-europe", value: "southern-europe", label: "Southern Europe" },
  { id: "middle-east", value: "middle-east", label: "Middle East" },
  { id: "usa", value: "usa", label: "USA" },
  { id: "sg-my", value: "sg-my", label: "Singapore/Malaysia" },
  { id: "jp-kr", value: "jp-kr", label: "Japan/South Korea" },
  { id: "easy-entry", value: "easy-entry", label: "Easy Entry Countries" },
];

const REGION_QUERY_MAP: Record<string, { targetRegion: TargetRegion; label: string }> = {
  canada: { targetRegion: "canada", label: "Canada" },
  uk: { targetRegion: "uk", label: "UK" },
  "australia-new-zealand": { targetRegion: "australia-new-zealand", label: "Australia/New Zealand" },
  "germany-nordics": { targetRegion: "germany-nordics", label: "Germany/Northern Europe" },
  "southern-europe": { targetRegion: "southern-europe", label: "Southern Europe" },
  "middle-east": { targetRegion: "middle-east", label: "Middle East" },
  usa: { targetRegion: "usa", label: "USA" },
  "sg-my": { targetRegion: "sg-my", label: "Singapore/Malaysia" },
  "jp-kr": { targetRegion: "jp-kr", label: "Japan/South Korea" },
  "easy-entry": { targetRegion: "easy-entry", label: "Easy Entry Countries" },
  "canada-uk": { targetRegion: "canada", label: "Canada/UK" },
};

const STEPS = [
  { id: 1, title: "You & destination", short: "About" },
  { id: 2, title: "Background", short: "Profile" },
  { id: 3, title: "Language & goal", short: "Finish" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-[var(--ring)]";

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegionLabel, setSelectedRegionLabel] = useState<string | null>(null);
  const [targetRegionValue, setTargetRegionValue] = useState<TargetRegion>("canada");
  const submitByButtonRef = useRef(false);

  const progressPct = useMemo(() => (step / STEPS.length) * 100, [step]);

  useEffect(() => {
    const rawRegion = new URLSearchParams(window.location.search).get("region");
    if (!rawRegion) return;
    const mapped = REGION_QUERY_MAP[rawRegion];
    if (!mapped) return;
    setSelectedRegionLabel(mapped.label);
    setTargetRegionValue(mapped.targetRegion);
  }, []);

  function validateStep1(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!String(fd.get("nationality") ?? "").trim()) return "Enter your nationality.";
    if (!fd.get("targetRegion")) return "Pick a target region.";
    const age = Number(fd.get("age"));
    if (!Number.isFinite(age) || age < 18 || age > 80) return "Age must be between 18 and 80.";
    return null;
  }

  function validateStep2(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!fd.get("education")) return "Select education level.";
    const y = Number(fd.get("yearsExperience"));
    if (!Number.isFinite(y) || y < 0 || y > 60) return "Years of experience must be 0–60.";
    if (!String(fd.get("fieldOfWork") ?? "").trim()) return "Enter your field of work.";
    return null;
  }

  function validateStep3(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!fd.get("englishTest")) return "Select an English test option.";
    const s = Number(fd.get("savingsUsd"));
    if (!Number.isFinite(s) || s < 0) return "Enter savings in USD (0 or more).";
    if (!fd.get("goal")) return "Select a goal.";
    const test = String(fd.get("englishTest"));
    const scoreRaw = String(fd.get("testScore") ?? "").trim();
    if (scoreRaw && test === "ielts") {
      const sc = Number(scoreRaw);
      if (!Number.isFinite(sc) || sc < 0 || sc > 9) return "IELTS overall band is usually 0–9.";
    }
    if (scoreRaw && test === "toefl") {
      const sc = Number(scoreRaw);
      if (!Number.isFinite(sc) || sc < 0 || sc > 120) return "TOEFL iBT total is typically 0–120.";
    }
    return null;
  }

  function next() {
    const form = document.getElementById("visa-form") as HTMLFormElement | null;
    if (!form) return;
    setError(null);
    if (step === 1) {
      const e = validateStep1(form);
      if (e) {
        setError(e);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const e = validateStep2(form);
      if (e) {
        setError(e);
        return;
      }
      setStep(3);
    }
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    if (step !== 3) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "textarea") return;
    e.preventDefault();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submitByButtonRef.current) {
      return;
    }
    submitByButtonRef.current = false;
    setError(null);
    const form = e.currentTarget;
    const e1 = validateStep1(form);
    if (e1) {
      setError(e1);
      setStep(1);
      return;
    }
    const e2 = validateStep2(form);
    if (e2) {
      setError(e2);
      setStep(2);
      return;
    }
    const e3 = validateStep3(form);
    if (e3) {
      setError(e3);
      return;
    }

    const fd = new FormData(form);
    const nationality = String(fd.get("nationality") ?? "").trim();
    const targetRegion = fd.get("targetRegion") as TargetRegion;
    const age = Number(fd.get("age"));
    const education = fd.get("education") as Education;
    const yearsExperience = Number(fd.get("yearsExperience"));
    const fieldOfWork = String(fd.get("fieldOfWork") ?? "").trim();
    const englishTest = fd.get("englishTest") as EnglishTest;
    const scoreStr = String(fd.get("testScore") ?? "").trim();
    const testScore =
      scoreStr === "" || englishTest === "none" ? null : Number(scoreStr);
    const savingsUsd = Number(fd.get("savingsUsd"));
    const goal = fd.get("goal") as Goal;

    setSubmitting(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationality,
          targetRegion,
          age,
          education,
          yearsExperience,
          fieldOfWork,
          englishTest,
          testScore,
          savingsUsd,
          goal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        setSubmitting(false);
        return;
      }
      if (!Array.isArray(data.pathways)) {
        setError("Unexpected response");
        setSubmitting(false);
        return;
      }
      sessionStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify({
          pathways: data.pathways,
          profileSummary: {
            nationality,
            targetRegion,
            age,
            education,
            yearsExperience,
            fieldOfWork,
            englishTest,
            testScore,
            savingsUsd,
            goal,
          },
        }),
      );
      const logEntry = {
        submittedAt: new Date().toISOString(),
        nationality,
        targetRegion,
        goal,
        fieldOfWork,
      };
      pushRecentSubmission(logEntry);
      router.push("/results");
    } catch {
      setError("Network error—try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Assessment
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Visa profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Single column, a few steps. Demo scoring only—not immigration advice.
        </p>
        {selectedRegionLabel ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-800">
            Selected region: <span className="font-semibold">{selectedRegionLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        <div className="mb-3 flex justify-between text-xs font-medium text-slate-500">
          <span>
            Step {step} of {STEPS.length}
          </span>
          <span className="text-slate-700">{STEPS[step - 1]?.title}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors ${
                step === s.id
                  ? "border-accent bg-[var(--accent-soft)] text-indigo-950"
                  : step > s.id
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-slate-100 bg-white text-slate-400"
              }`}
            >
              {s.short}
            </div>
          ))}
        </div>
      </div>

      <form
        id="visa-form"
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="space-y-6"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-card p-6 shadow-soft">
          {/* Keep all inputs mounted so final submit includes every field */}
          <div className={step === 1 ? "space-y-5" : "hidden"} aria-hidden={step !== 1}>
            <div>
              <label htmlFor="nationality" className="text-sm font-medium text-slate-800">
                Nationality
              </label>
              <input
                id="nationality"
                name="nationality"
                required
                defaultValue="Pakistan"
                autoComplete="country-name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="targetRegion" className="text-sm font-medium text-slate-800">
                Target region
              </label>
              <select
                id="targetRegion"
                name="targetRegion"
                required
                value={targetRegionValue}
                onChange={(e) => setTargetRegionValue(e.target.value as TargetRegion)}
                className={inputClass}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="age" className="text-sm font-medium text-slate-800">
                Age
              </label>
              <input
                id="age"
                name="age"
                type="number"
                required
                min={18}
                max={80}
                defaultValue={28}
                className={inputClass}
              />
            </div>
          </div>

          <div className={step === 2 ? "space-y-5" : "hidden"} aria-hidden={step !== 2}>
            <div>
              <label htmlFor="education" className="text-sm font-medium text-slate-800">
                Education level
              </label>
              <select
                id="education"
                name="education"
                required
                defaultValue="bachelor"
                className={inputClass}
              >
                <option value="high_school">High School</option>
                <option value="bachelor">Bachelor</option>
                <option value="master">Master</option>
                <option value="phd">PhD</option>
              </select>
            </div>
            <div>
              <label htmlFor="yearsExperience" className="text-sm font-medium text-slate-800">
                Years of work experience
              </label>
              <input
                id="yearsExperience"
                name="yearsExperience"
                type="number"
                required
                min={0}
                max={60}
                defaultValue={4}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fieldOfWork" className="text-sm font-medium text-slate-800">
                Field of work
              </label>
              <input
                id="fieldOfWork"
                name="fieldOfWork"
                required
                placeholder="e.g. Civil engineering, nursing, software"
                className={inputClass}
              />
            </div>
          </div>

          <div className={step === 3 ? "space-y-5" : "hidden"} aria-hidden={step !== 3}>
            <div>
              <label htmlFor="englishTest" className="text-sm font-medium text-slate-800">
                English test
              </label>
              <select
                id="englishTest"
                name="englishTest"
                required
                defaultValue="none"
                className={inputClass}
              >
                <option value="none">None</option>
                <option value="ielts">IELTS</option>
                <option value="toefl">TOEFL</option>
              </select>
            </div>
            <div>
              <label htmlFor="testScore" className="text-sm font-medium text-slate-800">
                Test score <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="testScore"
                name="testScore"
                type="number"
                min={0}
                max={120}
                step={0.5}
                placeholder="IELTS band or TOEFL total"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave blank if no test yet. Use overall band for IELTS (e.g. 7.5) or total for
                TOEFL (e.g. 100).
              </p>
            </div>
            <div>
              <label htmlFor="savingsUsd" className="text-sm font-medium text-slate-800">
                Savings (USD)
              </label>
              <input
                id="savingsUsd"
                name="savingsUsd"
                type="number"
                required
                min={0}
                step={100}
                defaultValue={12000}
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-slate-800">Goal</legend>
              <div className="mt-3 flex flex-col gap-2">
                {(
                  [
                    { value: "work" as const, label: "Work" },
                    { value: "study" as const, label: "Study" },
                    { value: "pr" as const, label: "PR" },
                  ] as const
                ).map((g) => (
                  <label
                    key={g.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 has-[:checked]:border-accent has-[:checked]:bg-[var(--accent-soft)]"
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g.value}
                      defaultChecked={g.value === "pr"}
                      required
                      className="h-4 w-4 border-slate-300 text-accent focus:ring-accent"
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="order-3 text-center text-sm text-slate-600 hover:text-slate-900 sm:order-1 sm:text-left"
          >
            ← Home
          </Link>
          <div className="order-1 flex w-full gap-2 sm:order-2 sm:w-auto sm:justify-end">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:flex-none"
              >
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-soft hover:bg-indigo-600 sm:flex-none"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                onClick={() => {
                  submitByButtonRef.current = true;
                }}
                disabled={submitting}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-soft hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {submitting ? "Checking…" : "Check My Chances"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
