"use client";

import Link from "next/link";
import { CheckCircle2, Boxes, Sun, Moon, ArrowLeft, Zap, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const features = [
  "Unlimited users",
  "Unlimited facilities",
  "Unlimited inventory items",
  "Barcode scanning & camera",
  "Advanced analytics dashboard",
  "Order management & approvals",
  "Role-based access control",
  "Google Sheets sync",
  "Multi-facility management",
  "Activity logs & history",
  "Priority support",
];

export default function PricingPage() {
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
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition">Log in</Link>
              <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center gap-1 text-sm mb-6 hover:text-primary transition" style={{ color: "var(--muted)" }}>
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              One plan. Full access.
            </h1>
            <p className="mt-4 text-lg" style={{ color: "var(--muted)" }}>
              No hidden fees. No app store markups. Pay directly and save 30%.
            </p>
          </div>

          {/* Single plan card */}
          <div className="glass-card p-8 sm:p-10 relative ring-2 ring-primary">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Full Access
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">INVENTRACK Subscription</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Everything you need to manage your warehouse operations.
              </p>
              <div className="mt-6">
                <span className="text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Coming Soon
                </span>
                <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>Pricing will be announced shortly</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="block text-center py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/25 text-lg flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Why pay on web */}
          <div className="mt-12 glass-card p-8 text-center">
            <h3 className="text-lg font-bold mb-3">Why pay on our website?</h3>
            <div className="grid sm:grid-cols-3 gap-6 text-sm" style={{ color: "var(--muted)" }}>
              <div>
                <div className="text-2xl font-bold text-danger mb-1">30%</div>
                <p>App stores charge up to 30% on every payment</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-success mb-1">0%</div>
                <p>We pass those savings directly to you</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">Instant</div>
                <p>Subscribe on web, access unlocks immediately in the app</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Questions? Contact us at support@alkasid.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
