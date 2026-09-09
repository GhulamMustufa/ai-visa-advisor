# Architecture Context: Borderless AI

## System Overview
The application is a stateless Serverless Monolith built on Next.js 14. It couples frontend presentation and backend API logic within the same repository, deployed to Vercel's Edge/Serverless infrastructure. State and authentication are outsourced to managed cloud services (Supabase, Stripe).

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Frontend**: React 18, Tailwind CSS
- **Backend**: Next.js API Route Handlers (Node.js Serverless runtime)
- **Database**: Neon Serverless PostgreSQL with `pgvector`
- **Auth**: Clerk (`@clerk/nextjs`) with middleware verification
- **Payments**: Stripe (Checkout & Customer Portal)
- **AI/LLM**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`), Vercel AI SDK

## Core Architecture Patterns

### 1. Stateless Serverless Execution
All API endpoints (`/api/*`) are stateless. They read authentication from Clerk sessions (managed by Next.js middleware) and perform operations that fit within Vercel's serverless timeout limits.

### 2. Graceful Degradation
The application is designed to function even if the database is temporarily unreachable. 
- All database calls in `lib/persistence.ts` are wrapped in `try/catch` blocks.
- If the DB fails during a scoring request, the result is still returned to the user, but the history is not saved (fire-and-forget).
- Guest users can run assessments and chat without creating an account or requiring DB writes.

### 3. API-Level Rate Limiting and Quotas
The `/api/score` endpoint implements a multi-layered defense:
1. **IP Rate Limiting**: An in-memory Map tracks requests (20 req/min).
2. **Quota Enforcement**: Authenticated users have their monthly `visa_submissions` counted. If `count >= 5` and the user is not subscribed to "Pro", a `402 Payment Required` is returned.

### 4. Semantic Search with pgvector
The `/api/chat` and evidence matching modules use `text-embedding-3-small` (1536 dimensions) with Neon's `pgvector` cosine distance operator (`<=>`) to retrieve authoritative evidence from the `immigration_evidence` table before the LLM generates a response.

### 5. Subscription State Synchronization
Stripe holds the source of truth for payments. A webhook endpoint (`/api/webhooks/stripe`) listens for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` to upsert records into the `user_subscriptions` table.

## Deployment Topology
- **Vercel**: Hosts the Next.js application, serverless routes, and edge middleware.
- **Neon**: Hosts Serverless PostgreSQL with connection pooling and the `vector` extension.
- **Clerk**: Manages secure user identity and session tokens.

## Sequence Flow (Scoring Request)
1. **Client** POSTs to `/api/score`.
2. **Middleware** verifies session via Clerk.
3. **Route Handler** validates IP rate limits and checks DB for free-tier quotas.
4. **Route Handler** validates payload with Zod.
5. **Deterministic Engine** calculates base score and eligibility.
6. **RAG / Vector Module** retrieves matching official criteria.
7. **OpenAI API** synthesizes qualitative analysis and score drivers.
8. **Database** async insert (fire-and-forget) to `visa_submissions`.
9. **Client** receives cleaned JSON response.
