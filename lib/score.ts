import type {
  Education,
  EnglishTest,
  Goal,
  ScoreResponse,
  TargetRegion,
  VisaOption,
  VisaProfile,
} from "./types";

type CatalogEntry = Omit<VisaOption, "eligibilityScore">;

const CANADA_CATALOG: CatalogEntry[] = [
    {
      id: "ee-fsw",
      name: "Express Entry (FSW / CEC)",
      shortDescription:
        "CRS-ranked pool; language, age, education, and Canadian experience drive invitations.",
      highlights: ["CRS competition", "IELTS/CELPIP matter", "Job offer = bonus points"],
    },
    {
      id: "pnp",
      name: "Provincial Nominee (PNP)",
      shortDescription:
        "Province-specific streams—often aligned to occupation demand and intent to reside.",
      highlights: ["Targeted NOC lists", "Can add 600 CRS in EE-linked cases"],
    },
    {
      id: "study-pgwp",
      name: "Study permit → PGWP",
      shortDescription:
        "Credential in Canada, then post-grad work permit; common bridge to PR.",
      highlights: ["Funds + LOA", "PGWP length tied to program"],
    },
    {
      id: "lmia-work",
      name: "Employer-specific work permit",
      shortDescription:
        "Canadian employer support (often LMIA-backed) for temporary skilled work.",
      highlights: ["Employer-led", "LMIA timing varies by role"],
    },
  ];

const UK_CATALOG: CatalogEntry[] = [
    {
      id: "skilled-worker",
      name: "Skilled Worker visa",
      shortDescription:
        "Sponsored skilled role with points for salary, English, skills, and job offer.",
      highlights: ["Licensed sponsor", "IELTS/secure English often required"],
    },
    {
      id: "student-graduate",
      name: "Student → Graduate route",
      shortDescription:
        "CAS-based study, then Graduate visa or switching into Skilled Worker.",
      highlights: ["Maintenance funds", "Genuine student test"],
    },
    {
      id: "global-talent",
      name: "Global Talent",
      shortDescription:
        "For exceptional promise or talent in endorsed fields—portfolio-led.",
      highlights: ["Endorsement", "Evidence-heavy"],
    },
    {
      id: "scale-up",
      name: "Scale-up Worker",
      shortDescription:
        "High-growth UK employer route with salary and sponsorship requirements.",
      highlights: ["Employer eligibility bar", "Fast-track elements"],
    },
  ];

const EU_CATALOG: CatalogEntry[] = [
    {
      id: "eu-blue-card",
      name: "EU Blue Card",
      shortDescription:
        "Highly qualified employment in a member state—degree + salary thresholds.",
      highlights: ["MS-specific salary floors", "Degree recognition"],
    },
    {
      id: "eu-skilled-national",
      name: "National skilled worker permit",
      shortDescription:
        "Each EU country runs employer-tied or points routes; rules differ by member state.",
      highlights: ["Country picker matters", "Contract + qualifications"],
    },
    {
      id: "eu-study",
      name: "Study residence permit",
      shortDescription:
        "University admission, proof of funds, then post-study work options vary by country.",
      highlights: ["Blocked account / funds", "Language requirements vary"],
    },
    {
      id: "eu-jobseeker",
      name: "Job seeker / opportunity visa",
      shortDescription:
        "Short search windows in select states while securing qualified employment.",
      highlights: ["Time-bound", "Often degree-linked"],
    },
  ];

const CATALOG: Record<TargetRegion, CatalogEntry[]> = {
  canada: CANADA_CATALOG,
  uk: UK_CATALOG,
  "australia-new-zealand": EU_CATALOG,
  "germany-nordics": EU_CATALOG,
  "southern-europe": EU_CATALOG,
  "middle-east": EU_CATALOG,
  usa: EU_CATALOG,
  "sg-my": EU_CATALOG,
  "jp-kr": EU_CATALOG,
  "easy-entry": EU_CATALOG,
};

function educationPoints(ed: Education): number {
  switch (ed) {
    case "phd":
      return 26;
    case "master":
      return 20;
    case "bachelor":
      return 14;
    default:
      return 5;
  }
}

function savingsPoints(usd: number): number {
  if (usd >= 80_000) return 22;
  if (usd >= 40_000) return 16;
  if (usd >= 15_000) return 11;
  if (usd >= 5_000) return 6;
  return 2;
}

function englishBlock(test: EnglishTest, score: number | null): number {
  if (test === "none") return 6;
  if (test === "ielts") {
    let pts = 12;
    if (score != null && Number.isFinite(score)) {
      if (score >= 8) pts += 10;
      else if (score >= 7) pts += 5;
      else if (score >= 6) pts += 2;
    }
    return pts;
  }
  /* toefl */
  let pts = 12;
  if (score != null && Number.isFinite(score)) {
    if (score >= 105) pts += 10;
    else if (score >= 90) pts += 5;
    else if (score >= 78) pts += 2;
  }
  return pts;
}

function agePoints(age: number): number {
  if (age >= 20 && age <= 29) return 12;
  if (age >= 30 && age <= 39) return 9;
  if (age >= 40 && age <= 44) return 5;
  return 2;
}

function goalBoost(optionId: string, goal: Goal): number {
  if (goal === "study") {
    if (optionId.includes("study") || optionId === "student-graduate") return 14;
    if (optionId === "ee-fsw" || optionId === "skilled-worker") return -4;
  }
  if (goal === "pr") {
    if (["ee-fsw", "pnp", "eu-blue-card"].includes(optionId)) return 12;
    if (optionId === "study-pgwp" || optionId === "student-graduate") return 6;
  }
  if (goal === "work") {
    if (["lmia-work", "skilled-worker", "eu-skilled-national", "scale-up"].includes(optionId))
      return 12;
    if (optionId.includes("study")) return -6;
  }
  return 0;
}

function optionModifier(optionId: string, profile: VisaProfile, base: number): number {
  let d = goalBoost(optionId, profile.goal);

  if (profile.yearsExperience >= 8) d += 10;
  else if (profile.yearsExperience >= 4) d += 6;
  else if (profile.yearsExperience >= 1) d += 3;

  if (profile.fieldOfWork.trim().length >= 3) d += 2;

  if (["global-talent", "eu-blue-card"].includes(optionId)) {
    if (profile.education === "phd" || profile.education === "master") d += 6;
  }

  if (optionId === "ee-fsw" && profile.age > 44) d -= 8;
  if (optionId === "pnp" && profile.savingsUsd < 8_000) d -= 4;

  return Math.min(100, Math.max(10, base + d));
}

function scoreOption(entry: CatalogEntry, profile: VisaProfile): VisaOption {
  const base =
    educationPoints(profile.education) +
    savingsPoints(profile.savingsUsd) +
    englishBlock(profile.englishTest, profile.testScore) +
    agePoints(profile.age);

  return {
    ...entry,
    eligibilityScore: optionModifier(entry.id, profile, base),
  };
}

function buildSummary(profile: VisaProfile, overall: number, top: VisaOption | undefined): string {
  const goalLabel =
    profile.goal === "pr" ? "permanent residence" : profile.goal === "study" ? "study" : "work";
  const strength =
    overall >= 72
      ? "competitive for several realistic routes on this demo model"
      : overall >= 52
        ? "plausible with documentation and the right program fit"
        : "early—tighten language, funds, or skilled signals before filing anything";

  const lead = top
    ? `Top route in this snapshot: ${top.name} (${top.eligibilityScore}/100).`
    : "Review the ranked options below.";

  return `${lead} For ${goalLabel} in your selected region, overall strength reads ${strength}. Demo only—not legal advice.`;
}

export function computeVisaScore(profile: VisaProfile): ScoreResponse {
  const catalog = CATALOG[profile.targetRegion];
  const options = catalog
    .map((e) => scoreOption(e, profile))
    .sort((a, b) => b.eligibilityScore - a.eligibilityScore);

  const overallScore = Math.round(
    options.slice(0, 3).reduce((s, o) => s + o.eligibilityScore, 0) /
      Math.min(3, options.length),
  );

  return {
    overallScore,
    summary: buildSummary(profile, overallScore, options[0]),
    options,
  };
}
