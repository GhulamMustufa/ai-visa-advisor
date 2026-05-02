"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

type Theme = "light" | "dark";

function themeIcon(theme: Theme) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm0-15a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7 8a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM7 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm9.657 5.243a1 1 0 0 1 1.414 0l1.415 1.414a1 1 0 0 1-1.415 1.414l-1.414-1.414a1 1 0 0 1 0-1.414Zm-11.314 0a1 1 0 0 1 0 1.414L3.93 20.07a1 1 0 1 1-1.415-1.414l1.414-1.414a1 1 0 0 1 1.414 0Zm12.728-12.728a1 1 0 0 1 1.415 1.414l-1.415 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414ZM5.343 4.515a1 1 0 0 1 1.414 0l1.414 1.414A1 1 0 0 1 6.757 7.343L5.343 5.93a1 1 0 0 1 0-1.414ZM12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a.75.75 0 0 0-1.05-.88A10 10 0 1 0 20.88 15.55A.75.75 0 0 0 20 14.5Z"
      />
    </svg>
  );
}

export function Header({ initialUser }: { initialUser: User | null }) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      setTheme(current);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", initial);
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("visa-score-theme", next);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Visa Score
        </Link>

        <nav className="flex items-center gap-5 text-sm text-muted">
          <Link href="/form" className="transition-colors hover:text-foreground">
            Assessment
          </Link>
          <Link href="/explore" className="transition-colors hover:text-foreground">
            Explore
          </Link>

          {initialUser ? (
            <>
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-indigo-600"
              >
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/80 bg-background text-foreground transition hover:bg-slate-100"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {themeIcon(theme)}
          </button>
        </nav>
      </div>
    </header>
  );
}
