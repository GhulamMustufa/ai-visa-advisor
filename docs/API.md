# API Context: Borderless AI

This document outlines the core backend API routes located in `app/api/`.

## 1. POST `/api/score`
The primary engine of the application. Generates visa pathway recommendations.

- **Auth**: Optional. If authenticated, enforces a 5/month free limit.
- **Rate Limit**: 20 requests per minute per IP.
- **Request Body**: (Validated by Zod)
  ```json
  {
    "nationality": "string",
    "targetRegion": "canada | uk | usa | ...",
    "age": 28,
    "education": "bachelor",
    "yearsExperience": 4,
    "fieldOfWork": "Software Engineer",
    "englishTest": "ielts",
    "testScore": 7.5,
    "savingsUsd": 15000,
    "goal": "work"
  }
  ```
- **Responses**:
  - `200 OK`: Returns the parsed JSON from OpenAI, containing 3 scored pathways. Note: The internal `_thinking` field is explicitly deleted before responding.
  - `429 Too Many Requests`: If the IP rate limit is exceeded.
  - `402 Payment Required`: If an authenticated user exceeds 5 assessments/month.
  - `400 Bad Request`: If Zod validation fails.
  - `502 Bad Gateway`: If OpenAI API fails or returns invalid JSON.

## 2. GET & POST `/api/chat`
The interactive AI Immigration Copilot route.

### `GET /api/chat`
Fetches user chat history.
- **Auth**: Optional. Unauthenticated users receive `{ threads: [], messages: [] }`.
- **Query Params**:
  - `threadId` (optional): If provided, returns all messages associated with the specified thread ID.
  - If omitted, returns an array of the user's active threads (`{ id, title, updatedAt }`).

### `POST /api/chat`
Conversational RAG endpoint strictly bound to official legal evidence.
- **Auth**: Optional. If authenticated, links conversation to a persistent `threadId` in Neon PostgreSQL.
- **Payload**:
  ```json
  {
    "messages": [{ "role": "user", "content": "What are the requirements for Germany's Opportunity Card?" }],
    "threadId": "optional-uuid"
  }
  ```
- **Pipeline Execution**:
  1. Computes vector embedding using `text-embedding-3-small`.
  2. Queries `immigration_evidence` using pgvector cosine distance (`<=>`).
  3. Formulates system prompt with strict citation and anti-hallucination rules.
  4. Streams completion tokens using the Vercel AI SDK UI Message Stream protocol (`x-vercel-ai-ui-message-stream: v1`).
  5. In `onFinish`, asynchronously persists conversation messages to `chat_messages` in PostgreSQL.

## 3. GET `/api/history`
Retrieves past assessments for the logged-in user.

- **Auth**: Required.
- **Query Params**: `limit`, `region`, `goal`.
- **Response**: Array of `HistoryItem` objects sourced from the `visa_submissions` table.

## 4. POST `/api/create-checkout`
Initiates a Stripe Checkout session for the Pro plan upgrade.

- **Auth**: Required.
- **Behavior**: Retrieves the user's ID, creates a Stripe Checkout session with `STRIPE_PRO_PRICE_ID`, and returns a `url` for client-side redirection.

## 5. POST `/api/create-portal`
Initiates a Stripe Billing Portal session for users to manage their active subscription.

- **Auth**: Required (User must have an active `stripe_customer_id` in DB).
- **Behavior**: Creates a Stripe Billing Portal session and returns a `url`.

## 6. POST `/api/webhooks/stripe`
Handles asynchronous events from Stripe to sync subscription state.

- **Auth**: Signature validation using `STRIPE_WEBHOOK_SECRET`.
- **Handled Events**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- **Behavior**: Parses the event, extracts customer and subscription IDs, and updates the `user_subscriptions` table in PostgreSQL.
