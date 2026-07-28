# Coding Standards: AI Visa Advisor (MVP)

This document defines practical coding and performance rules for the AI Visa Advisor MVP built with:
- Next.js 14 (App Router)
- React
- TypeScript
- PostgreSQL (Supabase `pg` driver)

**Goal**: Keep code clean, fast, readable, and maintainable — not over-engineered.

---

# 1. Function Design

## 1.1 Keep functions small
- A function should do ONE thing only.
- If a function is longer than ~50 lines → split it.

## 1.2 Break large logic
- Avoid God-classes (e.g., `app/api/score/route.ts`).
- Split logic into:
  - `utils/` (Generic helpers)
  - `lib/services/` (Business logic like prompt generation)
  - `lib/persistence.ts` (Database operations)

**Example**:
❌ Bad: 200-line Route Handler containing validation, prompt building, and DB inserts.
✅ Good: Route Handler → calls Service (`scoreService`) → Service calls Repository (`persistence`).

---

# 2. React / Next.js Optimization Rules

## 2.1 Server Components First
- Use Server Components by default for better performance and SEO.
- Use Client Components (`"use client"`) only when needed for:
  - `useState`
  - `useEffect`
  - Event handlers (`onClick`, form submissions).

## 2.2 Avoid unnecessary re-renders
- Do NOT wrap everything in `useState`.
- Do NOT overuse `useEffect`.
- Keep state as local as possible.

## 2.3 Component splitting
Break UI into logical groupings:
- Page components (`app/**/page.tsx`)
- Layout components (`app/layout.tsx`)
- Reusable UI components (`components/`)
- Feature-specific components (`app/form/_components/`)

## 2.4 Hooks separation
Custom hooks must be used for complex state or reusable logic (e.g., `useAuth()`). Do NOT put raw API `fetch` logic directly inside UI components without encapsulating it in a hook or helper function.

## 2.5 Avoid prop drilling
If props go deeper than 2–3 levels, use context or move to a feature-level hook.

---

# 3. TypeScript Rules

## 3.1 Separate types
Always keep core types centralized:
- `lib/types.ts` for shared domain models (`VisaProfile`, `TargetRegion`, etc.).
Do NOT inline large interfaces inside components.

## 3.2 Avoid any
- Never use `any`.
- Use `unknown` for parsed JSON (like the OpenAI response) and validate it safely before narrowing.

## 3.3 Strict Validation
- All incoming API data MUST be validated using Zod schemas before processing.

---

# 4. Backend (Next.js API Routes) Rules

## 4.1 Layered Architecture
Even without Express, treat Next.js Route Handlers as controllers:
`Route Handler` → `Service` → `Persistence`

- **Route Handler**: Receives request, runs Zod validation, returns response.
- **Service**: AI prompt building, RAG logic.
- **Persistence**: Database queries.

## 4.2 Keep APIs simple
- One endpoint = one purpose.
- Avoid multi-purpose endpoints.

---

# 5. Database Optimization Rules (PostgreSQL)

## 5.1 Graceful Degradation
- Treat the database as unreliable. All DB operations in `lib/persistence.ts` must be wrapped in `try/catch`. 
- Never let a `pg` query throw an unhandled error that crashes the request, especially for non-critical paths like analytics tracking.

## 5.2 Fire-and-Forget
- When logging data (e.g., `persistSubmission`), do not `await` it in a way that delays the client response.

## 5.3 Keep Queries Efficient
- Avoid heavy joins.
- Use the `jsonb` columns wisely for fast serialization without complex relational mapping.
- Ensure proper indexing (e.g., indexing `user_id` on `visa_submissions`).

---

# 6. State Management Rules (Frontend)

## 6.1 Keep state minimal
- Prefer local component state.
- Avoid global state unless strictly needed.

## 6.2 No unnecessary global stores
- Do NOT add Redux/Zustand unless required. The current React Context and simple props are sufficient for the MVP.

---

# 7. API Optimization Rules

## 7.1 Resilience
- **Timeouts**: Always use `AbortController` when calling external services like OpenAI to prevent serverless function hangs (Current limit: 25s).
- **Retries**: Wrap flaky external calls in the custom `withRetry` helper (`lib/retry.ts`).

## 7.2 Rate Limiting
- Use IP-based rate limiting to prevent abuse.

---

# 8. File Structure Rules

Keep structure logical and feature-based.
- `app/api/`: All backend endpoints.
- `app/[feature]/`: Frontend routes (e.g., `form`, `results`).
- `lib/`: Shared utilities, types, and business logic.
- `components/`: Generic, reusable UI components.

---

# 9. Code Quality Rules

- **Readable over clever**.
- Avoid deep nesting (max 3 levels). Use early returns.
- Avoid duplicate logic. Extract reusable utilities.

---

# 10. What NOT to optimize in MVP

Do NOT do:
- `useMemo` / `useCallback` everywhere blindly.
- Premature caching layers (e.g., Redis) unless scaling dictates it.
- Microservices.
- Complex state management.

---

# 11. Golden Rule

If an optimization makes the code significantly harder to read → do NOT do it.

**MVP Priority:**
✔ Correctness
✔ Simplicity
✔ Maintainability
✔ Speed of development

---

# 12. Code Comments Rules (IMPORTANT)

## 12.1 When to add comments
Add comments ONLY when:
- The logic is not immediately obvious.
- There is a business rule (e.g., strict scoring penalties).
- There is a workaround or hack.
- There is complex SQL or query logic.
- There is a security-related decision (e.g., deleting the `_thinking` field before returning to client).

## 12.2 What to comment
Focus on **WHY**, not WHAT.

❌ Bad:
```ts
// increment counter
count++;
```

✅ Good:
```ts
// We enforce a hard limit of 5 requests per IP to prevent OpenAI billing abuse
if (count >= 5) { ... }
```
