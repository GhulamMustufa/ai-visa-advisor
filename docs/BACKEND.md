# Backend Context: AI Visa Advisor

## Overview
The backend is entirely serverless, leveraging Next.js Route Handlers (`app/api/`) deployed to Vercel. 

## Core Infrastructure

### 1. `lib/persistence.ts`
The data access layer. Uses the `pg` package to connect to Supabase's transaction pooler.
- Contains specific queries for:
  - `persistSubmission`: Logging an assessment.
  - `listRecentSubmissions`: Dashboard history.
  - `countMonthlySubmissions`: Free-tier quota tracking.
  - `upsertUserSubscription`: Syncing Stripe state.

### 2. `lib/rate-limit.ts`
An in-memory rate limiter protecting endpoints from abuse.
- Uses a basic JavaScript `Map` with IP addresses as keys.
- Implements a TTL eviction strategy to prevent memory leaks under sustained traffic.
- **Warning**: In a serverless environment, this Map resets every time a cold start occurs, and is isolated per-instance. It stops massive single-instance flooding but is not a global rate limiter.

### 3. `lib/stripe.ts`
Handles Stripe initialization.
- Uses lazy-initialization to ensure the Stripe SDK is only instantiated when needed, keeping cold start times low for non-payment routes.
- Defines plan configuration (`FREE_MONTHLY_LIMIT = 5`).

### 4. `lib/retry.ts`
A custom `withRetry` utility wrapper.
- Essential for interacting with LLM APIs which frequently timeout or return 502s.
- Features exponential backoff (`baseDelayMs`).

## Security & Protection
1. **Zod Validation**: All POST payloads are rigorously validated. E.g., `savingsUsd` must be a positive integer, `targetRegion` must match the `REGIONS` enum.
2. **Quota Enforcement**: Auth checks happen *before* hitting the expensive OpenAI API. If `countMonthlySubmissions >= 5`, the request is immediately rejected.
3. **Webhook Verification**: Stripe webhooks are verified using `stripe.webhooks.constructEvent` to prevent spoofing.
