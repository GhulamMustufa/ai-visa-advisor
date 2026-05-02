# AI Visa Advisor

A production-grade SaaS that scores visa pathway chances for immigration applicants using OpenAI GPT, grounded in 17 official government sources across 10 global regions. Built with Next.js 14 App Router, Supabase auth, Stripe subscriptions, and a conservative scoring model that prioritises accuracy over optimism.

---

## What it does

A user fills a 2-minute profile (nationality, education, work experience, English test score, savings, goal) and receives:

- **Scored pathways** — top 3 visa routes with honest 0–100 probability scores
- **Score drivers** — exactly what pushed the score up or down (e.g. *"Master's degree: +12pts"*, *"No Canadian work exp: −18pts"*)
- **Top improvement** — the single action that would raise the score most
- **Realistic timeline** — how long the pathway actually takes (not best-case)
- **Document checklist** — 5–8 pathway-specific documents to gather
- **Citations** — every recommendation grounded in official government sources

---

## Technical highlights

### Scoring pipeline

```
POST /api/score
  │
  ├── IP rate limit (20 req/min, in-memory with TTL eviction)
  ├── Supabase session check → free-tier enforcement (5 assessments/month)
  ├── Zod schema validation
  ├── normalizeFieldOfWork()  — maps "backend dev" → "Software Engineer"
  ├── deriveVariantMode()     — strict/balanced/very_strict from profile weakness count
  ├── buildSystemPrompt()     — dynamic, nationality + region aware
  ├── buildUserPrompt()       — RAG context with real scoring criteria injected
  │     └── 17 official sources × criteria (CRS thresholds, salary floors, IELTS minimums)
  ├── OpenAI fetch with AbortController (25s timeout) + withRetry (2 attempts)
  │     └── JSON Schema structured output → _thinking (chain-of-thought) + 10 fields
  ├── Strip _thinking server-side before returning to client
  └── Persist to Postgres (fire-and-forget, graceful failure)
```

### Prompt engineering (v4)

- **Chain-of-thought via `_thinking` field** — first field in the JSON schema forces the model to reason before committing to scores; stripped server-side, never sent to the client
- **Real RAG criteria** — 17 sources with actual thresholds embedded (CRS 470+, IELTS 6.0, salary £26,200, 65 points minimum) — not just URL titles
- **Profile-derived scoring mode** — weakness count (low savings + no English + low experience) deterministically sets `very_strict` vs `balanced`; no randomness
- **Prompt versioning** — every submission logs `promptVersion: "visa-prompt-v4-rag"` for A/B analysis
- **Conservative by design** — score 86–100 is rare; penalises weak profiles the same way a real immigration officer would

### Auth & payments

- **Supabase SSR auth** — session refresh in middleware on every request; protected routes redirect with `?next=` param for post-login redirect
- **Stripe Checkout + Billing Portal** — lazy-initialised Stripe client; reuses existing customer ID across sessions
- **Webhook-driven subscription state** — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; graceful DB failure doesn't crash the request
- **Free tier enforced at API level** — not just UI — unauthenticated users bypass limit; authenticated free users are capped at 5/month via monthly DB count

### Reliability

- **Graceful DB degradation** — every Postgres query is wrapped in try/catch; `null`/`[]` returned on failure so the app works without a database
- **Rate limiter with TTL eviction** — `Map`-based bucket with lazy eviction pass every 2 minutes; no memory leak under sustained traffic
- **AbortController timeout** — 25-second hard limit on OpenAI requests; prevents serverless function hangs
- **Retry with backoff** — `withRetry(fn, { attempts: 2, baseDelayMs: 300 })` around all OpenAI calls

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Language | TypeScript (strict mode) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Database | PostgreSQL via `pg` (Supabase managed) |
| Payments | Stripe (Checkout, Billing Portal, Webhooks) |
| AI | OpenAI GPT-4o-mini with JSON Schema structured outputs |
| Validation | Zod v3 |
| Styling | Tailwind CSS |
| Testing | Vitest + jsdom (12 tests) |
| Deployment | Vercel (serverless) |

---

## Project structure

```
├── app/
│   ├── api/
│   │   ├── score/route.ts          # Core scoring endpoint
│   │   ├── create-checkout/        # Stripe Checkout session
│   │   ├── create-portal/          # Stripe billing portal
│   │   └── webhooks/stripe/        # Subscription lifecycle events
│   ├── auth/                       # Login, signup, OAuth callback
│   ├── dashboard/                  # Usage tracking + subscription management
│   ├── form/                       # Multi-step profile form
│   └── results/                    # Pathway results + simulation
├── lib/
│   ├── rag.ts                      # 17 official sources with scoring criteria
│   ├── persistence.ts              # All DB queries (graceful failure)
│   ├── rate-limit.ts               # IP rate limiter with TTL eviction
│   ├── stripe.ts                   # Lazy Stripe client + plan config
│   ├── retry.ts                    # withRetry() helper
│   └── types.ts                    # Shared TypeScript types
├── utils/supabase/
│   ├── server.ts                   # Server-side Supabase client (cookies)
│   └── client.ts                   # Browser-side Supabase client
├── middleware.ts                   # Session refresh + route protection
├── db/
│   ├── schema.sql                  # Base table: visa_submissions
│   └── migrations/001_add_auth.sql # user_id FK + user_subscriptions table
└── __tests__/
    ├── api-score.test.ts           # 7 integration tests (validation, rate limit, OpenAI mock)
    └── rate-limit.test.ts          # 5 unit tests (fake timers)
```

---

## Local setup

**1. Clone and install**
```bash
git clone https://github.com/GhulamMustufa/ai-visa-advisor.git
cd ai-visa-advisor
npm install
```

**2. Configure environment**
```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public |
| `DATABASE_URL` | Supabase → Settings → Database → **Transaction** pooler (port 6543) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products → Pro price ID |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |

**3. Run database migrations**

In Supabase → SQL Editor, run in order:
1. `db/schema.sql`
2. `db/migrations/001_add_auth.sql`

**4. Start dev server**
```bash
npm run dev        # http://localhost:3000
npm test           # run 12 tests
npx tsc --noEmit   # type-check
```

> The app runs without a database — auth and scoring work, but history and free-tier enforcement are disabled.

---

## Scoring model

Scores are calibrated like refusal probability, not success encouragement:

| Score | Meaning |
|-------|---------|
| 0–29 | Very unlikely without major profile changes |
| 30–49 | Weak profile; possible only via indirect routes |
| 50–69 | Plausible but competitive; significant conditions apply |
| 70–85 | Strong profile; not guaranteed |
| 86–100 | Rare — only for exceptionally strong, verified profiles |

**Automatic penalties:** savings < $5k · no English test · experience < 2 years · high school only

**Automatic boosts:** Master's / PhD · skilled profession (STEM, healthcare, finance) · strong language scores

---

## Business model

| Plan | Assessments | Price |
|------|------------|-------|
| Free | 5 / month | $0 |
| Pro | Unlimited | $9 / month |

Limit is enforced at the API level — not just the UI. Authenticated free users hitting the cap receive a `402` response with `upgradeRequired: true`.

---

## Covered regions

🇨🇦 Canada · 🇬🇧 UK · 🇦🇺 Australia / New Zealand · 🇩🇪 Germany / Northern Europe · 🌍 Southern Europe · 🕌 Middle East · 🇺🇸 USA · 🇸🇬 Singapore / Malaysia · 🇯🇵 Japan / South Korea · ✈️ Easy Entry Countries

---

## Tests

```bash
npm test
```

```
✓ __tests__/rate-limit.test.ts    (5 tests)
✓ __tests__/api-score.test.ts     (7 tests)
   — input validation (5 cases)
   — rate limit 429 after 20 requests
   — OpenAI mock: 200 with correct shape, _thinking stripped, new fields present
```

Key patterns: `vi.mock()` hoisting for Supabase server client · `vi.stubGlobal("fetch")` for OpenAI · `vi.useFakeTimers()` for rate limit window

---

## Deployment

Deploy to Vercel in one click — all routes are serverless-compatible. Set the same environment variables in the Vercel dashboard.

```bash
vercel --prod
```


Add the Stripe webhook endpoint in Stripe Dashboard:
```
https://your-domain.vercel.app/api/webhooks/stripe
```
