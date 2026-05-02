import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers before importing the route (which calls cookies() at module level via supabase/server).
vi.mock("@/utils/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }),
}));

import { POST } from "@/app/api/score/route";

const VALID_PROFILE = {
  nationality: "Pakistan",
  targetRegion: "canada",
  age: 28,
  education: "master",
  yearsExperience: 4,
  fieldOfWork: "Software Engineer",
  englishTest: "ielts",
  testScore: 7.5,
  savingsUsd: 15000,
  goal: "work",
};

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/score — input validation", () => {
  it("rejects missing nationality", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, nationality: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("rejects out-of-range age", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, age: 120 }));
    expect(res.status).toBe(400);
  });

  it("rejects unknown targetRegion", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, targetRegion: "mars" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid goal", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, goal: "vacation" }));
    expect(res.status).toBe(400);
  });

  it("rejects negative savings", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, savingsUsd: -1 }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/score — rate limiting", () => {
  it("returns 429 after 20 requests from the same IP", async () => {
    const ip = `test-rate-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      await POST(makeRequest(VALID_PROFILE, ip));
    }
    const res = await POST(makeRequest(VALID_PROFILE, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("POST /api/score — OpenAI integration (mocked)", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    pathways: [
                      {
                        _thinking: "Strong: Master's + SE + IELTS 7.5. Weak: no Canadian exp. Range 65-75.",
                        name: "Express Entry",
                        country: "Canada",
                        score: 72,
                        reason: "Strong software engineering background with master's degree and IELTS 7.5 meets Express Entry threshold. No Canadian experience limits CRS.",
                        weaknesses: ["No Canadian work experience", "CRS may not reach current draw cutoff without job offer"],
                        documents: ["IELTS TRF", "Educational credential assessment (WES)", "Work experience letters", "Passport copy"],
                        next_steps: ["Submit profile to Express Entry pool", "Obtain WES ECA", "Apply for provincial nomination"],
                        citations: [{ title: "IRCC Express Entry", url: "https://canada.ca" }],
                        estimated_timeline: "12-18 months",
                        top_improvement: "Obtain a Canadian job offer to add 200 CRS points",
                        score_drivers: ["Master's degree: +12pts", "IELTS 7.5: +10pts", "No Canadian experience: -15pts"],
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  it("returns 200 with pathways for a valid profile", async () => {
    const res = await POST(makeRequest(VALID_PROFILE, `mock-ip-${Date.now()}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.pathways)).toBe(true);
    expect(json.pathways[0].name).toBe("Express Entry");
    expect(json.pathways[0].score).toBe(72);
    expect(json.pathways[0].estimated_timeline).toBe("12-18 months");
    expect(Array.isArray(json.pathways[0].score_drivers)).toBe(true);
    expect(json.pathways[0].top_improvement).toBeTruthy();
    expect(json.pathways[0]._thinking).toBeUndefined();
  });
});
