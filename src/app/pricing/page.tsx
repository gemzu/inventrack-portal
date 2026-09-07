"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/primitives";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";

/**
 * Every line here is a feature that exists in the product today.
 * "Google Sheets sync" used to be listed and was never built; the real thing
 * is CSV import and export, which is what it now says.
 */
const INCLUDED = [
  "Unlimited users and facilities",
  "Unlimited inventory items",
  "Barcode scanning from the camera",
  "Label reading when there is no barcode",
  "Worker submissions and admin approvals",
  "Buyer storefronts and order management",
  "Role based access for workers, admins and buyers",
  "CSV import and export",
  "Analytics and activity history",
  "Offline scanning with automatic sync",
  "Push notifications",
  "In app support tickets",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="text-center">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
                Pricing
              </div>
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                It is free.
                <br />
                <span className="text-brand-gradient">All of it.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                Every feature, every user, every facility. There is no paid tier
                to graduate to and no card to enter.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mt-14 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow sm:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(34rem 18rem at 50% -10%, color-mix(in oklab, var(--brand-2) 20%, transparent), transparent 70%)",
                }}
              />

              <div className="relative">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="font-display text-6xl font-extrabold tracking-[-0.04em]">
                      $0
                    </span>
                    <span className="mono text-sm text-muted-foreground">/ month</span>
                  </div>
                  <p className="mono mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    No card. No trial clock.
                  </p>
                </div>

                <div className="my-9 h-px bg-border" />

                <ul className="grid gap-3 sm:grid-cols-2">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-gradient">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                      </span>
                      <span className="leading-snug text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className="press mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark"
                >
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-10 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Wondering how it stays free? Invems is early. We would rather
                have warehouses using it and telling us what breaks.
              </p>
              <p className="text-sm text-muted-foreground">
                Questions go to{" "}
                <a
                  href="mailto:support@alkasid.com"
                  className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-[var(--brand-1)]"
                >
                  support@alkasid.com
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
