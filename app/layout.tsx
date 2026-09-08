import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Borderless AI — check your visa chances",
  description:
    "Estimate visa route fit with a quick profile—demo tool, not legal advice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (function() {
      try {
        var saved = localStorage.getItem("visa-score-theme");
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        var theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
      } catch (_) {}
    })();
  `;

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased text-foreground`}
        >
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
