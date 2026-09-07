export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerAdapter {
  getState(): Promise<CircuitBreakerState>;
  isOpen(): Promise<boolean>;
  recordSuccess(): Promise<void>;
  recordFailure(): Promise<void>;
  reset(): Promise<void>;
}

/**
 * In-Memory Adapter for the Circuit Breaker.
 * WARNING: In a Next.js Serverless environment (like Vercel), this in-memory 
 * state will reset on cold starts and will not be shared across edge nodes.
 * For production, implement a `RedisCircuitBreakerAdapter` using Vercel KV.
 */
export class InMemoryCircuitBreakerAdapter implements CircuitBreakerAdapter {
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private failureCount: number = 0;
  private state: CircuitBreakerState = "CLOSED";
  private nextAttemptMs: number = 0;

  constructor(failureThreshold: number = 5, resetTimeoutMs: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  async getState(): Promise<CircuitBreakerState> {
    return this.state;
  }

  async isOpen(): Promise<boolean> {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttemptMs) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }

  async recordSuccess(): Promise<void> {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  async recordFailure(): Promise<void> {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptMs = Date.now() + this.resetTimeoutMs;
      console.warn(`[CIRCUIT BREAKER] Tripped OPEN! Will reset in ${this.resetTimeoutMs / 1000}s`);
    }
  }

  async reset(): Promise<void> {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.nextAttemptMs = 0;
  }
}

// Global singleton instance (InMemory for MVP, swap to Redis for Prod)
export const openAiCircuitBreaker: CircuitBreakerAdapter = new InMemoryCircuitBreakerAdapter(5, 60000);
