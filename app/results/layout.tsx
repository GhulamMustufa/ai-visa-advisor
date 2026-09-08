import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Visa Assessment Results",
  description:
    "See your personalized AI visa score and ranked pathways. Understand your eligibility before applying.",
  // Results are personalised and dynamic — don't index them
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
