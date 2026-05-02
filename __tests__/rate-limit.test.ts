import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows the first request", () => {
    const result = checkRateLimit("ip-1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    const r1 = checkRateLimit("ip-2");
    const r2 = checkRateLimit("ip-2");
    expect(r1.remaining).toBe(19);
    expect(r2.remaining).toBe(18);
  });

  it("blocks after 20 requests within the window", () => {
    const key = "ip-block-test";
    for (let i = 0; i < 20; i++) checkRateLimit(key);
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the 60-second window expires", () => {
    const key = "ip-reset-test";
    for (let i = 0; i < 20; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit(key).allowed).toBe(true);
  });

  it("isolates buckets per key", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("ip-a");
    expect(checkRateLimit("ip-a").allowed).toBe(false);
    expect(checkRateLimit("ip-b").allowed).toBe(true);
  });
});
