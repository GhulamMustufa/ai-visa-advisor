export class CircuitBreaker {
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private failureCount: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private nextAttemptMs: number = 0;

  constructor(failureThreshold: number = 5, resetTimeoutMs: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttemptMs) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptMs = Date.now() + this.resetTimeoutMs;
      console.warn(`[CIRCUIT BREAKER] Tripped OPEN! Will reset in ${this.resetTimeoutMs / 1000}s`);
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.nextAttemptMs = 0;
  }
}

// Global singleton for OpenAI dependency
export const openAiCircuitBreaker = new CircuitBreaker(5, 60000);
