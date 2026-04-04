"use client";

import Link from "next/link";
import {
  ScanLine, LayoutGrid, ShoppingBag, ArrowRight, Menu, X,
  Sun, Moon, Boxes, Barcode, Building2, Clock, ClipboardCheck,
  BarChart3, MessageCircle, Upload, ShieldCheck, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, userName, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ── HERO (blueprint dark, always) ─────────────────── */}
      <section className="blueprint-bg relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 animated-gradient bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        {/* Top Nav */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Boxes className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">INVENTRACK</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-white/5 transition text-slate-400"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="btn-primary text-sm">
                    Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/dashboard" className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary text-sm">
                    Start Managing <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>

            <button className="md:hidden p-2 text-slate-400" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileMenu && (
            <div className="md:hidden border-t border-slate-800 pb-4 pt-3 space-y-3">
              {isLoggedIn ? (
                <Link href="/dashboard" className="block btn-primary text-sm text-center" onClick={() => setMobileMenu(false)}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="block text-sm text-slate-300" onClick={() => setMobileMenu(false)}>
                    Log in
                  </Link>
                  <Link href="/signup" className="block btn-primary text-sm text-center" onClick={() => setMobileMenu(false)}>
                    Start Managing
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight animate-slide-up">
            Stop guessing. Start managing.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-slide-up-delay-1">
            INVENTRACK gives your warehouse team real-time visibility into every box, every order, every scan.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up-delay-2">
            <Link href="/signup" className="btn-primary text-base px-8 py-3">
              Start Managing Your Warehouse <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how" className="btn-secondary text-base px-8 py-3 text-slate-300 border-slate-600 hover:border-blue-500">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ──────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Built for warehouses</span>
          <span className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700" />
          {["Real-time tracking", "Multi-facility", "Role-based access", "Free forever"].map((pill, i) => (
            <span
              key={pill}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 animate-bounce-in stagger-${i + 1}`}
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how" className="bg-white dark:bg-slate-950 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-slate-200 dark:bg-slate-700" />

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
                desc: "Review submissions, manage inventory, control access \u2014 all from one dashboard.",
              },
              {
                step: "3",
                icon: ShoppingBag,
                title: "Buyers Order",
                desc: "Buyers browse your catalog, reserve items, and place orders. You approve and ship.",
              },
            ].map((s, i) => (
              <div key={s.step} className={`text-center relative card-enter-up stagger-${i + 1}`}>
                <div className="w-14 h-14 rounded-full bg-blue-500 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 relative z-10">
                  {s.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES AS USE-CASES ─────────────────────────── */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Built for every role</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ScanLine,
                title: "For Workers",
                tagline: "Scan. Submit. Done.",
                desc: "Workers scan barcodes, submit items, and track their shift \u2014 nothing more, nothing less.",
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
              <div key={c.title} className="card-interactive tilt-hover p-7">
                <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{c.title}</h3>
                <p className="text-sm font-medium text-blue-500 mb-3">{c.tagline}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-950 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">What you get</h2>
          </div>

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
            ].map((f, i) => (
              <div key={f.title} className={`flex items-start gap-4 ${i % 2 === 0 ? 'card-enter-left' : 'card-enter-right'} stagger-${i + 1}`}>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="bg-slate-900 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-slide-up">
            Ready to take control of your inventory?
          </h2>
          <div className="mt-8 animate-slide-up-delay-1">
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
              Start Managing Your Warehouse <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span>&copy; 2026 INVENTRACK</span>
            <Link href="/terms" className="hover:text-blue-500 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-blue-500 transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
