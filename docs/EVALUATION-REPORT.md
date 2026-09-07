# AI VISA ADVISOR EVALUATION

## Summary Metrics
- **Cases Evaluated**: 30
- **Success Rate**: 100.0%
- **Schema Validity**: 100.0%
- **Eligibility Accuracy**: 43.3%
- **Pathway Ranking Accuracy**: 0.0%
- **Hallucinations Caught by Critic**: 0 times
- **Average Latency**: NaNs
- **Average Cost per Run**: $0.00059

## Failures

### CASE-001
- **Description**: Clearly eligible Express Entry (Software Engineer, high IELTS, Masters, 5 yrs exp)
- **Expected**: Pathway: ca-express-entry | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: ELIGIBLE
- **Error**: N/A
\n
### CASE-002
- **Description**: Clearly ineligible Express Entry (No IELTS)
- **Expected**: Pathway: ca-express-entry | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-003
- **Description**: Missing Information (Funds unknown)
- **Expected**: Pathway: ca-express-entry | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-004
- **Description**: Clearly eligible UK Skilled Worker (Has job offer/sponsor)
- **Expected**: Pathway: uk-skilled-worker | Status: ELIGIBLE
- **Actual**: Pathway: Skilled Worker Visa | Status: BLOCKED
- **Error**: N/A
\n
### CASE-005
- **Description**: UK Skilled Worker blocked (Missing Sponsor/Job Offer)
- **Expected**: Pathway: uk-skilled-worker | Status: BLOCKED
- **Actual**: Pathway: Skilled Worker Visa | Status: BLOCKED
- **Error**: N/A
\n
### CASE-006
- **Description**: Borderline Canada (Age 45, low points)
- **Expected**: Pathway: ca-express-entry | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-007
- **Description**: Tech Talent Australia
- **Expected**: Pathway: au-global-talent | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: ELIGIBLE
- **Error**: N/A
\n
### CASE-008
- **Description**: Germany Job Seeker
- **Expected**: Pathway: de-job-seeker | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-009
- **Description**: Germany Job Seeker blocked (No degree)
- **Expected**: Pathway: de-job-seeker | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-010
- **Description**: Singapore Tech Pass (High salary expected, border case)
- **Expected**: Pathway: sg-tech-pass | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-011
- **Description**: US O-1 Visa (Outstanding ability)
- **Expected**: Pathway: us-o1 | Status: ELIGIBLE
- **Actual**: Pathway: H-1B Specialty Occupation | Status: BLOCKED
- **Error**: N/A
\n
### CASE-012
- **Description**: US H1-B blocked (No sponsor)
- **Expected**: Pathway: us-h1b | Status: BLOCKED
- **Actual**: Pathway: H-1B Specialty Occupation | Status: BLOCKED
- **Error**: N/A
\n
### CASE-013
- **Description**: Japan HSP (Highly Skilled Professional)
- **Expected**: Pathway: jp-hsp | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-014
- **Description**: Digital Nomad / Easy Entry
- **Expected**: Pathway: es-digital-nomad | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-015
- **Description**: UAE Golden Visa
- **Expected**: Pathway: ae-golden | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-016
- **Description**: Language threshold boundary (IELTS 6.0 vs 6.5)
- **Expected**: Pathway: ca-express-entry | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: INSUFFICIENT_EVIDENCE
- **Error**: N/A
\n
### CASE-017
- **Description**: Hallucination Trap: Made-up country
- **Expected**: Pathway: ca-express-entry | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-018
- **Description**: Student Goal (Canada)
- **Expected**: Pathway: ca-study-permit | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-019
- **Description**: Student Goal Blocked (Insufficient funds)
- **Expected**: Pathway: ca-study-permit | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-020
- **Description**: Multiple Plausible Pathways (UK)
- **Expected**: Pathway: uk-youth-mobility | Status: ELIGIBLE
- **Actual**: Pathway: Skilled Worker Visa | Status: BLOCKED
- **Error**: N/A
\n
### CASE-021
- **Description**: Age Out Boundary (UK Youth Mobility > 30)
- **Expected**: Pathway: uk-skilled-worker | Status: BLOCKED
- **Actual**: Pathway: Skilled Worker Visa | Status: BLOCKED
- **Error**: N/A
\n
### CASE-022
- **Description**: UK High Potential Individual (Top 50 University)
- **Expected**: Pathway: uk-hpi | Status: ELIGIBLE
- **Actual**: Pathway: Skilled Worker Visa | Status: BLOCKED
- **Error**: N/A
\n
### CASE-023
- **Description**: Australia Working Holiday
- **Expected**: Pathway: au-working-holiday | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-024
- **Description**: Australia Working Holiday Blocked (Age > 35)
- **Expected**: Pathway: au-skilled-independent | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-025
- **Description**: Germany Blue Card (High Salary, IT)
- **Expected**: Pathway: de-blue-card | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A
\n
### CASE-026
- **Description**: Spain Non-Lucrative (Retiree / Passive Income)
- **Expected**: Pathway: es-non-lucrative | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-027
- **Description**: Spain Non-Lucrative Blocked (Insufficient Savings)
- **Expected**: Pathway: es-non-lucrative | Status: BLOCKED
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: BLOCKED
- **Error**: N/A
\n
### CASE-028
- **Description**: Contradictory Information: High School but PhD occupation
- **Expected**: Pathway: us-h1b | Status: BLOCKED
- **Actual**: Pathway: H-1B Specialty Occupation | Status: BLOCKED
- **Error**: N/A
\n
### CASE-029
- **Description**: Wrong Nationality for specific treaty (e.g. TN visa fallback to H1B)
- **Expected**: Pathway: us-h1b | Status: BLOCKED
- **Actual**: Pathway: H-1B Specialty Occupation | Status: BLOCKED
- **Error**: N/A
\n
### CASE-030
- **Description**: Perfect Canada Profile, but age 80
- **Expected**: Pathway: ca-express-entry | Status: ELIGIBLE
- **Actual**: Pathway: Express Entry (FSW / CEC) | Status: CONDITIONALLY_ELIGIBLE
- **Error**: N/A


## Methodology & Limitations
- **Baseline**: Used `gpt-4o-mini` with Plain TypeScript Orchestration.
- **Limitations**: The evidence retrieval is currently mocked for deterministic testing. True Recall@K would require a full vector database integration which is bypassed in this unit-test run.
- **Tradeoffs**: Running sequentially increases total evaluation time to ~1 minute, but guarantees we do not hit OpenAI Rate Limits.
