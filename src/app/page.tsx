"use client";

import Link from "next/link";
import {
  ScanLine, ShoppingBag, ArrowRight, ArrowUpRight,
  Boxes, Barcode, Building2, Clock, ClipboardCheck,
  BarChart3, MessageCircle, Upload, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import FadeIn from "@/components/FadeIn";
import { Button } from "@/components/ui/button";

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
  const { theme } = useTheme();
  const isLoggedIn = !loading && !!user;
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-background text-foreground" : "bg-background text-foreground"}`}>
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${isDark ? "border-border bg-background/80" : "border-border bg-background/80"} backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Invems" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Invems</span>
          </Link>

          <div className="flex items-center gap-5">
            {loading ? (
              <div className="w-20 h-8" />
            ) : isLoggedIn ? (
              <>
                <div className={`hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${isDark ? "border-border text-muted-foreground" : "border-border text-muted-foreground"}`}>
                  Signed in as {userName || user?.email?.split("@")[0] || "User"}
                </div>
                <Link href="/dashboard" className="inline-flex">
                  <Button size="sm" className="h-8 text-xs">
                    Go to Dashboard <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Link href="/dashboard" className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-secondary border border-border" : "bg-secondary border border-border"}`}>
                  {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-colors">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-14">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-start">
          <div className="pt-4">
            <div className={`fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-widest mb-8 ${isDark ? "border-border text-muted-foreground" : "border-border text-muted-foreground"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-foreground" : "bg-foreground"} pulse-dot`} />
              Warehouse Management
            </div>

            <h1 className={`fade-up fade-up-1 text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] ${isDark ? "text-foreground" : "text-foreground"}`}>
              Stop guessing.
              <br />
              <span className={isDark ? "text-muted-foreground" : "text-muted-foreground"}>Start managing.</span>
            </h1>

            <p className={`fade-up fade-up-2 mt-6 text-base leading-relaxed max-w-md ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>
              Real-time visibility into every box, every order, every scan.
              Built for teams that run warehouses, not spreadsheets.
            </p>

            <div className="fade-up fade-up-3 mt-10 flex items-center gap-4">
              <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="text-sm font-medium bg-foreground text-background px-5 py-2.5 rounded-lg hover:opacity-90 press">
                {isLoggedIn ? "Continue to dashboard" : "Start managing your warehouse"}
              </Link>
              <a href="#how" className={`text-sm font-medium ${isDark ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                How it works →
              </a>
            </div>
          </div>

          <div className={`fade-up fade-up-4 rounded-xl border overflow-hidden lg:mt-8 ${isDark ? "bg-card border-border" : "bg-card border-border"}`}>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? "border-border bg-card" : "border-border bg-card"}`}>
              <div className="flex gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isDark ? "bg-muted-foreground" : "bg-muted-foreground"}`} />
                <div className={`w-2.5 h-2.5 rounded-full ${isDark ? "bg-muted-foreground" : "bg-muted-foreground"}`} />
                <div className={`w-2.5 h-2.5 rounded-full ${isDark ? "bg-muted-foreground" : "bg-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-mono ml-2 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>scan.log — live</span>
            </div>
            <div className={`p-4 font-mono text-xs space-y-1.5 ${isDark ? "bg-card" : "bg-card"}`}>
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className="type-line flex items-center gap-3">
                  <span className={isDark ? "text-muted-foreground shrink-0" : "text-muted-foreground shrink-0"}>{line.time}</span>
                  <span className={cn(
                    "w-16 shrink-0 font-medium",
                    line.status === "warn" ? "text-foreground" : isDark ? "text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {line.action}
                  </span>
                  <span className={cn(
                    isDark ? "text-foreground/70" : "text-foreground/70"
                  )}>
                    {line.detail}
                  </span>
                </div>
              ))}
              <div className="type-line flex items-center gap-3 mt-1">
                <span className={isDark ? "text-muted-foreground" : "text-muted-foreground"}>09:42:30</span>
                <span className={isDark ? "text-muted-foreground/50" : "text-muted-foreground/50"}>_</span>
                <div className={`w-2 h-3.5 ${isDark ? "bg-foreground/60" : "bg-foreground/60"} animate-blink`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`border-y ${isDark ? "border-border" : "border-border"}`}>
        <FadeIn direction="up">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Barcodes scanned", value: "14,200+" },
            { label: "Orders processed", value: "2,400+" },
            { label: "Facilities active", value: "38" },
            { label: "Uptime", value: "99.9%" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-foreground"}`}>{stat.value}</div>
              <div className={`text-sm ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>{stat.label}</div>
            </div>
          ))}
        </div>
        </FadeIn>
      </section>

      <section id="how" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-bold ${isDark ? "text-foreground" : "text-foreground"}`}>How it works</h2>
            <p className={`mt-4 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>Three simple steps to get started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Barcode, title: "Scan or import", desc: "Use barcode scanner or upload CSV to add inventory in bulk" },
              { icon: ShoppingBag, title: "Buyers order", desc: "Buyers browse your catalog and place orders through storefronts" },
              { icon: ClipboardCheck, title: "Approve & fulfill", desc: "Review orders, approve, and manage fulfillment in one place" },
            ].map((step, i) => (
              <div key={i} className={`card-luxury p-8 text-center`}>
                <div className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center ${isDark ? "bg-secondary" : "bg-secondary"}`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className={`font-semibold mb-2 ${isDark ? "text-foreground" : "text-foreground"}`}>{step.title}</h3>
                <p className={`text-sm ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-24 ${isDark ? "bg-secondary/30" : "bg-secondary/30"}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`text-3xl font-bold ${isDark ? "text-foreground" : "text-foreground"}`}>Ready to streamline your warehouse?</h2>
          <p className={`mt-4 mb-8 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>Join thousands of businesses managing inventory with Invems.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className={`py-8 border-t ${isDark ? "border-border" : "border-border"}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4" />
            <span className={`text-sm font-medium ${isDark ? "text-foreground" : "text-foreground"}`}>Invems</span>
          </div>
          <div className={`flex items-center gap-6 text-sm ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
