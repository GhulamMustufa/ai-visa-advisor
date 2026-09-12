import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your Visa Assessment",
  description:
    "Answer a few quick questions and get a personalized AI score for your top visa pathways in seconds. Free, instant, and based on official government rules.",
  openGraph: {
    title: "Start Your Visa Assessment — Borderless AI",
    description:
      "Answer a few quick questions and get a personalized AI score for your top visa pathways in seconds.",
    url: "https://borderless.ghulam-mustafa.com/form",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/form",
  },
};

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
