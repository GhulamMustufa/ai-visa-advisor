# Agent Validation Rules

When making code changes to this project, you MUST self-validate your work before committing to prevent breaking the build or failing CI/CD.

## Pre-Commit Checklist
Before executing any `git commit`, you must run:
1. `npx tsc --noEmit`
2. `npm run build`

Do NOT commit code if either of these commands fail. Fix the TypeScript or build errors first, then attempt to commit again.
