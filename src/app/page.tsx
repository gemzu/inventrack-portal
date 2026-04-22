"use client";

import Link from "next/link";
import {
  ScanLine, ShoppingBag, ArrowRight, ArrowUpRight,
  Boxes, Barcode, Building2, Clock, ClipboardCheck,
  BarChart3, MessageCircle, Upload, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import FadeIn from "@/components/FadeIn";

/* ── Fake terminal lines for hero visual ────────────────── */
const TERMINAL_LINES = [
  { time: "09:41:22", action: "SCAN", detail: "PGD1668M", status: "ok" },
  { time: "09:41:23", action: "LOOKUP", detail: "inventory → found", status: "ok" },
  { time: "09:41:24", action: "APPROVE", detail: "Order #047 confirmed", status: "ok" },
  { time: "09:42:01", action: "ALERT", detail: "Low stock: Z619 (qty: 2)", status: "warn" },
  { time: "09:42:15", action: "SCAN", detail: "MX1473", status: "ok" },
  { time: "09:42:16", action: "ADD", detail: "→ inventory (qty: 8)", status: "ok" },
];

export default function LandingPage() {
  const { user, userName, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-100">

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0c0c0f]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <Boxes className="w-3.5 h-3.5 text-zinc-950" />
            </div>
            <span className="text-sm font-semibold tracking-wide">INVENTRACK</span>
          </Link>

          <div className="flex items-center gap-5">
            {loading ? (
              <div className="w-20 h-8" />
            ) : isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1">
                  Dashboard <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link href="/dashboard" className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 hover:border-zinc-500 transition-colors">
                  {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors">
                  Log in
                </Link>
                <Link href="/signup" className="text-xs font-medium bg-zinc-100 text-zinc-950 px-3.5 py-1.5 rounded hover:bg-white transition-colors">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="pt-14">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: Copy */}
          <div className="pt-4">
            <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 pulse-dot" />
              Warehouse Management
            </div>

            <h1 className="fade-up fade-up-1 text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] text-zinc-50">
              Stop guessing.
              <br />
              <span className="text-zinc-500">Start managing.</span>
            </h1>

            <p className="fade-up fade-up-2 mt-6 text-base text-zinc-500 leading-relaxed max-w-md">
              Real-time visibility into every box, every order, every scan.
              Built for teams that run warehouses, not spreadsheets.
            </p>

            <div className="fade-up fade-up-3 mt-10 flex items-center gap-4">
              <Link href="/signup" className="text-sm font-medium bg-indigo-500 text-zinc-950 px-5 py-2.5 rounded hover:bg-indigo-400 press">
                Start managing your warehouse
              </Link>
              <a href="#how" className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
                How it works →
              </a>
            </div>
          </div>

          {/* Right: Terminal */}
          <div className="fade-up fade-up-4 rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden lg:mt-8">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] text-zinc-600 font-mono ml-2">scan.log — live</span>
            </div>
            <div className="p-4 font-mono text-xs space-y-1.5">
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className="type-line flex items-center gap-3">
                  <span className="text-zinc-600 shrink-0">{line.time}</span>
                  <span className={cn(
                    "w-16 shrink-0 font-medium",
                    line.status === "warn" ? "text-indigo-500" : "text-zinc-500"
                  )}>
                    {line.action}
                  </span>
                  <span className={cn(
                    line.status === "warn" ? "text-indigo-500/70" : "text-zinc-400"
                  )}>
                    {line.detail}
                  </span>
                </div>
              ))}
              <div className="type-line flex items-center gap-3 mt-1">
                <span className="text-zinc-600">09:42:30</span>
                <span className="text-zinc-700">_</span>
                <span className="w-2 h-3.5 bg-indigo-500/60 animate-blink" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS BAR ───────────────────────────────────── */}
      <section className="border-y border-zinc-800/50">
        <FadeIn direction="up">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Barcodes scanned", value: "14,200+" },
            { label: "Orders processed", value: "2,400+" },
            { label: "Facilities active", value: "38" },
            { label: "Uptime", value: "99.9%" },
          ].map((s, i) => (
            <div key={s.label} className={`counter-in counter-in-${i + 1}`}>
              <div className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">{s.value}</div>
              <div className="text-[11px] text-zinc-600 mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
        </FadeIn>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn direction="up">
          <p className="text-[11px] text-indigo-500 uppercase tracking-widest font-medium mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-16">
            Three roles. One system.
          </h2>

          </FadeIn>
          <div className="grid md:grid-cols-3 gap-px bg-zinc-800 rounded-lg overflow-hidden">
            {[
              {
                num: "01",
                icon: ScanLine,
                title: "Workers scan",
                desc: "Your team scans barcodes on the warehouse floor. Items enter the system automatically — green means approved, white means flagged.",
              },
              {
                num: "02",
                icon: ClipboardCheck,
                title: "Admins approve",
                desc: "Review submissions. Approve orders. Manage inventory, teams, and facilities from one command center.",
              },
              {
                num: "03",
                icon: ShoppingBag,
                title: "Buyers order",
                desc: "Buyers browse available stock, reserve items for 24 hours, and submit purchase orders. You approve and ship.",
              },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 150} direction="up">
                <div className="bg-zinc-900 p-8 group hover-up cursor-default h-full">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono text-zinc-600">{step.num}</span>
                    <step.icon className="w-5 h-5 text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-200 mb-3">{step.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <FadeIn direction="up">
            <p className="text-[11px] text-indigo-500 uppercase tracking-widest font-medium mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-16">
              Everything you need. Nothing you don&apos;t.
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
            {[
              { icon: Barcode, title: "Barcode scanning", desc: "Camera-based scanning with manual entry fallback." },
              { icon: Building2, title: "Multi-facility", desc: "Manage warehouses across different locations." },
              { icon: Clock, title: "Shift tracking", desc: "Clock in/out with real-time team activity." },
              { icon: ClipboardCheck, title: "Order approvals", desc: "Buyer orders require admin review before processing." },
              { icon: BarChart3, title: "Analytics", desc: "Inventory trends, worker stats, and usage insights." },
              { icon: MessageCircle, title: "In-app chat", desc: "Direct messaging between admins, workers, and buyers." },
              { icon: Upload, title: "Bulk import", desc: "CSV upload for inventory and export for reports." },
              { icon: ShieldCheck, title: "Role-based access", desc: "Each role sees exactly what they need. Nothing more." },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 80} direction="up">
                <div className="group hover-up cursor-default">
                  <f.icon className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-indigo-500 transition-colors" />
                  <h3 className="text-sm font-semibold text-zinc-200 mb-1">{f.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <FadeIn direction="up">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
              Ready to take control?
            </h2>
            <p className="text-zinc-500 mb-10">
              Free forever. No credit card. No limits.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-medium bg-indigo-500 text-zinc-950 px-6 py-3 rounded hover:bg-indigo-400 press">
              Start managing your warehouse <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/50 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">
              <Boxes className="w-3 h-3 text-zinc-400" />
            </div>
            <span className="text-xs font-medium text-zinc-600">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-600">
            <span>&copy; 2026</span>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
