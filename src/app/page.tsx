"use client";

import Link from "next/link";
import {
  Package, BarChart3, Users, ScanLine, ShieldCheck, Building2,
  ArrowRight, Menu, X, Sun, Moon, Boxes, Apple, Smartphone, Quote,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

const features = [
  {
    icon: ScanLine,
    title: "Barcode Scanning",
    desc: "Scan items instantly with your phone camera. Manual entry fallback for any barcode type.",
  },
  {
    icon: Package,
    title: "Real-Time Inventory",
    desc: "Track stock levels across multiple facilities. Know exactly what you have, where it is.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Visual insights into your inventory flow. Low stock alerts, usage trends, and more.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    desc: "Workers scan & submit. Admins approve & manage. Buyers browse & order. Everyone stays in their lane.",
  },
  {
    icon: Building2,
    title: "Multi-Facility",
    desc: "Manage multiple warehouses from one account. Assign workers, track stock per location.",
  },
  {
    icon: ShieldCheck,
    title: "Approval Workflows",
    desc: "Nothing goes through without review. Orders, submissions, and changes require admin approval.",
  },
];

const stats = [
  { value: "10K+", label: "Items Tracked" },
  { value: "99.9%", label: "Uptime" },
  { value: "50%", label: "Time Saved" },
  { value: "24/7", label: "Support" },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Nav */}
      <nav className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">INVENTRACK</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm hover:text-primary transition">Features</Link>
              <Link href="/pricing" className="text-sm hover:text-primary transition">Pricing</Link>
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition">Log in</Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition shadow-lg shadow-primary/25"
              >
                Get Started
              </Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-4 space-y-3">
              <Link href="#features" className="block text-sm" onClick={() => setMobileMenu(false)}>Features</Link>
              <Link href="/pricing" className="block text-sm">Pricing</Link>
              <Link href="/login" className="block text-sm">Log in</Link>
              <Link href="/signup" className="block px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium text-center">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Now available on web & mobile
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight animate-fade-in-up leading-tight">
            Warehouse Management
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_8s_ease_infinite]">
              Made Simple
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto animate-fade-in-up-delay" style={{ color: "var(--muted)" }}>
            Scan, track, and manage your entire inventory operation from one platform.
            Real-time sync between mobile and web.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-xl shadow-primary/25 flex items-center gap-2 text-lg"
            >
              Start Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 rounded-2xl font-semibold border transition flex items-center gap-2 text-lg hover:border-primary"
              style={{ borderColor: "var(--border)" }}
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 animate-fade-in-up-delay-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition hover:border-primary" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <Apple className="w-4 h-4" /> App Store
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition hover:border-primary" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <Smartphone className="w-4 h-4" /> Google Play
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything you need</h2>
            <p className="mt-3 text-lg" style={{ color: "var(--muted)" }}>
              Built for teams that move fast and need to stay organized.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sign Up", desc: "Create your account and set up your organization in minutes." },
              { step: "2", title: "Add Inventory", desc: "Scan barcodes or import from spreadsheets. Organize by facility." },
              { step: "3", title: "Manage & Grow", desc: "Track orders, manage your team, and scale your operations." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full gradient-bg text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Trusted by warehouse teams</h2>
            <p className="mt-3 text-lg" style={{ color: "var(--muted)" }}>
              See what operations managers are saying about INVENTRACK.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We cut our inventory count time in half. The barcode scanning is incredibly fast and the real-time sync means no more spreadsheet nightmares.",
                name: "Marcus Chen",
                role: "Warehouse Manager",
                company: "Pacific Freight Co.",
              },
              {
                quote: "Managing three warehouses used to take an entire team. Now one person can oversee everything from the dashboard. The approval workflows saved us from costly errors.",
                name: "Sarah Donovan",
                role: "Operations Director",
                company: "Northpoint Logistics",
              },
              {
                quote: "Our seasonal staff can start scanning on day one with the mobile app. No training needed. The role-based access gives us confidence nothing slips through.",
                name: "James Okafor",
                role: "Supply Chain Lead",
                company: "Metro Distribution",
              },
            ].map((t) => (
              <div key={t.name} className="glass-card p-6 flex flex-col">
                <Quote className="w-8 h-8 text-primary/20 mb-3" />
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--muted)" }}>
                  {t.quote}
                </p>
                <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 gradient-bg opacity-5" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to streamline your warehouse?</h2>
              <p className="text-lg mb-8" style={{ color: "var(--muted)" }}>
                Join teams already managing their inventory smarter.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-xl shadow-primary/25 text-lg"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
            <Link href="/pricing" className="hover:text-primary transition">Pricing</Link>
            <Link href="/login" className="hover:text-primary transition">Login</Link>
            <Link href="/signup" className="hover:text-primary transition">Sign Up</Link>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>&copy; 2026 INVENTRACK. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
