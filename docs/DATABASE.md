# Database Context: Borderless AI

The application uses PostgreSQL, hosted on Neon Serverless, and connects directly via the `pg` driver with SSL enabled.
 
## Core Philosophy
**Graceful Degradation:** The database is treated as a secondary dependency for the core `/api/score` flow. If the database goes down, the AI scoring will still function, but user history and free-tier limits will fail silently (allowing the user through). All `lib/persistence.ts` functions use `try/catch` and return `null` or `[]` on failure.

## Schema

### 1. `immigration_evidence` (Vector Knowledge Base)
Stores embeddings and authoritative text from official immigration ministerial sources.

| Column | Type | Description |
|---|---|---|
| `id` | `serial` | Primary Key |
| `country` | `text` | Target country (e.g., "Germany", "Canada") |
| `pathway` | `text` | Specific visa pathway (e.g., "Chancenkarte", "Express Entry") |
| `source_title` | `text` | Official publication title |
| `source_url` | `text` | Official government verification URL |
| `content` | `text` | Official criteria, salary floors, points, and rules |
| `embedding` | `vector(1536)` | Cosine distance index for sub-second semantic retrieval |

### 2. `chat_threads` & `chat_messages` (Persistent AI Copilot)
Maintains conversation history for authenticated users.

- **`chat_threads`**:
  | Column | Type | Description |
  |---|---|---|
  | `id` | `uuid` | Primary Key |
  | `user_id` | `text` | Clerk User ID |
  | `title` | `text` | Conversation title (auto-generated from first message) |
  | `created_at` | `timestamp` | Creation timestamp |
  | `updated_at` | `timestamp` | Last activity timestamp |

- **`chat_messages`**:
  | Column | Type | Description |
  |---|---|---|
  | `id` | `uuid` | Primary Key |
  | `thread_id` | `uuid` | Foreign Key to `chat_threads.id` |
  | `role` | `text` | 'user' or 'assistant' |
  | `content` | `text` | Markdown text of the message |
  | `created_at` | `timestamp` | Message timestamp |

### 3. `visa_submissions`
Stores every completed visa assessment for history, human capital benchmarks, and analytics.

| Column | Type | Description |
|---|---|---|
| `id` | `serial` | Primary Key |
| `request_id` | `text` | Unique ID for tracing logs |
| `ip` | `text` | User's IP address (for analytics/abuse tracking) |
| `user_id` | `text` | Clerk User ID (nullable for guests) |
| `prompt_version` | `text` | E.g., "visa-prompt-v4-rag" |
| `model` | `text` | E.g., "gpt-4o-mini" |
| `profile` | `jsonb` | The exact input payload |
| `response` | `jsonb` | The exact OpenAI structured JSON output |
| `sources` | `jsonb` | The RAG sources injected into the prompt |
| `latency_ms` | `integer` | API response time |
| `created_at` | `timestamp` | Timestamp |

### 4. `user_subscriptions`
Stores the synchronized subscription state from Stripe Webhooks.

| Column | Type | Description |
|---|---|---|
| `user_id` | `text` | Primary Key (Clerk User ID) |
| `stripe_customer_id` | `text` | Used to open the billing portal |
| `stripe_subscription_id` | `text` | Used to track the active subscription |
| `plan` | `text` | 'free' or 'pro' |
| `status` | `text` | 'active', 'canceled', 'past_due' |
| `current_period_end` | `timestamp` | When the subscription expires/renews |

## Connection Strategy
The application connects to Neon using connection pooling via `DATABASE_URL`. In production, SSL is enforced with `rejectUnauthorized: false` to guarantee secure serverless operations without connection exhaustion.
