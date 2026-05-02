# Visa Advisor — CLAUDE.md

## Project Overview

A Next.js 14 SaaS that takes an applicant's immigration profile and uses OpenAI GPT to generate scored visa pathway recommendations across 10 global regions. Users get 3 pathways with scores (0–100), reasoning, document checklists, timelines, and improvement tips.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (auth + DB) · Stripe (subscriptions) · OpenAI GPT · PostgreSQL via `pg`

---

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build (runs tsc + next build)
npm test             # Run Vitest test suite (vitest run)
npm run test:watch   # Watch mode
npm run lint         # ESLint
npx tsc --noEmit     # Type-check only
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find |
|----------|--------------|
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → **Transaction** tab (port 6543) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products → Pro plan price ID |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

**Important:** `DATABASE_URL` must use the **Transaction pooler** (port 6543, host `aws-0-*.pooler.supabase.com`), not the direct connection (`db.*.supabase.co`). The app works without a DB — auth and scoring still function, but history/dashboard data will be empty.

---

## Architecture

### Pages

| Route | Type | Description |
|-------|------|-------------|
| `/` | Server | Landing page |
| `/form` | Client | Multi-step profile form |
| `/results` | Client | Pathway results + simulation tool |
| `/explore` | Client | Explore visa options by region |
| `/history` | Client | Past assessments list |
| `/dashboard` | Server | User dashboard — usage, subscription, history |
| `/auth/login` | Client | Email/password sign in |
| `/auth/signup` | Client | Email/password registration |
| `/auth/callback` | Route handler | Supabase OAuth code exchange |

### API Routes

| Route | Auth required | Description |
|-------|--------------|-------------|
| `POST /api/score` | No (but tracked) | Main scoring endpoint — calls OpenAI |
| `GET /api/history` | Optional | Returns past submissions |
| `POST /api/create-checkout` | Yes | Creates Stripe Checkout session → redirects |
| `POST /api/create-portal` | Yes | Opens Stripe billing portal → redirects |
| `POST /api/webhooks/stripe` | Stripe signature | Handles subscription lifecycle events |

### Key Libraries

| File | Purpose |
|------|---------|
| `lib/types.ts` | Shared types: `VisaProfile`, `Pathway`, `Citation`, `TargetRegion`, etc. |
| `lib/rag.ts` | 17 official immigration sources with real scoring criteria; `retrieveSources()` returns top 3 per region/goal |
| `lib/persistence.ts` | All PostgreSQL queries — submissions, subscriptions. Gracefully returns null/[] on DB errors |
| `lib/rate-limit.ts` | In-memory IP rate limiter (20 req/min) with TTL eviction |
| `lib/stripe.ts` | Lazy Stripe client init; `FREE_MONTHLY_LIMIT = 5`; `PLANS` config |
| `lib/retry.ts` | `withRetry()` helper used for OpenAI calls |
| `lib/logger.ts` | Structured JSON logging with request IDs |
| `utils/supabase/server.ts` | Server-side Supabase client (uses `next/headers` cookies) |
| `utils/supabase/client.ts` | Browser-side Supabase client |
| `middleware.ts` | Refreshes Supabase session on every request; protects `/dashboard`; skips gracefully if Supabase env vars are absent |

---

## Scoring Pipeline (`/api/score`)

1. **Rate limit** check (IP-based, 20/min)
2. **Auth check** — gets user from Supabase session if present
3. **Free tier enforcement** — authenticated non-pro users blocked after 5 assessments/month
4. **Zod validation** of request body
5. **`normalizeFieldOfWork()`** — maps informal job titles ("backend dev" → "Software Engineer")
6. **`deriveVariantMode()`** — sets scoring strictness based on profile weakness count (not random)
7. **`buildSystemPrompt(profile)`** — dynamic system prompt with nationality + target region
8. **`buildUserPrompt(profile)`** — injects profile JSON + RAG criteria + chain-of-thought instruction
9. **OpenAI call** via `fetch` with 25s `AbortController` timeout, up to 2 retries
10. **JSON parse** with fallback (markdown fence extraction + schema validation)
11. **Strip `_thinking`** field from pathways before returning to client
12. **Persist** submission to DB (fire-and-forget)

**Model:** `gpt-4o-mini` · **Temperature:** `0.25` · **Max tokens:** `2400` · **Prompt version:** `visa-prompt-v4-rag`

### Scoring Output Schema (per pathway)

```ts
{
  name: string
  country: string
  score: number               // 0–100
  reason: string              // max 400 chars
  weaknesses: string[]        // 3–5 items
  documents: string[]         // 5–8 items
  next_steps: string[]        // 3–5 items
  citations: { title, url }[]
  estimated_timeline: string  // e.g. "6–12 months"
  top_improvement: string     // single highest-leverage action
  score_drivers: string[]     // exactly 3, format "Factor: +/-Npts"
}
```

`_thinking` is a per-pathway chain-of-thought field present in the OpenAI schema but **always stripped** server-side before returning to the client.

---

## Authentication (Supabase)

- Email/password via `supabase.auth.signInWithPassword()` and `signUp()`
- Signup triggers email confirmation; redirect goes to `/auth/callback` which calls `exchangeCodeForSession()`
- `middleware.ts` refreshes the session token on every non-static request
- `/dashboard` is the only protected route — unauthenticated users are redirected to `/auth/login`
- `Header.tsx` reads `initialUser` prop (passed from server layout) to show correct nav links

---

## Stripe Subscriptions

- **Free plan:** 5 assessments/month, enforced at API level in `/api/score`
- **Pro plan ($9/month):** Unlimited assessments
- Checkout flow: `POST /api/create-checkout` → Stripe Checkout → webhook → `upsertUserSubscription()`
- Billing portal: `POST /api/create-portal` → Stripe Portal (cancel/update card)
- Webhook events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Subscription state stored in `public.user_subscriptions` table

---

## Database

**Tables:**

- `public.visa_submissions` — every assessment result (profile JSON, response JSON, model, latency, user_id)
- `public.user_subscriptions` — Stripe subscription state per user

**Setup:** Run SQL files in order:
1. `db/schema.sql` — creates `visa_submissions` base table
2. `db/migrations/001_add_auth.sql` — adds `user_id` FK, creates `user_subscriptions`, adds indexes

Run these in Supabase → SQL Editor.

**DB is optional** — all queries catch errors and return null/[] so the app functions without a connected DB. Free-tier enforcement won't work without it.

---

## Tests

```bash
npm test
```

**Test files:**
- `__tests__/rate-limit.test.ts` — 5 unit tests for the rate limiter (uses `vi.useFakeTimers()`)
- `__tests__/api-score.test.ts` — 7 integration tests for `POST /api/score` (input validation, rate limiting, OpenAI mock)

**Key testing patterns:**
- `vi.mock("@/utils/supabase/server", ...)` must appear before `import { POST }` in score tests to prevent "cookies called outside request scope" error
- OpenAI `fetch` is mocked with `vi.stubGlobal("fetch", ...)` in `beforeEach`
- Mock payloads must include all new Pathway fields: `_thinking`, `estimated_timeline`, `top_improvement`, `score_drivers`

---

## RAG Sources

`lib/rag.ts` contains 17 official government sources across 10 regions. Each source has:
- `title`, `url`, `summary` — used for citations
- `criteria` — 4–6 bullet points of actual scoring thresholds (CRS points, salary floors, IELTS minimums, etc.)

`retrieveSources(region, goal, limit=3)` returns the top 3 sources ranked by goal relevance (keyword match on summary + title).

---

## Regions

| Key | Label |
|-----|-------|
| `canada` | Canada |
| `uk` | UK |
| `australia-new-zealand` | Australia/New Zealand |
| `germany-nordics` | Germany/Northern Europe |
| `southern-europe` | Southern Europe |
| `middle-east` | Middle East |
| `usa` | USA |
| `sg-my` | Singapore/Malaysia |
| `jp-kr` | Japan/South Korea |
| `easy-entry` | Easy Entry Countries |

---

## Known Issues / Remaining Work

- **DB migration not run yet** — if `user_subscriptions` table doesn't exist, subscription queries fail silently (graceful degradation handles it)
- **Stripe not configured locally** — `create-checkout` and `create-portal` routes will error without `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID`
- **No PDF report generation** — planned future feature
- **No email notifications** — planned future feature (Resend)
- **SEO metadata** — only basic title/description on layout; per-page OG tags not yet added
- **Sitemap / robots.txt** — not yet created
