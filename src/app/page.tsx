"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ScanLineHero from "@/components/landing/ScanLineHero";
import BoxDive from "@/components/landing/BoxDive";
import RolesPan from "@/components/landing/RolesPan";
import DeadZone from "@/components/landing/DeadZone";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveals from "@/components/motion/ScrollReveals";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollReveals />
      <SiteNav />

      {/* ── Hero: the scan line ───────────────────────────────── */}
      <section className="pt-14">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24">
          <div>
            <div className="fade-up mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
              Warehouse management
            </div>

            {/* Each line rises from behind a clipped edge. */}
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.6rem]">
              <span className="word-line">
                <span className="word-rise" style={{ animationDelay: "0.05s" }}>
                  Point a phone at a box.
                </span>
              </span>
              <span className="word-line">
                <span
                  className="word-rise text-brand-gradient"
                  style={{ animationDelay: "0.19s" }}
                >
                  It becomes inventory.
                </span>
              </span>
            </h1>

            <p className="fade-up fade-up-2 mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              Invems turns a scan into a record the whole team works from.
              Workers scan on the floor and submit. Admins approve. Buyers
              order from what is actually on the shelf.
            </p>

            <div className="fade-up fade-up-3 mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={isLoggedIn ? "/dashboard" : "/signup"}
                className="press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
              >
                {isLoggedIn ? "Open your dashboard" : "Create your account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#open"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                See what a scan turns into
              </a>
            </div>

            <p className="fade-up fade-up-4 mono mt-8 text-[11px] tracking-wide text-muted-foreground">
              iPhone, Android and the web. Free while you set up.
            </p>
          </div>

          <div className="fade-up fade-up-4">
            <ScanLineHero />
          </div>
        </div>
      </section>

      {/* ── The dive: open the box ────────────────────────────── */}
      <div id="open" className="scroll-mt-14 border-t border-border">
        <BoxDive />
      </div>

      {/* ── The handoff ───────────────────────────────────────── */}
      <RolesPan />

      {/* ── The dead zone ─────────────────────────────────────── */}
      <DeadZone />

      {/* ── Close ─────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-24">
        <div className="reveal grain relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-glow">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(38rem 22rem at 50% -20%, color-mix(in oklab, var(--brand-2) 22%, transparent), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Start with one facility.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Make an account, add a shelf, scan your first box. Invite the
              rest of the team once it is running.
            </p>
            <Link
              href={isLoggedIn ? "/dashboard" : "/signup"}
              className="press mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              {isLoggedIn ? "Open your dashboard" : "Create your account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
