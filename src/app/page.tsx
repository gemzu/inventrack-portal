"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ScanWallHero from "@/components/landing/ScanWallHero";
import ProductRail from "@/components/landing/ProductRail";
import DeadZone from "@/components/landing/DeadZone";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveals from "@/components/motion/ScrollReveals";
import ScanText from "@/components/motion/ScanText";
import EventTicker from "@/components/landing/EventTicker";
import LiveCount from "@/components/motion/LiveCount";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollReveals />
      <SiteNav />

      {/* ── Hero: the wall is the page ────────────────────────── */}
      <ScanWallHero>
        <p className="fade-up mono mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
          Bay A to F · <LiveCount /> units · live
        </p>

        {/* The boot beam sweeps and the headline resolves in its wake. */}
        <h1 className="max-w-3xl font-display text-[2.9rem] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-[4.6rem]">
          <ScanText
            as="span"
            text="Warehouse stock,"
            immediate
            delay={0.24}
            className="block"
          />
          <ScanText
            as="span"
            text="live from the floor."
            immediate
            gradient
            delay={0.52}
            className="block"
          />
        </h1>

        <div className="fade-up fade-up-3 mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            {isLoggedIn ? "Open dashboard" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <span className="mono ml-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            iOS · Android · Web · Free
          </span>
        </div>
      </ScanWallHero>

      {/* Ambient floor feed. Something is always moving. */}
      <EventTicker />

      {/* ── Real surfaces ─────────────────────────────────────── */}
      <ProductRail />

      {/* ── Offline ───────────────────────────────────────────── */}
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
            <ScanText
              as="h2"
              text="Start with one shelf."
              className="block font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl"
            />
            <Link
              href={isLoggedIn ? "/dashboard" : "/signup"}
              className="press mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              {isLoggedIn ? "Open dashboard" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
