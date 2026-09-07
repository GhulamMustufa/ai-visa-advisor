import type { StoredResult } from "./storage";

export const DEMO_RESULT: StoredResult = {
  profileSummary: {
    nationality: "India",
    targetRegion: "canada",
    age: 28,
    education: "master",
    yearsExperience: 5,
    fieldOfWork: "Software Engineer",
    englishTest: "ielts",
    testScore: 7.5,
    savingsUsd: 15000,
    goal: "work"
  },
  overall_score: 85,
  summary: "This profile has strong foundational elements for skilled migration. High language proficiency and a Master's degree in a STEM field provide a significant advantage, particularly for point-based systems like Express Entry. The primary bottleneck is the lack of a sponsored job offer.",
  pathways: [
    {
      name: "Express Entry (FSW)",
      country: "Canada",
      pathwayId: "can-express-entry",
      status: "CONDITIONALLY_ELIGIBLE",
      baseScore: 78,
      maxScore: 100,
      scoreBreakdown: {
        eligibilityFit: 100,
        profileStrength: 85,
        evidenceQuality: 90,
        competitiveness: 75
      },
      reason: "Meets all minimum requirements for the Federal Skilled Worker program. However, current CRS cutoffs require either higher French language proficiency, provincial nomination, or a valid job offer to guarantee an Invitation to Apply (ITA).",
      weaknesses: [
        "No Canadian work experience",
        "CRS score is slightly below the latest general draw cutoffs (~500+)"
      ],
      documents: [
        "Educational Credential Assessment (ECA)",
        "IELTS Test Report Form",
        "Proof of Funds (Bank Statements)",
        "Employment Reference Letters"
      ],
      next_steps: [
        "Create an Express Entry profile to enter the pool.",
        "Actively apply for Canadian jobs to secure a valid job offer (LMIA-backed).",
        "Monitor Provincial Nominee Programs (PNPs) targeting tech professionals."
      ],
      citations: [
        {
          title: "Federal Skilled Worker Program - Eligibility",
          url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html"
        }
      ],
      estimated_timeline: "6 - 12 months (if ITA received)",
      top_improvement: "Get a valid Canadian job offer",
      source_freshness: "VERIFIED",
      satisfiedRequirements: [
        {
          id: "req-fsw-exp",
          type: "hard",
          description: "Minimum 1 year of continuous full-time skilled work experience.",
          pointsAwarded: 0,
          met: true,
          scoreImpact: 0
        },
        {
          id: "req-fsw-edu",
          type: "points",
          description: "Master's degree level education.",
          pointsAwarded: 23,
          met: true,
          scoreImpact: 23
        },
        {
          id: "req-fsw-lang",
          type: "points",
          description: "CLB 9 in all English abilities (IELTS 7.0+).",
          pointsAwarded: 29,
          met: true,
          scoreImpact: 29
        }
      ],
      missingRequirements: [
        {
          id: "req-fsw-job",
          type: "conditional",
          description: "Valid job offer supported by a Labour Market Impact Assessment (LMIA).",
          pointsAwarded: 15,
          resolutionActionName: "Secure Canadian Job Offer",
          actionMetrics: { cost: 1, time: 4, difficulty: 5, certainty: 5 },
          met: false,
          scoreImpact: 0
        }
      ],
      blockingRequirements: [],
      marginalImprovements: [
        {
          actionName: "Secure Canadian Job Offer",
          pointImpact: 15,
          metrics: { cost: 1, time: 4, difficulty: 5, certainty: 5 },
          roiScore: 4.5,
          requirementId: "req-fsw-job"
        },
        {
          actionName: "Learn French to NCLC 7",
          pointImpact: 10,
          metrics: { cost: 3, time: 5, difficulty: 4, certainty: 4 },
          roiScore: 2.2,
          requirementId: "req-fsw-french"
        }
      ],
      topWhatIfScenario: {
        targetAction: {
          actionName: "Secure Canadian Job Offer",
          pointImpact: 15,
          metrics: { cost: 1, time: 4, difficulty: 5, certainty: 5 },
          roiScore: 4.5,
          requirementId: "req-fsw-job"
        },
        newEligibilityStatus: "ELIGIBLE",
        newBaseScore: 93
      }
    },
    {
      name: "Global Talent Stream",
      country: "Canada",
      pathwayId: "can-gts",
      status: "CONDITIONALLY_ELIGIBLE",
      baseScore: 60,
      maxScore: 100,
      scoreBreakdown: {
        eligibilityFit: 100,
        profileStrength: 90,
        evidenceQuality: 95,
        competitiveness: 85
      },
      reason: "Software Engineers are highly sought after under the Global Talent Stream. This provides a fast-track 2-week work permit processing time. However, it requires a designated employer to sponsor you.",
      weaknesses: [
        "Strictly requires an employer sponsor.",
        "Does not grant permanent residency directly (it is a temporary work permit)."
      ],
      documents: [
        "Passport",
        "Degree Certificates",
        "Detailed Resume",
        "Job Offer Letter (when secured)"
      ],
      next_steps: [
        "Focus job search on Canadian employers designated under the Global Talent Stream.",
        "Prepare for technical interviews."
      ],
      citations: [
        {
          title: "Global Talent Stream - ESDC",
          url: "https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent/requirements.html"
        }
      ],
      estimated_timeline: "4 - 8 weeks (after job offer)",
      top_improvement: "Secure GTS Employer Sponsorship",
      source_freshness: "VERIFIED",
      satisfiedRequirements: [
        {
          id: "req-gts-occ",
          type: "hard",
          description: "Occupation must be on the Global Talent Occupations List (e.g., Software Engineer).",
          pointsAwarded: 0,
          met: true,
          scoreImpact: 0
        }
      ],
      missingRequirements: [
        {
          id: "req-gts-offer",
          type: "hard",
          description: "Job offer from a Canadian employer with an approved GTS Labour Market Impact Assessment.",
          pointsAwarded: 50,
          resolutionActionName: "Secure GTS Employer Sponsorship",
          actionMetrics: { cost: 1, time: 3, difficulty: 4, certainty: 5 },
          met: false,
          scoreImpact: 0
        }
      ],
      blockingRequirements: [
        {
          id: "req-gts-offer",
          type: "hard",
          description: "Job offer from a Canadian employer with an approved GTS Labour Market Impact Assessment.",
          pointsAwarded: 50,
          resolutionActionName: "Secure GTS Employer Sponsorship",
          actionMetrics: { cost: 1, time: 3, difficulty: 4, certainty: 5 },
          met: false,
          scoreImpact: 0
        }
      ],
      marginalImprovements: [
        {
          actionName: "Secure GTS Employer Sponsorship",
          pointImpact: 50,
          metrics: { cost: 1, time: 3, difficulty: 4, certainty: 5 },
          roiScore: 8.5,
          requirementId: "req-gts-offer"
        }
      ],
      topWhatIfScenario: {
        targetAction: {
          actionName: "Secure GTS Employer Sponsorship",
          pointImpact: 50,
          metrics: { cost: 1, time: 3, difficulty: 4, certainty: 5 },
          roiScore: 8.5,
          requirementId: "req-gts-offer"
        },
        newEligibilityStatus: "ELIGIBLE",
        newBaseScore: 110
      }
    }
  ]
};
