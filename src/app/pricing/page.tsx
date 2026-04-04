"use client";

import Link from "next/link";
import { CheckCircle2, Boxes, Sun, Moon, ArrowLeft, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground">
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
            <Link href="/" className="inline-flex items-center gap-1 text-sm mb-6 hover:text-primary transition text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              INVENTRACK is free for everyone.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Full access to every feature. No payment required. No limits.
            </p>
          </div>

          {/* Single plan card */}
          <div className="rounded-xl border bg-card p-8 sm:p-10 relative ring-2 ring-success">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-success text-white text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Free Forever
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">INVENTRACK Full Access</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to manage your warehouse operations.
              </p>
              <div className="mt-6">
                <span className="text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  $0
                </span>
                <p className="text-sm mt-2 text-muted-foreground">Free forever — no credit card needed</p>
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

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Questions? Contact us at support@alkasid.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
