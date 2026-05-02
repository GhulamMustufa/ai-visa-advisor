import type { TargetRegion } from "./types";

export type RagSource = {
  id: string;
  region: TargetRegion;
  title: string;
  url: string;
  summary: string;
  criteria: string;
};

const SOURCES: RagSource[] = [
  {
    id: "ircc-ee",
    region: "canada",
    title: "IRCC Express Entry",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    summary: "Official federal pathway for skilled immigration with ranking-based invitations.",
    criteria: `- CRS score typically needs 470+ for general draws (varies each round)
- Minimum CLB 7 (IELTS 6.0 each band) for TEER 0/1/2/3 occupations
- At least 1 year of skilled work experience in the past 10 years required
- Foreign degrees require ECA (WES or equivalent credential assessment)
- Settlement funds: ~CAD $13,757 single applicant / $17,127 with one dependent`,
  },
  {
    id: "ircc-study",
    region: "canada",
    title: "IRCC Study Permit",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    summary: "Study permit requirements, funds proof, and compliance obligations.",
    criteria: `- Letter of Acceptance from a Designated Learning Institution (DLI) required
- Proof of funds: tuition fees + CAD $10,000/yr living expenses (CAD $11,000 in Quebec)
- No federal IELTS minimum for permit (set by institution; typically 6.0–6.5 overall)
- Intent to leave Canada after studies must be demonstrated
- Student Direct Stream (SDS): faster processing for eligible countries with stricter criteria`,
  },
  {
    id: "govuk-swv",
    region: "uk",
    title: "GOV.UK Skilled Worker Visa",
    url: "https://www.gov.uk/skilled-worker-visa",
    summary: "Points-based work route requiring sponsorship, salary thresholds, and English proof.",
    criteria: `- Job offer from a UK Home Office–licensed sponsor (Certificate of Sponsorship) required
- Salary floor: £26,200/yr general minimum (or role-specific going rate if higher)
- English B1 minimum (IELTS 4.0 each band) required
- Mandatory 50 points: sponsored job (20 pts) + salary (20 pts) + English (10 pts)
- NHS Immigration Health Surcharge: £1,035/yr (paid upfront for full visa term)`,
  },
  {
    id: "govuk-student",
    region: "uk",
    title: "GOV.UK Student Visa",
    url: "https://www.gov.uk/student-visa",
    summary: "Student visa requirements including CAS, funds, and language conditions.",
    criteria: `- Confirmation of Acceptance for Studies (CAS) from a UKVI-licensed institution required
- Funds: full tuition + £1,334/month (London) or £1,023/month (outside London) for up to 9 months
- English B2 minimum (IELTS 5.5 each band) typically required by institutions
- Graduate Route: 2 years post-study work rights (3 years for PhD) after degree completion
- Parental consent required if under 18`,
  },
  {
    id: "homeaffairs-au",
    region: "australia-new-zealand",
    title: "Australian Department of Home Affairs Visa Finder",
    url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-finder",
    summary: "Official listing and requirements for Australian migration pathways.",
    criteria: `- 65 points minimum to lodge Skilled Independent (subclass 189); competitive invitations need 80+
- Age 25–32 scores highest (30 pts); zero points at 45+
- English: Competent (IELTS 6.0) = 0 bonus; Proficient (IELTS 7.0) = +10 pts; Superior (IELTS 8.0) = +20 pts
- Occupation must appear on MLTSSL or relevant skilled occupation list
- Skills assessment from relevant authority required (e.g., Engineers Australia, VETASSESS, AHPRA)`,
  },
  {
    id: "immigration-nz",
    region: "australia-new-zealand",
    title: "Immigration New Zealand",
    url: "https://www.immigration.govt.nz/new-zealand-visas",
    summary: "Visa categories and criteria for work, study, and residence.",
    criteria: `- Skilled Migrant Category: 160+ points to enter selection pool; highest scorers invited first
- Job offer in NZ: +50 pts (60 pts if skilled/shortage occupation); age 20–39: up to +30 pts
- English: IELTS overall 6.5 (no band below 6.0) for residence applications
- Green List occupations (Tier 1): direct residence pathway without job offer for some roles
- Expression of Interest (EOI) pool drawn approximately every 2–3 weeks`,
  },
  {
    id: "germany-makeit",
    region: "germany-nordics",
    title: "Make it in Germany",
    url: "https://www.make-it-in-germany.com/en/visa-residence",
    summary: "German visa and residence pathways for qualified professionals.",
    criteria: `- Skilled worker visa: recognized German or equivalent foreign qualification required
- Job offer with salary meeting industry standards required; employer must register with BA
- German language (A1 for family reunification; B1–B2 for most skilled worker jobs)
- Skilled Immigration Act (2023): vocational workers and IT specialists with experience may qualify
- PR (Niederlassungserlaubnis): typically 4 years; 2 years with Blue Card + German B1`,
  },
  {
    id: "eu-blue-card",
    region: "germany-nordics",
    title: "EU Blue Card Network",
    url: "https://www.apply.eu/",
    summary: "Pan-EU information on Blue Card requirements and national variations.",
    criteria: `- University degree of at least 3 years required (IT professionals may qualify without degree)
- Job offer with min salary: Germany €48,300/yr general (€37,440 for shortage occupations in 2024)
- Contract must be at least 6 months with a licensed employer in the issuing EU state
- Shortage occupations (STEM, doctors, nurses): lower salary threshold applies
- EU mobility: after 18 months, holder can move to another EU member state`,
  },
  {
    id: "euro-immigration-portal",
    region: "southern-europe",
    title: "EU Immigration Portal",
    url: "https://immigration-portal.ec.europa.eu/index_en",
    summary: "Official EU country-by-country migration information and process links.",
    criteria: `- Portugal D7 Passive Income Visa: ~€760/month passive income; no job offer needed; leads to PR
- Spain Non-Lucrative Visa: ~€2,400/month passive income; work not permitted on this visa
- Italy Decreto Flussi quota: annual work permit (very competitive; quota fills within minutes of opening)
- Greece Golden Visa: €250,000 property investment minimum; 5-year renewable; PR pathway
- Most Southern EU work visas require job offer + recognized qualifications + local language B1+`,
  },
  {
    id: "uae-mohre",
    region: "middle-east",
    title: "UAE Ministry of Human Resources and Emiratisation",
    url: "https://www.mohre.gov.ae/",
    summary: "Employer-led labor pathways and work permit compliance guidance in UAE.",
    criteria: `- UAE Golden Visa: investors (AED 2M+), outstanding graduates, or skilled professionals (min AED 30K/month)
- Standard work permit: employer-sponsored; employer must be registered with MOHRE
- No IELTS requirement for work permits; English widely sufficient for corporate roles in UAE
- Pakistani nationals: visa-on-arrival not available; prior employment contract required
- Typical processing: 2–4 weeks for standard work permit with complete employer sponsorship`,
  },
  {
    id: "travel-state-us-visa",
    region: "usa",
    title: "U.S. Department of State Visa Information",
    url: "https://travel.state.gov/content/travel/en/us-visas.html",
    summary: "Official visa categories and process information for U.S. entries.",
    criteria: `- H-1B specialty occupation: bachelor's degree minimum + US employer sponsorship required
- H-1B cap: 65,000 regular + 20,000 US master's cap exemption; lottery if oversubscribed
- F-1 student: SEVIS fee + Form I-20 from US institution; typically IELTS 6.0–6.5 min
- B-1/B-2 visitor: no set financial floor but bank statements reviewed; refusal rate high for Pakistan
- Pakistani passport: no visa-on-arrival; all categories require embassy interview in Islamabad/Karachi`,
  },
  {
    id: "uscis-working-us",
    region: "usa",
    title: "USCIS Working in the U.S.",
    url: "https://www.uscis.gov/working-in-the-united-states",
    summary: "Employer-based U.S. work options and petition pathways.",
    criteria: `- H-1B: employer files LCA + I-129 petition; 6-year maximum (extendable if green card pending)
- EB-1A extraordinary ability: no job offer required; very high evidence threshold (publications, awards)
- EB-2/EB-3 PERM: labor market test required; employer-sponsored; Pakistan EB backlog is 5–10+ years
- O-1 extraordinary ability: arts, science, business top talents; no annual cap
- TN visa (NAFTA): only available to Canadian and Mexican nationals, not Pakistani nationals`,
  },
  {
    id: "mom-singapore",
    region: "sg-my",
    title: "Singapore Ministry of Manpower Work Passes",
    url: "https://www.mom.gov.sg/passes-and-permits",
    summary: "Official permit and eligibility framework for employment in Singapore.",
    criteria: `- Employment Pass (EP): min S$5,000/month (S$5,500 for financial services); degree required
- S Pass: min S$3,150/month; diploma level accepted; employer quota limits apply
- Tech.Pass: min S$22,500/month or 5+ years senior tech experience; no employer sponsor needed
- Points-Based System (PBS) assesses age, salary, qualifications, company diversity
- Dependent's Pass: main pass holder must earn min S$6,000/month`,
  },
  {
    id: "imi-malaysia",
    region: "sg-my",
    title: "Malaysia Immigration Department",
    url: "https://www.imi.gov.my/",
    summary: "Official source for visas, passes, and immigration procedures in Malaysia.",
    criteria: `- Employment Pass Cat I: min RM 10,000/month; degree + relevant experience required
- Employment Pass Cat II: RM 5,000–9,999/month; 2+ years experience required
- MM2H (My Second Home): min offshore income RM 40,000/month + fixed deposit; 5-year renewable
- No IELTS requirement for work pass; English proficiency checked informally during processing
- Processing: 1–3 months for Employment Pass with complete documents`,
  },
  {
    id: "isa-japan",
    region: "jp-kr",
    title: "Immigration Services Agency of Japan",
    url: "https://www.moj.go.jp/isa/",
    summary: "Official Japanese immigration pathways and procedural requirements.",
    criteria: `- Engineer/Specialist in Humanities visa: relevant degree + job offer from Japanese company required
- Highly Skilled Professional (HSP): 70+ points on METI scoring table grants priority processing
- Japanese language proficiency N3–N2 strongly preferred; many employers require it for office roles
- No official salary floor but must match Japanese national salary standards for the role
- Certificate of Eligibility applied for by employer first; typical processing 1–3 months`,
  },
  {
    id: "hikorea",
    region: "jp-kr",
    title: "HiKorea Immigration Portal",
    url: "https://www.hikorea.go.kr/",
    summary: "Korean immigration portal for visas and status management.",
    criteria: `- E-7 (Specific Activities): job offer in designated professional category + relevant degree required
- TOPIK Level 4+ Korean proficiency strongly required for most E-7 categories
- Minimum salary: must meet Korean minimum wage (KRW 2,060,740/month as of 2024)
- F-2 Resident status: requires 2+ years on E-7 + sufficient points on merit-based assessment
- Points system for F-2: education, age, Korean income, Korean language ability assessed`,
  },
  {
    id: "iata-travel-centre",
    region: "easy-entry",
    title: "IATA Travel Centre",
    url: "https://www.iatatravelcentre.com/",
    summary: "Officially maintained travel entry requirement lookup by passport and destination.",
    criteria: `- Pakistani passport: Henley Index rank ~97; visa-on-arrival to ~33 countries as of 2024
- Easy-access destinations: Cambodia, Maldives, Nepal, Sri Lanka, Tanzania, Zambia, Rwanda
- Visa-on-arrival typically requires: return ticket, accommodation proof, ~$50–100 fee
- Most allow 30-day stay; extension possible in some countries
- Study/work pathways exist in some easy-entry countries (Cambodia, Rwanda) but are limited`,
  },
];

export function retrieveSources(
  region: TargetRegion,
  goal: string,
  limit = 3,
): RagSource[] {
  const regionDocs = SOURCES.filter((s) => s.region === region);
  const ranked = regionDocs
    .map((doc) => {
      const g = goal.toLowerCase();
      const bonus =
        (g.includes("work") && /work|labor|employment|permit/i.test(doc.summary + doc.title)) ||
        (g.includes("study") && /study|student/i.test(doc.summary + doc.title)) ||
        (g.includes("pr") && /residence|immigration|pathway/i.test(doc.summary + doc.title))
          ? 1
          : 0;
      return { doc, score: bonus };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.doc);
  return ranked.slice(0, limit);
}
