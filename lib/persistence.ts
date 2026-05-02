import { Pool } from "pg";
import type { VisaProfile } from "./types";

export type UserSubscription = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: "free" | "pro";
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: string | null;
};

type PersistedResult = {
  pathways: Array<{
    name: string;
    country: string;
    score: number;
    reason: string;
    weaknesses: string[];
    documents: string[];
    next_steps: string[];
    citations?: Array<{ title: string; url: string }>;
  }>;
};

export type HistoryItem = {
  id: number;
  requestId: string;
  createdAt: string;
  promptVersion: string;
  model: string;
  profile: VisaProfile;
  result: PersistedResult;
};

let pool: Pool | null = null;

function normalizeConnectionString(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("uselibpqcompat");
    return u.toString();
  } catch {
    return url;
  }
}

function buildConnectionStringFromParts(): string | null {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim();
  const database = process.env.DB_DATABASE?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !port || !database || !user || !password) return null;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

function getPool(): Pool | null {
  if (pool) return pool;

  // DATABASE_URL (Supabase / Railway / Neon) takes priority over individual parts.
  const rawUrl =
    process.env.DATABASE_URL?.trim() ?? buildConnectionStringFromParts();
  if (!rawUrl) return null;

  const url = normalizeConnectionString(rawUrl);
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0");

  pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: true },
  });
  return pool;
}

export async function persistSubmission(params: {
  requestId: string;
  ip: string;
  userId?: string | null;
  promptVersion: string;
  model: string;
  profile: VisaProfile;
  sources: Array<{ title: string; url: string }>;
  result: PersistedResult;
  latencyMs: number;
}): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(
    `insert into public.visa_submissions
      (request_id, ip, user_id, prompt_version, model, profile, sources, response, latency_ms)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9)`,
    [
      params.requestId,
      params.ip,
      params.userId ?? null,
      params.promptVersion,
      params.model,
      JSON.stringify(params.profile),
      JSON.stringify(params.sources),
      JSON.stringify(params.result),
      params.latencyMs,
    ],
  );
}

export async function listRecentSubmissions(filters: {
  limit?: number;
  goal?: string;
  region?: string;
  userId?: string | null;
}): Promise<HistoryItem[]> {
  const p = getPool();
  if (!p) return [];
  try {
    const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
    const values: Array<string | number | null> = [];
    const conditions: string[] = [];

    if (filters.userId !== undefined) {
      values.push(filters.userId);
      conditions.push(`user_id = $${values.length}`);
    }
    if (filters.goal) {
      values.push(filters.goal);
      conditions.push(`profile->>'goal' = $${values.length}`);
    }
    if (filters.region) {
      values.push(filters.region);
      conditions.push(`profile->>'targetRegion' = $${values.length}`);
    }
    values.push(limit);

    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const query = `
      select id, request_id, created_at, prompt_version, model, profile, response
      from public.visa_submissions
      ${where}
      order by created_at desc
      limit $${values.length}
    `;
    const res = await p.query(query, values);
    return res.rows
      .map((row) => {
        const profile = row.profile as VisaProfile;
        const result = row.response as PersistedResult;
        if (!profile || typeof profile !== "object") return null;
        if (!result || typeof result !== "object" || !Array.isArray(result.pathways))
          return null;
        return {
          id: Number(row.id),
          requestId: String(row.request_id),
          createdAt: new Date(row.created_at).toISOString(),
          promptVersion: String(row.prompt_version),
          model: String(row.model),
          profile,
          result,
        } satisfies HistoryItem;
      })
      .filter((v): v is HistoryItem => Boolean(v));
  } catch {
    return [];
  }
}

export async function countMonthlySubmissions(userId: string): Promise<number> {
  const p = getPool();
  if (!p) return 0;
  try {
    const res = await p.query(
      `select count(*)::int as n
       from public.visa_submissions
       where user_id = $1
         and date_trunc('month', created_at) = date_trunc('month', now())`,
      [userId],
    );
    return res.rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

export async function getUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(
      `select user_id, stripe_customer_id, stripe_subscription_id,
              plan, status, current_period_end
       from public.user_subscriptions
       where user_id = $1`,
      [userId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      userId: String(row.user_id),
      stripeCustomerId: row.stripe_customer_id ?? null,
      stripeSubscriptionId: row.stripe_subscription_id ?? null,
      plan: row.plan === "pro" ? "pro" : "free",
      status: (["active", "canceled", "past_due"].includes(row.status)
        ? row.status
        : "active") as UserSubscription["status"],
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    };
  } catch {
    return null;
  }
}

export async function upsertUserSubscription(params: {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: "free" | "pro";
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `insert into public.user_subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (user_id) do update set
         stripe_customer_id     = coalesce(excluded.stripe_customer_id, user_subscriptions.stripe_customer_id),
         stripe_subscription_id = coalesce(excluded.stripe_subscription_id, user_subscriptions.stripe_subscription_id),
         plan                   = excluded.plan,
         status                 = excluded.status,
         current_period_end     = excluded.current_period_end,
         updated_at             = now()`,
      [
        params.userId,
        params.stripeCustomerId ?? null,
        params.stripeSubscriptionId ?? null,
        params.plan,
        params.status,
        params.currentPeriodEnd ?? null,
      ],
    );
  } catch {
    // Silently ignore — subscription state will sync on next webhook.
  }
}
