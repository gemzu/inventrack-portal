"use client";

/**
 * The public-site header, built as a live ops bar rather than a link menu.
 *
 * A warehouse is never still, so the header carries a running feed of floor
 * events. It gives the page a pulse before the visitor scrolls or clicks
 * anything, and it is the product's own data rather than decoration.
 *
 * Signed-out is the default render while auth resolves, so the bar never
 * paints empty on first load.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FEED = [
  { tag: "SCAN", body: "PGD1668M · BAY A1 · +24" },
  { tag: "APPROVED", body: "MX1473 · +8 · M. HADDAD" },
  { tag: "LOW", body: "Z619 · 2 REMAINING", warn: true },
  { tag: "SCAN", body: "KLM8891 · BAY B1 · +40" },
  { tag: "ORDER", body: "PO-1044 · IN TRANSIT" },
  { tag: "SYNCED", body: "10 QUEUED SCANS" },
  { tag: "SCAN", body: "VX7735 · BAY B3 · +31" },
];

function LiveFeed() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % FEED.length), 2600);
    return () => clearInterval(id);
  }, []);

  const item = FEED[i];

  return (
    <div className="hidden items-center gap-2.5 md:flex" aria-hidden>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-2)] opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
      </span>
      <span className="mono text-[10px] tracking-[0.16em] text-muted-foreground/70">LIVE</span>
      {/* Fixed width so the bar never reflows as entries change length. */}
      <span className="feed-window relative h-4 w-[19rem] overflow-hidden">
        <span key={i} className="feed-line absolute inset-0 flex items-center gap-2">
          <span
            className={`mono text-[10px] font-bold tracking-[0.14em] ${
              item.warn ? "text-warning" : "text-[var(--brand-2)]"
            }`}
          >
            {item.tag}
          </span>
          <span className="mono truncate text-[10px] tracking-[0.12em] text-muted-foreground">
            {item.body}
          </span>
        </span>
      </span>
    </div>
  );
}

export default function SiteNav() {
  const { user, userName, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="font-display text-sm font-extrabold tracking-tight">Invems</span>
          </Link>

          <LiveFeed />
        </div>

        <div className="flex shrink-0 items-center gap-5">
          {isLoggedIn ? (
            <>
              <span className="mono hidden rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:block">
                {userName || user?.email?.split("@")[0] || "signed in"}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
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
