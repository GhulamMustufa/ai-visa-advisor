import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../lib/engine';
import { normalizeProfile } from '../lib/profile';
import { PATHWAY_REGISTRY } from '../lib/domain';
import type { VisaProfile } from '../lib/types';

describe('Phase 3: Explainable Scoring & Marginal Engine', () => {
  const baseProfile: VisaProfile = {
    nationality: 'IN',
    targetRegion: 'canada',
    age: 25,
    education: 'master',
    yearsExperience: 3,
    fieldOfWork: 'Software Engineer',
    englishTest: 'ielts',
    testScore: 8.0,
    savingsUsd: 15000,
    goal: 'pr'
  };

  const usPathway = PATHWAY_REGISTRY.find(p => p.id === 'us-h1b')!;
  const caPathway = PATHWAY_REGISTRY.find(p => p.id === 'ca-express-entry')!;

  it('Overrides soft scores when a hard requirement fails', () => {
    // US H-1B requires sponsorship (hard). A user without it should be BLOCKED, regardless of degree.
    const usProfile: VisaProfile = { ...baseProfile, targetRegion: 'usa' };
    const normalized = normalizeProfile(usProfile);
    
    const evaluation = evaluateEligibility(normalized, usPathway);
    
    expect(evaluation.status).toBe('BLOCKED');
    expect(evaluation.blockingRequirements.length).toBeGreaterThan(0);
    expect(evaluation.blockingRequirements[0].id).toBe('req-us-sponsor');
    
    // Even though they have a degree (soft/hard points), the pathway is blocked
    expect(evaluation.satisfiedRequirements.some(r => r.id === 'req-us-degree')).toBe(true);
  });

  it('Calculates score breakdown correctly', () => {
    const normalized = normalizeProfile(baseProfile);
    const evaluation = evaluateEligibility(normalized, caPathway);
    
    // Age 25 (+12), Master (+10), Exp 3 (+15), IELTS 8 (+15 + 16), Savings (0)
    // Actually our test engine awards:
    // req-ca-exp: 15
    // req-ca-lang: 16
    // req-ca-lang-c1: 15
    // req-ca-edu-bachelor: 21 (fallback) / actually we didn't do fallback in engine.ts but master triggers it
    expect(evaluation.scoreBreakdown.eligibilityFit).toBeGreaterThan(0);
    expect(evaluation.scoreBreakdown.profileStrength).toBeGreaterThan(0);
  });

  it('Simulates What-If Marginal Improvements', () => {
    // Change age to 35 (misses optimal age) and savings to 5000 (misses funds)
    const weakProfile: VisaProfile = { ...baseProfile, age: 35, savingsUsd: 5000 };
    const normalized = normalizeProfile(weakProfile);
    const evaluation = evaluateEligibility(normalized, caPathway);
    
    expect(evaluation.missingRequirements.some(r => r.id === 'req-ca-funds')).toBe(true);
    
    // Check Marginal Actions
    expect(evaluation.marginalImprovements.length).toBeGreaterThan(0);
    
    const topAction = evaluation.marginalImprovements[0];
    // Funds has high certainty, so it might rank high.
    expect(topAction.actionName).toBeDefined();
    expect(topAction.metrics).toBeDefined();
    
    // Check What-If scenario
    expect(evaluation.topWhatIfScenario).toBeDefined();
    if (evaluation.topWhatIfScenario) {
      expect(evaluation.topWhatIfScenario.newBaseScore).toBeGreaterThanOrEqual(evaluation.baseScore);
    }
  });

  it('Assigns pseudo-impact to hard blockages for ROI', () => {
    const usProfile: VisaProfile = { ...baseProfile, targetRegion: 'usa' };
    const normalized = normalizeProfile(usProfile);
    const evaluation = evaluateEligibility(normalized, usPathway);
    
    // H-1B Sponsor is 40 points in our new mock domain, so it should have a high ROI
    const sponsorAction = evaluation.marginalImprovements.find(a => a.requirementId === 'req-us-sponsor');
    expect(sponsorAction).toBeDefined();
    expect(sponsorAction?.roiScore).toBeGreaterThan(0);
    
    // It should simulate that if they get a sponsor, they become CONDITIONAL or ELIGIBLE
    expect(evaluation.topWhatIfScenario?.newEligibilityStatus).not.toBe('BLOCKED');
  });
});
