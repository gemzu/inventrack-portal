"use client";

import Link from "next/link";
import {
  ArrowRight, Barcode, ClipboardCheck,
  ShoppingBag, WifiOff, Users, ScanLine,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Reveal } from "@/components/motion/primitives";
import ScanLineHero from "@/components/landing/ScanLineHero";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";

/* Every claim here is one the product actually makes good on. */
const CAPABILITIES = [
  {
    icon: WifiOff,
    title: "Works without signal",
    body: "Scans queue on the floor and sync the moment the connection comes back.",
  },
  {
    icon: Users,
    title: "Three roles, one app",
    body: "Workers, admins and buyers each get their own view of the same stock.",
  },
  {
    icon: ScanLine,
    title: "Barcode or label",
    body: "Scan the code. When there is no code, read the printed label instead.",
  },
  {
    icon: ClipboardCheck,
    title: "Nothing slips in",
    body: "What a worker submits waits for an admin to approve it before it counts.",
  },
];

const STEPS = [
  {
    icon: Barcode,
    title: "Scan it in",
    body: "Scan a barcode on the floor, or upload a CSV to load a whole facility at once.",
  },
  {
    icon: ShoppingBag,
    title: "Buyers order",
    body: "Buyers join with a storefront code, browse your catalog and place orders.",
  },
  {
    icon: ClipboardCheck,
    title: "Approve and ship",
    body: "Review what came in, approve it, then track the order out the door.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-14">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24">
          <div>
            <div className="fade-up mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
              Warehouse management
            </div>

            <h1 className="fade-up fade-up-1 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.6rem]">
              Point a phone at a box.
              <br />
              <span className="text-brand-gradient">It becomes inventory.</span>
            </h1>

            <p className="fade-up fade-up-2 mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              Invems turns a scan into a record the whole team works from.
              Workers scan on the floor and submit. Admins approve. Buyers
              order from what is actually on the shelf.
            </p>

            <div className="fade-up fade-up-3 mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={isLoggedIn ? "/dashboard" : "/signup"}
                className="press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark"
              >
                {isLoggedIn ? "Open your dashboard" : "Create your account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                See how a scan works
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

      {/* ── What it actually does ─────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-9 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 0.07}>
              <div>
                <cap.icon className="mb-3 h-5 w-5 text-[var(--brand-1)]" strokeWidth={2} />
                <h3 className="font-display text-[0.95rem] font-bold tracking-tight">
                  {cap.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {cap.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how" className="py-24 scroll-mt-14">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                From the shelf to the order.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Three steps, and no spreadsheet in the middle of them.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.09}>
                <div className="card-luxury hover-lift group h-full p-7">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[var(--btn-shadow)]">
                      <step.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="mono text-[11px] tracking-[0.18em] text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Close ─────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-glow">
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
                className="press mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark"
              >
                {isLoggedIn ? "Open your dashboard" : "Create your account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
