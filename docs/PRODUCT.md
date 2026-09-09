# Product Context: Borderless AI

## Overview
Borderless AI is a SaaS platform designed to provide immigration applicants with realistic, data-backed visa pathway recommendations. Unlike traditional immigration consultancies that may overpromise, this tool uses a conservative AI scoring model grounded in official government sources to give users an honest probability score (0-100) of securing a visa.

## Target Audience
Individuals worldwide looking to immigrate, study, or work abroad who need a low-cost, preliminary assessment of their chances before hiring expensive immigration lawyers.

## Core Value Proposition
- **Honesty**: Scores are calibrated to reflect refusal probability. A score of 86-100 is rare.
- **Transparency**: Provides exact mathematical "score drivers" (e.g., "Master's degree: +12pts") and actionable next steps.
- **Authoritative Coverage**: Backed by **1,454 verified pathways across 70+ countries** grounded in official government gazettes.
- **Speed & Accessibility**: A 2-minute profile yields immediate results; 1-click presets allow instant testing.

## Key Workflows
1. **Deterministic Assessment Flow (`/form`)**: User fills out a form specifying nationality, target region, age, education, experience, English test, savings, and goal. The system calculates exact points, checks thresholds, and outputs 3 viable pathways.
2. **AI Immigration Copilot (`/chat`)**: RAG-powered interactive conversational assistant. Uses Neon PostgreSQL `pgvector` embeddings to answer complex visa questions with official government citations. Supports persistent multi-thread history.
3. **Global Pathway Explorer (`/explore`)**: Allows users to browse and filter 1,454 visa routes by goal (Nomad, Skilled, PR, Founder, Study), budget, and difficulty without taking an assessment.
4. **Downloadable PDF Action Plan (`/results`)**: Branded, printable immigration strategy document with tailored checklists and legal citations.
5. **Applicant Dashboard & Benchmarking (`/dashboard`)**: Authenticated users can view assessment history, percentile rankings, and human capital breakdowns.
6. **Monetization**: Users are allowed 5 free assessments per month and 3 free chat consultations. Authenticated Pro users get unlimited access via Stripe Checkout.

## Regions Covered (70+ Countries)
1. Canada (Express Entry, PNP, Start-up Visa)
2. United Kingdom (Skilled Worker, Global Talent, Scale-up)
3. Australia & New Zealand (Subclass 189/190/491, SMC)
4. Germany & EU (Chancenkarte, EU Blue Card, Jobseeker)
5. Southern Europe (Portugal D8/D7, Spain Nomad/Golden Visa, Italy)
6. Middle East (UAE Golden Visa, Green Visa, Saudi Arabia)
7. United States (O-1, H-1B, L-1, EB-1/EB-2 NIW)
8. Singapore & Malaysia (ONE Pass, Tech.Pass, DE Rantau)
9. Japan & South Korea (J-Skip, J-Find, F-2-7)
10. Fast-Track Nomad & Latin America (Costa Rica, Mexico, Colombia, Panama)

## Scoring Calibration
| Score Range | Meaning |
|---|---|
| **0-29** | Very unlikely without major profile changes (heavy refusal penalties). |
| **30-49** | Weak profile; possible only via indirect routes (e.g., study-to-work). |
| **50-69** | Plausible but competitive; significant criteria conditions apply. |
| **70-85** | Strong profile; not guaranteed but highly realistic under current draws. |
| **86-100** | Rare; only for exceptionally strong, verified profiles (job offer / PNP). |

## Business Model
- **Free Tier**: 5 assessments / month, 3 free AI Copilot chats, unlimited Explorer access.
- **Pro Tier**: $9 / month for unlimited assessments and unlimited AI Copilot chat threads.

## Implemented Platform Capabilities
- ✅ Refusal-Calibrated Deterministic Scoring Engine with score drivers & points breakdown.
- ✅ AI Immigration Copilot with `pgvector` semantic retrieval and cloud persistence.
- ✅ Global Visa Explorer with 1,454 pathways and direct government portal links.
- ✅ 1-Click Interactive Personas for instant stakeholder demos.
- ✅ Downloadable & Printable PDF Immigration Action Plan.
- ✅ Clerk Authentication & User Dashboard with human capital percentile benchmarks.
