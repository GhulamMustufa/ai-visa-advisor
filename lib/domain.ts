import type { Requirement, TargetRegion } from "./types";

export type PathwayDomain = {
  id: string;
  region: TargetRegion;
  country: string;
  name: string;
  shortDescription: string;
  requirements: Requirement[];
  baseScoreThreshold?: number; // Minimum score needed if it's a points-based system
};

export const PATHWAY_REGISTRY: PathwayDomain[] = [
  {
    id: "ca-express-entry",
    region: "canada",
    country: "Canada",
    name: "Express Entry (FSW / CEC)",
    shortDescription: "Points-based federal route favoring skilled workers with strong language and education.",
    baseScoreThreshold: 67, // FSW 67 points grid
    requirements: [
      {
        id: "req-ca-exp",
        type: "hard",
        description: "Minimum 1 year of continuous skilled work experience (TEER 0, 1, 2, or 3).",
      },
      {
        id: "req-ca-lang",
        type: "hard",
        description: "Minimum language level of CLB 7 (IELTS 6.0 in all bands or CEFR B2).",
      },
      {
        id: "req-ca-funds",
        type: "conditional",
        description: "Proof of settlement funds (approx $10k+ USD) unless currently working in Canada.",
      },
      {
        id: "req-ca-edu",
        type: "points",
        description: "Educational credential assessment (ECA) required for foreign degrees.",
      }
    ]
  },
  {
    id: "uk-skilled-worker",
    region: "uk",
    country: "UK",
    name: "Skilled Worker Visa",
    shortDescription: "Employer-sponsored route requiring a confirmed job offer and minimum salary.",
    requirements: [
      {
        id: "req-uk-sponsor",
        type: "hard",
        description: "Must hold a Certificate of Sponsorship from a licensed UK employer.",
      },
      {
        id: "req-uk-salary",
        type: "hard",
        description: "Minimum salary threshold (£38,700/yr general, lower if under 26 or shortage).",
      },
      {
        id: "req-uk-lang",
        type: "hard",
        description: "English language proficiency of at least CEFR B1 (IELTS 4.0).",
      },
      {
        id: "req-uk-funds",
        type: "conditional",
        description: "Maintenance funds (£1,270) unless sponsor certifies maintenance.",
      }
    ]
  },
  {
    id: "au-skilled-independent",
    region: "australia-new-zealand",
    country: "Australia",
    name: "Skilled Independent Visa (Subclass 189)",
    shortDescription: "Points-tested visa for invited workers with occupations on the relevant skills list.",
    baseScoreThreshold: 65,
    requirements: [
      {
        id: "req-au-age",
        type: "hard",
        description: "Must be under 45 years of age when invited.",
      },
      {
        id: "req-au-occ",
        type: "hard",
        description: "Occupation must be on the Medium and Long-term Strategic Skills List (MLTSSL).",
      },
      {
        id: "req-au-lang",
        type: "hard",
        description: "Competent English (IELTS 6.0 or CEFR B2).",
      },
      {
        id: "req-au-skills",
        type: "hard",
        description: "Positive skills assessment from the relevant assessing authority.",
      }
    ]
  },
  {
    id: "us-h1b",
    region: "usa",
    country: "USA",
    name: "H-1B Specialty Occupation",
    shortDescription: "Employer-sponsored nonimmigrant visa for specialized roles requiring a degree.",
    requirements: [
      {
        id: "req-us-sponsor",
        type: "hard",
        description: "U.S. employer sponsorship required.",
      },
      {
        id: "req-us-degree",
        type: "hard",
        description: "Minimum of a Bachelor's degree or equivalent in a related field.",
      },
      {
        id: "req-us-lottery",
        type: "conditional",
        description: "Subject to annual lottery cap unless the employer is cap-exempt.",
      }
    ]
  }
];

export function getPathwaysForRegion(region: TargetRegion): PathwayDomain[] {
  // In a real expanded system, we would have coverage for all regions. 
  // For the demonstration, we'll return all available pathways if the specific region isn't mocked yet,
  // or return the exact region match.
  const matched = PATHWAY_REGISTRY.filter(p => p.region === region);
  return matched.length > 0 ? matched : PATHWAY_REGISTRY;
}
