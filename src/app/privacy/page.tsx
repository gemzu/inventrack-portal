"use client";

import Link from "next/link";
import { Boxes, Sun, Moon, Menu, X, ChevronRight, FileText, Shield, Lock } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function PrivacyPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `radial-gradient(circle at 100% 0%, var(--primary) 0%, transparent 50%)`,
        }} />
        
        <nav className="relative z-10 glass fixed top-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-background" />
                </div>
                <span className="text-xl font-bold tracking-tight">Invems</span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link href="/#features" className="text-sm hover:text-primary transition">Features</Link>
                <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
                {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenu && (
            <div className="md:hidden border-t border-border px-4 py-4 space-y-3">
              <Link href="/#features" className="block text-sm" onClick={() => setMobileMenu(false)}>Features</Link>
            </div>
          )}
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Lock className="w-3 h-3 inline mr-1" />
              Legal
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Privacy Policy
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your privacy matters to us. This policy explains how we collect, use, and protect your data.
          </p>
          <p className="text-sm text-muted-foreground mt-6">
            Last updated: April 23, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8">
            {/* Section 1 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">1. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information you provide directly, including your name, email address, company name, and account credentials when you register. We also collect inventory data, order information, scan logs, and other content you create through the Service. Additionally, we automatically collect usage data such as device information, IP addresses, browser type, pages visited, and timestamps when you interact with our Service.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use the information we collect to: (a) provide, maintain, and improve the Service; (b) process transactions and manage your account; (c) send you technical notices, security alerts, and support messages; (d) respond to your requests and provide customer support; (e) monitor and analyze usage trends to improve user experience; (f) detect, investigate, and prevent fraudulent or unauthorized activities; and (g) comply with legal obligations.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">3. Data Storage and Security</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Your data is stored securely using industry-standard cloud infrastructure provided by Supabase and related services. We employ encryption in transit (TLS/SSL) and at rest, access controls, and regular security audits to protect your information. While we strive to use commercially acceptable means to protect your data, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 - Your Rights */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">4. Your Rights</h2>
                  <p className="text-muted-foreground mb-4">
                    Depending on your location, you may have the following rights regarding your personal data:
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                      <span>Right of Access</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                      <span>Right to Rectification</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                      <span>Right to Erasure</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                      <span>Right to Data Portability</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">
                    For California residents (CCPA): We do not sell personal information. For EU/EEA residents (GDPR): You may withdraw consent at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Boxes className="w-4 h-4 text-background" />
            </div>
            <span className="font-bold">Invems</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 Invems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}