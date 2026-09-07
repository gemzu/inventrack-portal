"use client";

/**
 * The public-site nav. One component so the landing, pricing and legal pages
 * cannot drift apart again.
 *
 * Signed-out is the default render while auth is still resolving, so the bar
 * never paints empty on first load (a marketing page must show its CTA
 * immediately, and most visitors are signed out anyway).
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SiteNav() {
  const { user, userName, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-sm font-bold tracking-tight">Invems</span>
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/pricing"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Pricing
          </Link>

          {isLoggedIn ? (
            <>
              <span className="hidden rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground sm:block">
                Signed in as {userName || user?.email?.split("@")[0] || "there"}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark"
              >
                Open dashboard <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
