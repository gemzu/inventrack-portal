"use client";

import Link from "next/link";
import {
  ScanLine, LayoutGrid, ShoppingBag, ArrowRight,
  Boxes, Barcode, Building2, Clock, ClipboardCheck,
  BarChart3, MessageCircle, Upload, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const { user, userName, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO (always dark) ─────────────────────────────── */}
      <section className="bg-zinc-950">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                <Boxes className="w-4 h-4 text-zinc-950" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">INVENTRACK</span>
            </Link>

            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-24 h-8" />
              ) : isLoggedIn ? (
                <>
                  <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                    Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold"
                  >
                    {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                    Start Managing <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Stop guessing. Start managing.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            INVENTRACK gives your warehouse team real-time visibility into every box, every order, every scan.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start Managing <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
            <a href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white")}>
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ──────────────────────────────── */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Built for warehouses</span>
          <span className="hidden sm:block text-zinc-300 dark:text-zinc-600">·</span>
          <span>Real-time tracking</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span>Multi-facility</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span>Role-based access</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span>Free forever</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how" className="bg-background py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-16">How it works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: ScanLine,
                title: "Workers Scan",
                desc: "Your team scans barcodes on the floor. Products enter the system automatically.",
              },
              {
                step: "2",
                icon: ClipboardCheck,
                title: "Admins Approve",
                desc: "Review submissions, manage inventory, control access — all from one dashboard.",
              },
              {
                step: "3",
                icon: ShoppingBag,
                title: "Buyers Order",
                desc: "Buyers browse your catalog, reserve items, and place orders. You approve and ship.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="bg-muted/50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">Built for every role</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ScanLine,
                title: "For Workers",
                tagline: "Scan. Submit. Done.",
                desc: "Workers scan barcodes, submit items, and track their shift — nothing more, nothing less.",
              },
              {
                icon: LayoutGrid,
                title: "For Admins",
                tagline: "Command your warehouse.",
                desc: "Real-time dashboard, inventory control, team management, analytics, and order approvals.",
              },
              {
                icon: ShoppingBag,
                title: "For Buyers",
                tagline: "Browse. Reserve. Order.",
                desc: "Browse available inventory, reserve items for 24 hours, and submit purchase orders.",
              },
            ].map((c) => (
              <Card key={c.title}>
                <CardContent className="p-7">
                  <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-4">
                    <c.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{c.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{c.tagline}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────── */}
      <section className="bg-background py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">What you get</h2>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { icon: Barcode, title: "Barcode Scanning", desc: "Scan any barcode with your phone camera. Instant lookup and submission." },
              { icon: Building2, title: "Multi-Facility", desc: "Manage multiple warehouses and assign workers per location." },
              { icon: Clock, title: "Team Shifts & Clock In", desc: "Track worker shifts, clock-in times, and daily activity." },
              { icon: ClipboardCheck, title: "Order Approvals", desc: "Review and approve every order before it ships." },
              { icon: BarChart3, title: "Analytics Dashboard", desc: "Visual insights into stock levels, trends, and team performance." },
              { icon: MessageCircle, title: "In-App Chat", desc: "Message your team directly from the dashboard." },
              { icon: Upload, title: "Bulk Import & Export", desc: "Upload spreadsheets or export your entire catalog in one click." },
              { icon: ShieldCheck, title: "Role-Based Access", desc: "Workers, admins, and buyers each see only what they need." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="bg-zinc-950 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
            Ready to take control?
          </h2>
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start Managing <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5 text-zinc-100" />
            </div>
            <span className="font-bold text-sm text-foreground">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>&copy; 2026 INVENTRACK</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
