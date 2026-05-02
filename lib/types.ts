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
  /** IELTS ~0–9, TOEFL ~0–120; null if not provided */
  testScore: number | null;
  savingsUsd: number;
  goal: Goal;
};

export type Citation = {
  title: string;
  url: string;
};

export type Pathway = {
  name: string;
  country: string;
  score: number;
  reason: string;
  weaknesses: string[];
  documents: string[];
  next_steps: string[];
  citations: Citation[];
  estimated_timeline: string;
  top_improvement: string;
  score_drivers: string[];
};

export type VisaOption = {
  id: string;
  name: string;
  shortDescription: string;
  eligibilityScore: number;
  highlights: string[];
};

export type ScoreResponse = {
  overallScore: number;
  summary: string;
  options: VisaOption[];
};
