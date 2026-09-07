type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

export function log(level: LogLevel, event: string, meta: LogMeta = {}): void {
  const { traceId, spanId, ...attributes } = meta;
  
  const payload = {
    timestamp: new Date().toISOString(),
    severity: level.toUpperCase(),
    name: event,
    trace_id: traceId ?? null,
    span_id: spanId ?? null,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
