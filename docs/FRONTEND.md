# Frontend Context: Borderless AI

## Architecture
The frontend is built on Next.js 14 App Router. It embraces the paradigm of separating static/server-rendered content from highly interactive client-side logic.

## Routing Directory (`app/`)
- `/` (Client Component): The high-converting platform showcase. Explains the 4 platform pillars, refusal calibration, 1-click interactive demos, and comparative value.
- `/form` (Client Component): The core assessment experience. A multi-step wizard where users input profile data.
- `/results` (Client Component): Renders scored pathways, points breakdown, score drivers, and provides a 1-click downloadable/printable executive PDF Action Plan.
- `/chat` (Client Component): The conversational AI Immigration Copilot. Supports real-time streaming, suggestion chips, and cloud-synced persistent threads.
- `/explore` (Client Component): Filter and search 1,454 verified visa pathways across 70+ nations by category (Nomad, Skilled, Founder, Investor, Study, Easy Entry), budget, and difficulty.
- `/dashboard` (Client Component): Protected user portal with human capital percentile benchmarking against applicant cohorts.
- `/history` (Client Component): History of past assessments.
- `/sign-in` & `/sign-up`: Managed Clerk authentication flows.

## Authentication (Clerk)
- The frontend uses Clerk (`@clerk/nextjs`) for secure session management and authentication.
- The `Header.tsx` component checks Clerk's `isLoaded` and `isSignedIn` states to provide seamless login/logout and user profile controls without layout shift.
- The `middleware.ts` runs on the edge, delegating route protection to Clerk while ensuring public routes and API endpoints remain accessible.

## State Management
- No heavy state managers (like Redux or Zustand) are explicitly required for the core flow. State is largely localized to the components that need it (e.g., React `useState` within the `/form` steps).
- Results from the API are likely passed via route state or localized context.

## Styling
- Tailwind CSS is the exclusive styling methodology.
- The design system prioritizes a clean, authoritative, and trustworthy aesthetic suitable for a legal/immigration SaaS.
