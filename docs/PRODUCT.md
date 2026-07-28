# Product Context: AI Visa Advisor

## Overview
AI Visa Advisor is a SaaS platform designed to provide immigration applicants with realistic, data-backed visa pathway recommendations. Unlike traditional immigration consultancies that may overpromise, this tool uses a conservative AI scoring model grounded in official government sources to give users an honest probability score (0-100) of securing a visa.

## Target Audience
Individuals worldwide looking to immigrate, study, or work abroad who need a low-cost, preliminary assessment of their chances before hiring expensive immigration lawyers.

## Core Value Proposition
- **Honesty**: Scores are calibrated to reflect refusal probability. A score of 86-100 is rare.
- **Transparency**: Provides exact "score drivers" (e.g., "Master's degree: +12pts") and actionable next steps.
- **Speed**: A 2-minute profile yields immediate, detailed results.

## Key Workflows
1. **Assessment Flow**: User fills out a form specifying nationality, target region, age, education, experience, English test, savings, and goal (work/study/pr).
2. **Result Generation**: The system retrieves relevant government criteria (RAG), builds a dynamic prompt, and uses OpenAI to generate 3 scored pathways with checklists and timelines.
3. **Monetization**: Users are allowed 5 free assessments per month. Once exhausted, they are prompted to upgrade to a Pro plan ($9/mo) via Stripe Checkout for unlimited access.
4. **User Dashboard**: Authenticated users can view their past assessment history and manage their Stripe subscription.

## Regions Covered
1. Canada
2. UK
3. Australia / New Zealand
4. Germany / Northern Europe
5. Southern Europe
6. Middle East
7. USA
8. Singapore / Malaysia
9. Japan / South Korea
10. Easy Entry Countries

## Scoring Calibration
| Score Range | Meaning |
|---|---|
| **0-29** | Very unlikely without major profile changes. |
| **30-49** | Weak profile; possible only via indirect routes (e.g., study first). |
| **50-69** | Plausible but competitive; significant conditions apply. |
| **70-85** | Strong profile; not guaranteed but highly realistic. |
| **86-100** | Rare; only for exceptionally strong, verified profiles. |

## Business Model
- **Free Tier**: 5 assessments / month. Enforced at the API level.
- **Pro Tier**: $9 / month for unlimited assessments.

## Future Roadmap (Planned Features)
- Downloadable PDF reports of the assessment.
- Email notifications (via Resend).
- SEO enhancements (Sitemaps, OG tags).
