export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryableError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "RetryableError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { attempts: number; baseDelayMs: number },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === opts.attempts) break;
      
      let delay = opts.baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      
      // Override delay if the error explicitly provides a Retry-After value
      if (err instanceof RetryableError && err.retryAfterMs) {
        delay = err.retryAfterMs;
      }
      
      // Add jitter to avoid thundering herd
      const jitter = Math.random() * 0.2 * delay;
      await sleep(delay + jitter);
    }
  }
  throw lastErr;
}
