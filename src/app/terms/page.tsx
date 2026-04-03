"use client";

import Link from "next/link";
import { Boxes, Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function TermsPage() {
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
              <Link href="/#features" className="text-sm hover:text-primary transition">Features</Link>
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
              <Link href="/#features" className="block text-sm" onClick={() => setMobileMenu(false)}>Features</Link>
              <Link href="/pricing" className="block text-sm">Pricing</Link>
              <Link href="/login" className="block text-sm">Log in</Link>
              <Link href="/signup" className="block px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium text-center">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <section className="pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-8 sm:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>Last updated: April 3, 2026</p>

            <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
              <div>
                <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
                <p style={{ color: "var(--muted)" }}>
                  By accessing or using INVENTRACK (&quot;the Service&quot;), available at alkasid.com and through our mobile applications, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and INVENTRACK.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">2. Account Terms</h2>
                <p style={{ color: "var(--muted)" }}>
                  You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. You must be at least 18 years of age to use this Service. You agree to notify us immediately of any unauthorized use of your account. INVENTRACK reserves the right to suspend or terminate accounts that violate these Terms.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">3. Service Description</h2>
                <p style={{ color: "var(--muted)" }}>
                  INVENTRACK provides a cloud-based inventory and warehouse management platform, including barcode scanning, real-time stock tracking, order management, multi-facility support, role-based access control, analytics, and related services. The Service is offered via web portal and mobile applications. We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice to users.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">4. User Responsibilities</h2>
                <p style={{ color: "var(--muted)" }}>
                  You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not: (a) use the Service to store or transmit any unlawful, harmful, or objectionable content; (b) interfere with or disrupt the integrity or performance of the Service; (c) attempt to gain unauthorized access to the Service or its related systems; (d) reverse engineer, decompile, or disassemble any part of the Service; or (e) use the Service to compete directly with INVENTRACK.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">5. Payment Terms</h2>
                <p style={{ color: "var(--muted)" }}>
                  Certain features of the Service require payment of fees. All fees are quoted in U.S. dollars unless otherwise stated. You agree to pay all applicable fees in accordance with the pricing plan you select. Fees are billed on a per-user, per-month basis and are non-refundable except as required by law. We reserve the right to change our pricing with 30 days advance notice. Failure to pay may result in suspension or termination of your account.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">6. Intellectual Property</h2>
                <p style={{ color: "var(--muted)" }}>
                  The Service and its original content, features, and functionality are owned by INVENTRACK and are protected by international copyright, trademark, and other intellectual property laws. You retain ownership of all data you upload to the Service. By using the Service, you grant INVENTRACK a limited license to use, store, and process your data solely for the purpose of providing and improving the Service.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">7. Limitation of Liability</h2>
                <p style={{ color: "var(--muted)" }}>
                  To the maximum extent permitted by applicable law, INVENTRACK and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from: (a) your use or inability to use the Service; (b) any unauthorized access to or alteration of your data; or (c) any other matter relating to the Service. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">8. Termination</h2>
                <p style={{ color: "var(--muted)" }}>
                  We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will immediately cease. You may export your data prior to termination. We will retain your data for a reasonable period following termination to allow for data export, after which it will be permanently deleted.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">9. Changes to Terms</h2>
                <p style={{ color: "var(--muted)" }}>
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use the Service after those revisions become effective, you agree to be bound by the revised Terms.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">10. Contact Information</h2>
                <p style={{ color: "var(--muted)" }}>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="mt-3 p-4 rounded-xl" style={{ background: "var(--surface)" }}>
                  <p className="font-medium">INVENTRACK</p>
                  <p style={{ color: "var(--muted)" }}>Website: alkasid.com</p>
                  <p style={{ color: "var(--muted)" }}>Email: support@alkasid.com</p>
                </div>
              </div>
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
            <Link href="/terms" className="hover:text-primary transition">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition">Privacy</Link>
            <Link href="/login" className="hover:text-primary transition">Login</Link>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>&copy; 2026 INVENTRACK. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
