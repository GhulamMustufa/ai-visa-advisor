import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://borderless.ghulam-mustafa.com";

export const metadata: Metadata = {
  title: "Borderless AI — Free Visa Eligibility Checker",
  description:
    "Check your chances for 70+ visa types worldwide. AI-powered immigration advisor backed by official government data. No legal jargon. Instant results.",
  alternates: {
    canonical: BASE_URL,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Borderless AI",
  url: BASE_URL,
  description:
    "AI-powered immigration advisor. Check your visa eligibility across 70+ countries backed by official government data.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/explore?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Borderless AI",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.svg`,
  sameAs: [],
  description:
    "AI-powered immigration advisor helping people navigate visa eligibility across 70+ countries.",
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Borderless AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Check your visa eligibility across 70+ countries with AI-powered scoring based on official government data.",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      {children}
    </>
  );
}
