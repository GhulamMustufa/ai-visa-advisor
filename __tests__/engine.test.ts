import { describe, it, expect } from "vitest";
import { evaluateEligibility } from "../lib/engine";
import { normalizeProfile } from "../lib/profile";
import type { VisaProfile, PathwayDomain } from "../lib/types";

describe("Deterministic Decision Engine", () => {
  const dummyPathway: PathwayDomain = {
    id: "test-pathway",
    name: "Test Pathway",
    country: "canada",
    requirements: [
      { id: "req-ca-funds", type: "hard", property: "savingsUsd", operator: ">=", value: 10000, pointsAwarded: 0, description: "Must have $10k" },
      { id: "req-ca-lang", type: "points", property: "languageLevelCEFR", operator: ">=", value: "B2", pointsAwarded: 20, description: "B2 English", resolutionActionName: "Improve English to B2", actionMetrics: { cost: 1, time: 2, difficulty: 2, certainty: 1 } },
      { id: "req-ca-edu-master", type: "points", property: "education", operator: "IN", value: ["master", "phd"], pointsAwarded: 15, description: "Master/PhD" },
      { id: "req-ca-age-optimal", type: "conditional", property: "age", operator: "<", value: 30, pointsAwarded: 5, description: "Under 30" }
    ]
  };

  it("should evaluate hard requirements correctly (BLOCKED)", () => {
    const rawProfile: VisaProfile = {
      nationality: "India", targetRegion: "canada", age: 25, education: "master",
      yearsExperience: 5, fieldOfWork: "Software", englishTest: "ielts", testScore: 7,
      savingsUsd: 5000, goal: "work" // Fails $10k hard requirement
    };
    const np = normalizeProfile(rawProfile);
    const result = evaluateEligibility(np, dummyPathway);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockingRequirements.length).toBe(1);
    expect(result.blockingRequirements[0].property).toBe("savingsUsd");
  });

  it("should evaluate points correctly (ELIGIBLE)", () => {
    const rawProfile: VisaProfile = {
      nationality: "India", targetRegion: "canada", age: 25, education: "master",
      yearsExperience: 5, fieldOfWork: "Software", englishTest: "ielts", testScore: 7, // C1 -> B2 satisfied
      savingsUsd: 15000, goal: "work"
    };
    const np = normalizeProfile(rawProfile);
    const result = evaluateEligibility(np, dummyPathway);

    expect(result.status).toBe("ELIGIBLE");
    expect(result.baseScore).toBe(20 + 15 + 5); // B2 (20), Master (15), Under 30 (5)
  });

  it("should generate what-if scenarios for missing point thresholds", () => {
    const rawProfile: VisaProfile = {
      nationality: "India", targetRegion: "canada", age: 35, education: "bachelor",
      yearsExperience: 5, fieldOfWork: "Software", englishTest: "none", testScore: null,
      savingsUsd: 15000, goal: "work"
    };
    const np = normalizeProfile(rawProfile);
    const result = evaluateEligibility(np, dummyPathway);

    expect(result.status).toBe("CONDITIONALLY_ELIGIBLE"); 
    expect(result.baseScore).toBe(0); 
    
    // Missing B2 (+20) and Master (+15) and Under 30 (+5)
    expect(result.missingRequirements.length).toBe(3);
    
    // Top what-if should be the one with the highest score impact (B2 English)
    expect(result.topWhatIfScenario?.targetAction.actionName).toBe("Improve English to B2");
    expect(result.topWhatIfScenario?.newBaseScore).toBe(20);
  });
});
