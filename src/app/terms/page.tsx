"use client";

import { X, ChevronRight, FileText, AlertTriangle, CreditCard, Copyright } from "lucide-react";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `radial-gradient(circle at 100% 0%, var(--primary) 0%, transparent 50%)`,
        }} />
        
        <SiteNav />

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <FileText className="w-3 h-3 inline mr-1" />
              Legal
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Terms of Service
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Please read these terms carefully before using Invems. By accessing our service, you agree to be bound by these terms.
          </p>
          <p className="text-sm text-muted-foreground mt-6">
            Last updated: September 7, 2026
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
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing or using Invems ("the Service"), available at alkasid.net and through our mobile applications, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and Invems.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ChevronRight className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">2. Account Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. You must be at least 18 years of age to use this Service. You agree to notify us immediately of any unauthorized use of your account. Invems reserves the right to suspend or terminate accounts that violate these Terms.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">3. User Responsibilities</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not: (a) use the Service to store or transmit any unlawful, harmful, or objectionable content; (b) interfere with or disrupt the integrity or performance of the Service; (c) attempt to gain unauthorized access to the Service or its related systems; (d) reverse engineer, decompile, or disassemble any part of the Service; or (e) use the Service to compete directly with Invems.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">4. Fees</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Service is currently provided free of charge. There is no subscription, and we do not ask for payment details to create or keep an account. We may introduce paid features in the future. If we do, we will give you at least 30 days notice by email before any charge applies to your account, and no fee will ever be charged without your agreement first. You will always be able to keep using the Service without paying, decline the change, or close your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Copyright className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">5. Intellectual Property</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Service and its original content, features, and functionality are owned by Invems and are protected by international copyright, trademark, and other intellectual property laws. You retain ownership of all data you upload to the Service. By using the Service, you grant Invems a limited license to use, store, and process your data solely for the purpose of providing and improving the Service.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">6. Limitation of Liability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To the maximum extent permitted by applicable law, Invems and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7 - Termination */}
            <div className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <X className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">7. Termination</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will immediately cease. You may export your data prior to termination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
