# Database Context: AI Visa Advisor

The application uses PostgreSQL, hosted on Supabase, and connects directly via the `pg` driver using a Transaction Pooler (Port 6543) for serverless compatibility.

## Core Philosophy
**Graceful Degradation:** The database is treated as a secondary dependency for the core `/api/score` flow. If the database goes down, the AI scoring will still function, but user history and free-tier limits will fail silently (allowing the user through). All `lib/persistence.ts` functions use `try/catch` and return `null` or `[]` on failure.

## Schema

### 1. `visa_submissions`
Stores every completed visa assessment for history and analytics.

| Column | Type | Description |
|---|---|---|
| `id` | `serial` | Primary Key |
| `request_id` | `text` | Unique ID for tracing logs |
| `ip` | `text` | User's IP address (for analytics/abuse tracking) |
| `user_id` | `uuid` | FK to Supabase Auth user (nullable for guests) |
| `prompt_version` | `text` | E.g., "visa-prompt-v4-rag" for A/B testing |
| `model` | `text` | E.g., "gpt-4o-mini" |
| `profile` | `jsonb` | The exact input payload |
| `response` | `jsonb` | The exact OpenAI structured JSON output |
| `sources` | `jsonb` | The RAG sources injected into the prompt |
| `latency_ms` | `integer` | API response time |
| `created_at` | `timestamp` | Timestamp |

### 2. `user_subscriptions`
Stores the synchronized state from Stripe Webhooks.

| Column | Type | Description |
|---|---|---|
| `user_id` | `uuid` | PK, FK to Supabase Auth user |
| `stripe_customer_id` | `text` | Used to open the billing portal |
| `stripe_subscription_id` | `text` | Used to track the active sub |
| `plan` | `text` | 'free' or 'pro' |
| `status` | `text` | 'active', 'canceled', 'past_due' |
| `current_period_end` | `timestamp` | When the subscription expires/renews |

## Connection Strategy
Instead of standard direct connections, the app requires `DATABASE_URL` to point to Supabase's IPv4 Transaction Pooler (`aws-0-*.pooler.supabase.com:6543`). This prevents Vercel serverless functions from opening too many concurrent direct connections to the DB and causing connection exhaustion.
