export type Education = "high_school" | "bachelor" | "master" | "phd";

export type TargetRegion =
  | "canada"
  | "uk"
  | "australia-new-zealand"
  | "germany-nordics"
  | "southern-europe"
  | "middle-east"
  | "usa"
  | "sg-my"
  | "jp-kr"
  | "easy-entry";

export type EnglishTest = "none" | "ielts" | "toefl";
export type Goal = "work" | "study" | "pr";

export type VisaProfile = {
  nationality: string;
  targetRegion: TargetRegion;
  age: number;
  education: Education;
  yearsExperience: number;
  fieldOfWork: string;
  englishTest: EnglishTest;
  testScore: number | null;
  savingsUsd: number;
  goal: Goal;
};

// --- Phase 1: AI Architecture Domain Models ---
export type CEFRLevel = "none" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type NormalizedProfile = {
  original: VisaProfile;
  canonicalOccupation: string;
  languageLevelCEFR: CEFRLevel;
  isSTEM: boolean;
  isHealthcare: boolean;
};

export type EligibilityStatus = 
  | "ELIGIBLE"
  | "LIKELY_ELIGIBLE"
  | "CONDITIONAL"
  | "NOT_ELIGIBLE"
  | "INSUFFICIENT_EVIDENCE";

export type EligibilityConfidence = "HIGH" | "MEDIUM" | "LOW";
export type RequirementType = "hard" | "conditional" | "points";

export type Requirement = {
  id: string;
  type: RequirementType;
  description: string;
};

export type EvaluatedRequirement = Requirement & {
  met: boolean;
  notes?: string;
};

export type DeterministicEvaluation = {
  pathwayId: string;
  status: EligibilityStatus;
  baseScore: number;
  maxScore: number;
  satisfiedRequirements: EvaluatedRequirement[];
  missingRequirements: EvaluatedRequirement[];
  blockingRequirements: EvaluatedRequirement[];
};

export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type Citation = {
  title: string;
  url: string;
};

export type RankedPathway = DeterministicEvaluation & {
  name: string;
  country: string;
  reason: string;
  weaknesses: string[];
  documents: string[];
  next_steps: string[];
  citations: Citation[];
  estimated_timeline: string;
  top_improvement: string;
  eligibility_confidence: EligibilityConfidence;
  recommendation_confidence: RecommendationConfidence;
  evidence_confidence: RecommendationConfidence;
  source_freshness: DataFreshness;
};

export type ScoreResponse = {
  overall_score: number;
  summary: string;
  pathways: RankedPathway[];
};

// --- Phase 2: Evidence Grounding Models ---

export type AuthorityTier = 1 | 2 | 3 | 4 | 5;
export type DataFreshness = "VERIFIED" | "STALE" | "EXPIRED" | "UNKNOWN";

export type Evidence = {
  id: string;
  source_id: string;
  authority_tier: AuthorityTier;
  country: string;
  jurisdiction?: string;
  pathway?: string;
  claim_type: string;
  effective_from?: string; // ISO String
  effective_until?: string; // ISO String
  retrieved_at: string; // ISO String
  source_url: string;
  source_title: string;
  verification_status: string;
  content_hash: string;
  content: string;
};

export type CitationValidationResult = {
  valid: boolean;
  errors: string[];
};

export type ConflictDetectionResult = {
  hasConflict: boolean;
  conflictingClaims: Evidence[];
  resolvedEvidence: Evidence | null;
  message?: string;
};
