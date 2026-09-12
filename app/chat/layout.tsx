import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Immigration Chat",
  description:
    "Ask our AI anything about visas, work permits, or moving abroad. Powered by official government data from 70+ countries. Free to start.",
  openGraph: {
    title: "AI Immigration Chat — Borderless AI",
    description:
      "Ask our AI anything about visas, work permits, or moving abroad. Powered by official government data from 70+ countries.",
    url: "https://borderless.ghulam-mustafa.com/chat",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/chat",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Spain Digital Nomad Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Spain's Digital Nomad Visa (DNV) allows non-EU remote workers and freelancers to live in Spain. Applicants must earn at least €2,334/month and work primarily for clients outside Spain.",
      },
    },
    {
      "@type": "Question",
      name: "How do I qualify for Canada Express Entry?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Canada Express Entry uses a Comprehensive Ranking System (CRS). Key factors include age, education, work experience, and language proficiency. Candidates with higher CRS scores receive invitations to apply for permanent residency.",
      },
    },
    {
      "@type": "Question",
      name: "What countries offer a Digital Nomad Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Over 50 countries now offer digital nomad or remote worker visas, including Portugal, Spain, Germany, UAE, Costa Rica, Thailand, and Indonesia (Bali). Each has different income, insurance, and duration requirements.",
      },
    },
    {
      "@type": "Question",
      name: "Can AI help me determine my visa eligibility?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Borderless AI scores your eligibility across 70+ visa pathways using a deterministic rules engine grounded in official government data. It provides an honest probability score, not legal advice.",
      },
    },
  ],
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}

