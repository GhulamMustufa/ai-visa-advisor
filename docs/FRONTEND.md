# Frontend Context: AI Visa Advisor

## Architecture
The frontend is built on Next.js 14 App Router. It embraces the paradigm of separating static/server-rendered content from highly interactive client-side logic.

## Routing Directory (`app/`)
- `/` (Server Component): The static marketing landing page. Fast load times, SEO optimized.
- `/form` (Client Component): The core interactive experience. A multi-step wizard where users input their profile data. Manages complex state (e.g., showing/hiding fields based on previous answers).
- `/results` (Client Component): Receives the JSON response from the `/api/score` endpoint and renders the pathways, scores, and checklists. It acts as a "simulation" tool.
- `/explore` (Client Component): A static/interactive hybrid allowing users to browse general visa options by region without scoring.
- `/dashboard` (Server Component): Protected route. Fetches user history and Stripe subscription state server-side before rendering.
- `/history` (Client Component): UI for viewing past assessment results.
- `/auth/*` (Client Components): Login, Signup, and OAuth handling.

## Authentication (Supabase SSR)
- The frontend uses `@supabase/ssr` to ensure that authentication state is available on the server before the initial HTML is sent.
- The `Header.tsx` component is server-rendered with the initial user state, preventing UI flashing (layout shift) between logged-out and logged-in states.
- The `middleware.ts` runs on the edge to protect `/dashboard` and redirect unauthenticated users to `/auth/login?next=/dashboard`.

## State Management
- No heavy state managers (like Redux or Zustand) are explicitly required for the core flow. State is largely localized to the components that need it (e.g., React `useState` within the `/form` steps).
- Results from the API are likely passed via route state or localized context.

## Styling
- Tailwind CSS is the exclusive styling methodology.
- The design system prioritizes a clean, authoritative, and trustworthy aesthetic suitable for a legal/immigration SaaS.
