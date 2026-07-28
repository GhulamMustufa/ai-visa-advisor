# Architecture Context: AI Visa Advisor

## System Overview
The application is a stateless Serverless Monolith built on Next.js 14. It couples frontend presentation and backend API logic within the same repository, deployed to Vercel's Edge/Serverless infrastructure. State and authentication are outsourced to managed cloud services (Supabase, Stripe).

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Frontend**: React 18, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js Serverless runtime)
- **Database**: PostgreSQL (Managed by Supabase)
- **Auth**: Supabase SSR (Cookies)
- **Payments**: Stripe
- **AI/LLM**: OpenAI API (`gpt-4o-mini`)

## Core Architecture Patterns

### 1. Stateless Serverless Execution
All API endpoints (`/api/*`) are stateless. They read authentication from HTTP-only cookies (managed by Next.js middleware) and perform operations that fit within Vercel's serverless timeout limits (25s hard timeout for OpenAI calls).

### 2. Graceful Degradation
The application is designed to function even if the Supabase database is unreachable. 
- All database calls in `lib/persistence.ts` are wrapped in `try/catch` blocks.
- If the DB fails during a scoring request, the result is still returned to the user, but the history is not saved (fire-and-forget).
- Auth relies on Supabase APIs, but the core scoring algorithm can technically run without a DB if the user is unauthenticated or bypassing the free tier limits.

### 3. API-Level Rate Limiting and Quotas
The `/api/score` endpoint implements a multi-layered defense:
1. **IP Rate Limiting**: An in-memory Map tracks requests (20 req/min).
2. **Quota Enforcement**: Authenticated users have their monthly `visa_submissions` counted. If `count >= 5` and the user is not subscribed to "Pro", a `402 Payment Required` is returned.

### 4. Subscription State Synchronization
Stripe holds the source of truth for payments. A webhook endpoint (`/api/webhooks/stripe`) listens for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` to upsert records into the `user_subscriptions` table.

## Deployment Topology
- **Vercel**: Hosts the Next.js application. Connects to Supabase.
- **Supabase**: Hosts PostgreSQL using a Transaction Pooler (Port 6543) to prevent connection exhaustion from Vercel's serverless functions spinning up concurrently.

## Sequence Flow (Scoring Request)
1. **Client** POSTs to `/api/score`.
2. **Middleware** verifies session cookies.
3. **Route Handler** validates IP rate limits and checks DB for free-tier quotas.
4. **Route Handler** validates payload with Zod.
5. **RAG Module** retrieves hardcoded government criteria.
6. **OpenAI API** is called with structured JSON output constraints.
7. **Database** async insert (fire-and-forget) to `visa_submissions`.
8. **Client** receives cleaned JSON response.
