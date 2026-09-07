"use client";

/**
 * Header + full-screen index.
 *
 * The bar carries no navigation at all: identity, a live floor readout, and a
 * single INDEX toggle. Everything else lives behind the toggle, which opens a
 * full-screen panel the way a bay door does, three slats dropping in sequence.
 *
 * Hovering a destination surfaces real figures for it rather than decorative
 * shapes, because the whole point of this product is the numbers.
 *
 * Built on CSS transitions and a data attribute rather than an animation
 * library: it is a handful of transforms, and adding a dependency for that
 * would not earn its weight.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FEED = [
  { tag: "SCAN", body: "PGD1668M · BAY A1 · +24" },
  { tag: "APPROVED", body: "MX1473 · +8 · M. HADDAD" },
  { tag: "LOW", body: "Z619 · 2 REMAINING", warn: true },
  { tag: "SCAN", body: "KLM8891 · BAY B1 · +40" },
  { tag: "ORDER", body: "PO-1044 · IN TRANSIT" },
  { tag: "SYNCED", body: "10 QUEUED SCANS" },
];

type Entry = { label: string; href: string; meta: string };

const SIGNED_OUT: Entry[] = [
  { label: "Overview", href: "/", meta: "36 bays · 1,284 units · live" },
  { label: "Create account", href: "/signup", meta: "Free · no card · about a minute" },
  { label: "Sign in", href: "/login", meta: "Pick up where the floor left off" },
  { label: "Terms", href: "/terms", meta: "Updated 7 September 2026" },
  { label: "Privacy", href: "/privacy", meta: "Your data stays in your org" },
];

const SIGNED_IN: Entry[] = [
  { label: "Dashboard", href: "/dashboard", meta: "Inventory, approvals, orders" },
  { label: "Overview", href: "/", meta: "36 bays · 1,284 units · live" },
  { label: "Terms", href: "/terms", meta: "Updated 7 September 2026" },
  { label: "Privacy", href: "/privacy", meta: "Your data stays in your org" },
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
      <span className="feed-window relative h-4 w-[18rem] overflow-hidden">
        <span key={i} className="feed-line absolute inset-0 flex items-center gap-2">
          <span
            className={`mono text-[10px] font-bold tracking-[0.16em] ${
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
  const entries = isLoggedIn ? SIGNED_IN : SIGNED_OUT;

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  /* Escape closes, and the page behind must not scroll while it is open. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-7">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" className="h-full w-full object-contain" />
              </span>
              <span className="font-display text-base font-extrabold uppercase tracking-[0.02em]">
                Invems
              </span>
            </Link>
            <LiveFeed />
          </div>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-index"
            className="index-toggle group flex items-center gap-3"
          >
            {/* Two labels stacked; the pair slides to swap on state. */}
            <span className="relative block h-4 w-14 overflow-hidden">
              <span className="index-toggle__labels block" data-open={open}>
                <span className="mono block h-4 text-[11px] font-bold uppercase tracking-[0.22em]">
                  Index
                </span>
                <span className="mono block h-4 text-[11px] font-bold uppercase tracking-[0.22em]">
                  Close
                </span>
              </span>
            </span>
            <span
              className="index-toggle__glyph flex h-8 w-8 items-center justify-center rounded-md border border-border"
              data-open={open}
            >
              <span className="block h-px w-3.5 bg-foreground" />
              <span className="absolute block h-px w-3.5 bg-foreground" />
            </span>
          </button>
        </div>
      </header>

      {/* ── The index ──────────────────────────────────────────── */}
      <div
        id="site-index"
        className="site-index"
        data-open={open}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={close}
          className="site-index__backdrop"
        />

        <div ref={panelRef} className="site-index__panel" role="dialog" aria-modal="true" aria-label="Site index">
          {/* Bay door: three slats drop in sequence. */}
          <span className="site-index__slat" style={{ transitionDelay: open ? "0ms" : "160ms" }} />
          <span className="site-index__slat" style={{ transitionDelay: open ? "80ms" : "80ms" }} />
          <span className="site-index__slat" style={{ transitionDelay: open ? "160ms" : "0ms" }} />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center gap-10 px-6 pb-16 pt-24 lg:flex-row lg:items-center lg:justify-between">
            <nav>
              <ul>
                {entries.map((e, i) => (
                  <li key={e.href + e.label} className="overflow-hidden">
                    <Link
                      href={e.href}
                      tabIndex={open ? 0 : -1}
                      onClick={close}
                      onMouseEnter={() => setHovered(i)}
                      onFocus={() => setHovered(i)}
                      className="index-link group block py-1"
                      style={{ ["--d" as string]: `${0.28 + i * 0.055}s` }}
                    >
                      <span className="index-link__inner flex items-baseline gap-4">
                        <span className="mono text-[11px] text-muted-foreground">
                          0{i + 1}
                        </span>
                        <span className="font-display text-[2.4rem] font-extrabold uppercase leading-[1.02] tracking-[0.01em] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-[var(--brand-2)] sm:text-[3.4rem] lg:text-[4rem]">
                          {e.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Readout for the focused destination. Figures, not shapes. */}
            <aside className="index-readout w-full max-w-xs shrink-0" data-open={open}>
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Readout
              </p>
              <p
                key={hovered}
                className="feed-line mono mt-3 text-sm leading-relaxed text-[var(--brand-2)]"
              >
                {entries[hovered]?.meta}
              </p>
              <div className="mt-8 border-t border-border pt-5">
                {isLoggedIn ? (
                  <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Signed in · {userName || user?.email?.split("@")[0] || "you"}
                  </p>
                ) : (
                  <Link
                    href="/signup"
                    tabIndex={open ? 0 : -1}
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
                  >
                    Create account <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
