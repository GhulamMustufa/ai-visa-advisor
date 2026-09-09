import type { StoredResult } from "./storage";
import type { VisaProfile, RankedPathway } from "./types";

export interface DemoPreset {
  id: string;
  title: string;
  badge: string;
  flag: string;
  description: string;
  profile: VisaProfile;
  result: StoredResult;
}

function createPathway(overrides: Partial<RankedPathway> & Pick<RankedPathway, "name" | "country" | "pathwayId" | "baseScore" | "reason" | "weaknesses" | "documents" | "next_steps" | "citations" | "estimated_timeline" | "top_improvement">): RankedPathway {
  return {
    status: overrides.status ?? "CONDITIONALLY_ELIGIBLE",
    maxScore: overrides.maxScore ?? 100,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      eligibilityFit: overrides.baseScore,
      profileStrength: 85,
      evidenceQuality: 90,
      competitiveness: 80,
    },
    satisfiedRequirements: overrides.satisfiedRequirements ?? [
      {
        id: "req-gen-exp",
        type: "hard",
        description: "Standard professional skilled work experience criteria.",
        pointsAwarded: 15,
        met: true,
        scoreImpact: 15,
      },
      {
        id: "req-gen-lang",
        type: "points",
        description: "Official English language test result (IELTS / TOEFL).",
        pointsAwarded: 20,
        met: true,
        scoreImpact: 20,
      },
    ],
    missingRequirements: overrides.missingRequirements ?? [],
    blockingRequirements: overrides.blockingRequirements ?? [],
    marginalImprovements: overrides.marginalImprovements ?? [
      {
        actionName: overrides.top_improvement,
        pointImpact: 10,
        metrics: { cost: 2, time: 3, difficulty: 3, certainty: 4 },
        roiScore: 3.5,
        requirementId: "req-opt",
      },
    ],
    source_freshness: "VERIFIED",
    ...overrides,
  };
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "canada-tech-lead",
    title: "Tech Lead to Canada",
    badge: "Express Entry / GTS",
    flag: "🇨🇦",
    description: "Age 29 • Master's • 6 yrs exp • IELTS 8.0 • $25k USD",
    profile: {
      nationality: "India",
      targetRegion: "canada",
      age: 29,
      education: "master",
      yearsExperience: 6,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 8.0,
      savingsUsd: 25000,
      goal: "pr",
    },
    result: {
      profileSummary: {
        nationality: "India",
        targetRegion: "canada",
        age: 29,
        education: "master",
        yearsExperience: 6,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 8.0,
        savingsUsd: 25000,
        goal: "pr",
      },
      overall_score: 88,
      summary: "Excellent profile for Canadian permanent residency. Under 30 years old, holding a Master's degree and CLB 9+ language score maximizes Federal Skilled Worker human capital points. A Provincial Nomination (PNP) or LMIA job offer guarantees an Invitation to Apply (ITA).",
      pathways: [
        createPathway({
          name: "Express Entry (Federal Skilled Worker)",
          country: "Canada",
          pathwayId: "can-express-entry",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 84,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 92,
            evidenceQuality: 95,
            competitiveness: 82,
          },
          reason: "Scores well above the 67-point FSW eligibility threshold. CRS score is estimated at ~478, which is highly competitive for STEM category-based Express Entry draws.",
          weaknesses: [
            "No direct Canadian inland study or Canadian work experience.",
            "Cutoffs for general (non-category) draws occasionally exceed 500 CRS.",
          ],
          documents: [
            "Educational Credential Assessment (ECA via WES/CES)",
            "IELTS General Training Test Report Form",
            "Proof of Settlement Funds ($14,690+ CAD)",
            "Employment Reference Letters detailing NOC codes",
          ],
          next_steps: [
            "Submit an Educational Credential Assessment (ECA) for your Master's degree.",
            "Create an Express Entry candidate pool profile.",
            "Target Ontario Tech Draw (OINP) and Alberta Express Entry streams.",
          ],
          citations: [
            {
              title: "Federal Skilled Worker Program - IRCC Guidelines",
              url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html",
            },
          ],
          estimated_timeline: "6 - 9 months (after ITA)",
          top_improvement: "Target STEM-targeted Express Entry category draws or Ontario Tech PNP",
        }),
        createPathway({
          name: "Global Talent Stream (Fast-Track Work Permit)",
          country: "Canada",
          pathwayId: "can-gts",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 72,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 90,
            evidenceQuality: 90,
            competitiveness: 80,
          },
          reason: "Software Architecture and Engineering roles fall directly under GTS Category B with expedited 2-week LMIA processing upon receiving an eligible Canadian job offer.",
          weaknesses: [
            "Requires employer sponsorship with ESDC-approved LMIA.",
            "Temporary resident status initially (transitions to PR via CEC within 1 year).",
          ],
          documents: [
            "Passport copy",
            "Degree Transcripts & Certifications",
            "Comprehensive CV / Resume",
            "Formal Job Offer and Employment Contract",
          ],
          next_steps: [
            "Interview with designated Canadian GTS employers.",
            "Obtain expedited Labour Market Impact Assessment.",
          ],
          citations: [
            {
              title: "Global Talent Stream Occupations List - ESDC",
              url: "https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent/requirements.html",
            },
          ],
          estimated_timeline: "2 - 4 weeks processing",
          top_improvement: "Secure GTS Employer Sponsorship",
        }),
      ],
    },
  },
  {
    id: "uk-senior-dev",
    title: "Senior Engineer to UK",
    badge: "Skilled Worker / Global Talent",
    flag: "🇬🇧",
    description: "Age 32 • Bachelor's • 8 yrs exp • IELTS 7.5 • $18k USD",
    profile: {
      nationality: "Nigeria",
      targetRegion: "uk",
      age: 32,
      education: "bachelor",
      yearsExperience: 8,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 7.5,
      savingsUsd: 18000,
      goal: "work",
    },
    result: {
      profileSummary: {
        nationality: "Nigeria",
        targetRegion: "uk",
        age: 32,
        education: "bachelor",
        yearsExperience: 8,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 7.5,
        savingsUsd: 18000,
        goal: "work",
      },
      overall_score: 82,
      summary: "Solid qualification profile for UK Skilled Worker immigration. Language proficiency exceeds B1 requirement, and 8 years of software development experience positions the candidate well above median UK technology wage thresholds (£38,700).",
      pathways: [
        createPathway({
          name: "UK Skilled Worker Visa",
          country: "United Kingdom",
          pathwayId: "uk-skilled-worker",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 80,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 88,
            evidenceQuality: 92,
            competitiveness: 78,
          },
          reason: "Meets English B1 (scored 7.5) and financial maintenance requirements. Requires a formal Certificate of Sponsorship (CoS) from a licensed UK Home Office sponsor meeting the general salary threshold.",
          weaknesses: [
            "Current general salary threshold increased to £38,700/yr.",
            "Immigration Health Surcharge (£1,035/year) requires upfront liquidity.",
          ],
          documents: [
            "Certificate of Sponsorship (CoS) reference number",
            "IELTS UKVI Academic or General Training",
            "Valid Passport with blank pages",
            "Bank statements showing £1,270 maintenance funds for 28 days",
          ],
          next_steps: [
            "Apply to companies on the UK Register of Licensed Sponsors.",
            "Verify prospective salary meets SOC code going rate.",
          ],
          citations: [
            {
              title: "UK Skilled Worker Visa Guidance - GOV.UK",
              url: "https://www.gov.uk/skilled-worker-visa",
            },
          ],
          estimated_timeline: "3 - 8 weeks",
          top_improvement: "Secure job offer with £38,700+ salary from an A-rated UK sponsor",
        }),
        createPathway({
          name: "UK Global Talent (Tech Nation Endorsement)",
          country: "United Kingdom",
          pathwayId: "uk-global-talent",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 68,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 85,
            profileStrength: 82,
            evidenceQuality: 90,
            competitiveness: 75,
          },
          reason: "8 years of engineering experience with lead responsibilities allows pursuit of Exceptional Promise endorsement without needing an employer sponsor.",
          weaknesses: [
            "Requires extensive evidentiary portfolio (reference letters, open-source/patents, speaking).",
            "Strict Tech Nation review criteria.",
          ],
          documents: [
            "3 Letters of Recommendation from recognised tech executives",
            "10 pieces of evidence demonstrating product innovation or significant traction",
            "Detailed CV highlighting leadership metrics",
          ],
          next_steps: [
            "Assemble 10 pieces of evidence showcasing technical impact.",
            "Request endorsement review from Tech Nation.",
          ],
          citations: [
            {
              title: "Global Talent Visa: Digital Technology - GOV.UK",
              url: "https://www.gov.uk/global-talent-digital-technology",
            },
          ],
          estimated_timeline: "4 - 8 weeks for endorsement + 3 weeks visa",
          top_improvement: "Publish or document high-impact product architecture or open-source metrics",
        }),
      ],
    },
  },
  {
    id: "germany-specialist",
    title: "Specialist to Germany",
    badge: "Chancenkarte (Opportunity Card)",
    flag: "🇩🇪",
    description: "Age 27 • Bachelor's • 4 yrs exp • IELTS 7.0 • $15k USD",
    profile: {
      nationality: "Pakistan",
      targetRegion: "germany-nordics",
      age: 27,
      education: "bachelor",
      yearsExperience: 4,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 7.0,
      savingsUsd: 15000,
      goal: "work",
    },
    result: {
      profileSummary: {
        nationality: "Pakistan",
        targetRegion: "germany-nordics",
        age: 27,
        education: "bachelor",
        yearsExperience: 4,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 7.0,
        savingsUsd: 15000,
        goal: "work",
      },
      overall_score: 86,
      summary: "Strong eligibility for Germany's newly launched Chancenkarte (Opportunity Card). The candidate scores 8 out of the required 6 points based on recognized university degree, age under 35, professional experience in a shortage occupation (IT), and C1 English proficiency.",
      pathways: [
        createPathway({
          name: "Opportunity Card (Chancenkarte - Points Route)",
          country: "Germany",
          pathwayId: "de-opportunity-card",
          status: "ELIGIBLE",
          baseScore: 88,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 90,
            evidenceQuality: 92,
            competitiveness: 85,
          },
          reason: "Surpasses the 6-point statutory threshold with 8 verified points: Recognition of foreign degree (4 pts), Age under 35 (2 pts), 2+ years relevant experience (2 pts), B2+ English (1 pt).",
          weaknesses: [
            "Requires establishing a German blocked bank account (Sperrkonto) with ~€12,324.",
            "Valid for 1 year to secure qualified employment in Germany.",
          ],
          documents: [
            "Anabin database statement of comparability (or ZAB Statement)",
            "IELTS test certificate (B2 or C1 level)",
            "Proof of financial self-sufficiency (Sperrkonto blocked account)",
            "Detailed CV in tabular European format (Europass)",
          ],
          next_steps: [
            "Verify university degree compatibility on the official Anabin database.",
            "Open a German blocked account (e.g. Fintiba / Expatrio).",
            "Book an appointment at the German Embassy / Consular mission.",
          ],
          citations: [
            {
              title: "Make it in Germany - Opportunity Card Official Portal",
              url: "https://www.make-it-in-germany.com/en/visa-residence/types/opportunity-card",
            },
          ],
          estimated_timeline: "4 - 8 weeks",
          top_improvement: "Complete German A1/A2 language study to add an extra point and boost hiring prospects",
        }),
        createPathway({
          name: "EU Blue Card (Germany)",
          country: "Germany",
          pathwayId: "de-eu-blue-card",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 75,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 88,
            evidenceQuality: 94,
            competitiveness: 82,
          },
          reason: "IT professionals benefit from lower salary thresholds (€41,041.80/yr in 2024). Once a German contract is signed, the EU Blue Card offers direct settlement permit (PR) after 21-27 months.",
          weaknesses: [
            "Requires a binding German job offer in field of study.",
            "Degree must be recognized as equivalent to a German university degree.",
          ],
          documents: [
            "German Employment Contract or Binding Job Offer",
            "Declaration on the Employment Relationship (Erklärung zum Beschäftigungsverhältnis)",
            "Anabin / ZAB university equivalence certificate",
          ],
          next_steps: [
            "Engage in remote interviews with German tech startups and scaleups.",
            "Confirm salary package exceeds the shortage occupation minimum.",
          ],
          citations: [
            {
              title: "BAMF - EU Blue Card Requirements",
              url: "https://www.bamf.de/EN/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Migrathek/BlaueKarteEU/blauekarteeu-node.html",
            },
          ],
          estimated_timeline: "4 - 6 weeks (after contract)",
          top_improvement: "Target remote hiring platforms for German companies providing relocation support",
        }),
      ],
    },
  },
];

export const DEMO_RESULT: StoredResult = DEMO_PRESETS[0].result;
