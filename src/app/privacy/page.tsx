"use client";

import Link from "next/link";
import { Boxes, Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function PrivacyPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
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
          <div className="md:hidden border-t" >
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
          <div className="rounded-xl border bg-card p-8 sm:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm mb-10 text-muted-foreground">Last updated: April 3, 2026</p>

            <div className="space-y-8 text-sm leading-relaxed" >
              <div>
                <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
                <p className="text-muted-foreground">
                  We collect information you provide directly, including your name, email address, company name, and account credentials when you register. We also collect inventory data, order information, scan logs, and other content you create through the Service. Additionally, we automatically collect usage data such as device information, IP addresses, browser type, pages visited, and timestamps when you interact with our Service.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
                <p className="text-muted-foreground">
                  We use the information we collect to: (a) provide, maintain, and improve the Service; (b) process transactions and manage your account; (c) send you technical notices, security alerts, and support messages; (d) respond to your requests and provide customer support; (e) monitor and analyze usage trends to improve user experience; (f) detect, investigate, and prevent fraudulent or unauthorized activities; and (g) comply with legal obligations.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">3. Data Storage and Security</h2>
                <p className="text-muted-foreground">
                  Your data is stored securely using industry-standard cloud infrastructure provided by Supabase and related services. We employ encryption in transit (TLS/SSL) and at rest, access controls, and regular security audits to protect your information. While we strive to use commercially acceptable means to protect your data, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">4. Third-Party Services</h2>
                <p className="text-muted-foreground">
                  We use third-party services to help us operate and improve the Service, including: Supabase (database and authentication), Vercel (web hosting), Stripe (payment processing), and analytics providers. These third parties have access to your information only to perform specific tasks on our behalf and are obligated to protect your data in accordance with their own privacy policies. We do not sell your personal information to third parties.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">5. Your Rights</h2>
                <p className="mb-3 text-muted-foreground">
                  Depending on your location, you may have the following rights regarding your personal data:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><strong>Right of Access:</strong> You can request a copy of the personal data we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate or incomplete data.</li>
                  <li><strong>Right to Erasure:</strong> You can request deletion of your personal data, subject to legal obligations.</li>
                  <li><strong>Right to Data Portability:</strong> You can request your data in a structured, machine-readable format.</li>
                  <li><strong>Right to Object:</strong> You can object to processing of your data for certain purposes.</li>
                  <li><strong>Right to Restrict Processing:</strong> You can request that we limit how we use your data.</li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  <strong>For California residents (CCPA):</strong> You have the right to know what personal information we collect, request deletion of your data, and opt out of the sale of personal information. We do not sell personal information. To exercise these rights, contact us at support@alkasid.com.
                </p>
                <p className="mt-3 text-muted-foreground">
                  <strong>For EU/EEA residents (GDPR):</strong> We process your data based on your consent, contractual necessity, and our legitimate business interests. You may withdraw consent at any time. You also have the right to lodge a complaint with your local data protection authority.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">6. Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your personal data for as long as your account is active or as needed to provide you the Service. If you request account deletion, we will delete your personal data within 30 days, except where we are required to retain it for legal, accounting, or regulatory purposes. Aggregated, anonymized data that cannot identify you may be retained indefinitely for analytical purposes.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">7. Security Measures</h2>
                <p className="text-muted-foreground">
                  We implement a variety of security measures to maintain the safety of your personal information, including: encryption of data in transit and at rest, regular security assessments, role-based access controls, secure authentication mechanisms, automated threat monitoring, and regular backups. We follow industry best practices and comply with applicable data protection regulations.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">8. Children&apos;s Privacy</h2>
                <p className="text-muted-foreground">
                  The Service is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal data from a child under 18 without parental consent, we will take steps to delete that information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For significant changes, we will provide additional notice such as an email notification or an in-app alert. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">10. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, your data, or wish to exercise your rights, please contact us at:
                </p>
                <div className="mt-3 p-4 rounded-xl bg-muted">
                  <p className="font-medium">INVENTRACK</p>
                  <p className="text-muted-foreground">Website: alkasid.com</p>
                  <p className="text-muted-foreground">Email: support@alkasid.com</p>
                  <p className="text-muted-foreground">Data Protection Inquiries: privacy@alkasid.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t" >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-primary transition">Pricing</Link>
            <Link href="/terms" className="hover:text-primary transition">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition">Privacy</Link>
            <Link href="/login" className="hover:text-primary transition">Login</Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 INVENTRACK. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
