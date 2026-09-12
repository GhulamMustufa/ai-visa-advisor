import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Visa Pathways",
  description:
    "Browse 70+ visa programs by country, category, and eligibility score. Find the right immigration pathway for your profile — digital nomad, skilled worker, student, and more.",
  openGraph: {
    title: "Explore Visa Pathways — Borderless AI",
    description:
      "Browse 70+ visa programs by country, category, and eligibility score. Find the right immigration pathway for your profile.",
    url: "https://borderless.ghulam-mustafa.com/explore",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/explore",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
