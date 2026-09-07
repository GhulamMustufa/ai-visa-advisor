"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { parseStoredResult, RESULT_STORAGE_KEY } from "@/lib/storage";
import type { StoredResult } from "@/lib/storage";
import type { VisaProfile, RankedPathway } from "@/lib/types";
import { PathwayCard } from "@/components/PathwayCard";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { normalizeProfile } from "@/lib/profile";
import { PATHWAY_REGISTRY } from "@/lib/domain";

export default function ResultsPage() {
  const [data, setData] = useState<StoredResult | null | undefined>(undefined);
  const [simulatedProfile, setSimulatedProfile] = useState<VisaProfile | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    const parsed = parseStoredResult(raw);
    setData(parsed);
    if (parsed?.profileSummary) {
      setSimulatedProfile(parsed.profileSummary);
    }
  }, []);

  const handleSimulate = (newProfile: VisaProfile) => {
    setSimulatedProfile(newProfile);
  };

  const handleReset = () => {
    if (data?.profileSummary) {
      setSimulatedProfile(data.profileSummary);
    }
  };

  const simulatedPathways = useMemo(() => {
    if (!data || !simulatedProfile) return [];
    
    // In Pure LLM RAG mode, client-side deterministic simulation is disabled.
    // The simulator UI can remain, but it requires a server round-trip to re-score.
    // For now, just return the static pathways.
    return data.pathways;
  }, [data, simulatedProfile]);

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-600">
        Loading…
      </main>
    );
  }

  if (!data || !simulatedProfile) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Header Area */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
              Decision Support Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Your Visa Strategy
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 leading-relaxed">
              We've evaluated your profile against {simulatedPathways.length} pathways. 
              This dashboard provides an honest look at your eligibility, blockers, and exact next steps.
            </p>
          </div>
          <Link
            href="/form"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-white border border-slate-200 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Start New Assessment
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Sidebar: Applicant Snapshot & Simulator */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            
            {/* Applicant Snapshot */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Applicant Snapshot
              </h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Occupation</p>
                  <p className="font-medium text-slate-900 truncate" title={data.profileSummary.fieldOfWork}>{data.profileSummary.fieldOfWork}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nationality</p>
                  <p className="font-medium text-slate-900">{data.profileSummary.nationality}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Goal</p>
                  <p className="font-medium text-slate-900 uppercase">{data.profileSummary.goal}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Age</p>
                  <p className="font-medium text-slate-900">{data.profileSummary.age} years</p>
                </div>
              </div>
            </section>

            {/* What-If Simulator */}
            <WhatIfSimulator 
              initialProfile={data.profileSummary}
              onChange={handleSimulate}
              onReset={handleReset}
            />

            {/* Disclaimer */}
            <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-100/50">
              <p className="text-xs leading-relaxed text-amber-800">
                <strong>Important:</strong> This tool provides AI-generated guidance based on official thresholds, not legal advice. Always consult an official immigration attorney.
              </p>
            </div>
          </div>

          {/* Main Content Area: Pathways */}
          <div className="lg:col-span-8 space-y-6">
            {simulatedPathways.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <p className="text-slate-500">No pathways matched your criteria.</p>
              </div>
            ) : (
              simulatedPathways.map((pathway, idx) => (
                <PathwayCard key={`${pathway.pathwayId}-${idx}`} pathway={pathway} />
              ))
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
