"use client";

import Link from "next/link";
import {
  Boxes, Sun, Moon, Menu, X,
  Trash2, AlertTriangle, CheckCircle, Mail, Lock, Eye, EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

type Step = "form" | "confirm" | "success" | "error";

export default function DeleteAccountPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      // Verify credentials — this proves the requester owns the account
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Incorrect email or password. Please try again.");
      setStep("confirm");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { reason: reason.trim() || null },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMsg(message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `radial-gradient(circle at 100% 0%, var(--destructive) 0%, transparent 50%)` }}
        />

        <nav className="relative z-10 glass fixed top-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-background" />
                </div>
                <span className="text-xl font-bold tracking-tight">INVENTRACK</span>
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
            <div className="md:hidden border-t border-border px-4 py-4">
              <Link href="/#features" className="block text-sm" onClick={() => setMobileMenu(false)}>Features</Link>
            </div>
          )}
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
              <Trash2 className="w-3 h-3 inline mr-1" />
              Account
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Delete Account
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Permanently delete your INVENTRACK account and all associated data.
          </p>
        </div>
      </div>

      {/* Content */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* What gets deleted */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-3">What will be deleted</h2>
                <ul className="space-y-2 text-muted-foreground">
                  {[
                    "Your profile and account credentials",
                    "All inventory records and product data",
                    "Order history and transaction records",
                    "Messages and communication history",
                    "Organization memberships and settings",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  Deletion is permanent and cannot be undone. Allow up to 30 days for all data to be fully removed.
                </p>
              </div>
            </div>
          </div>

          {/* Step: form */}
          {step === "form" && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-2">Verify your identity</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and password to confirm you own this account before we delete anything.
              </p>

              {errorMsg && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email address <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your account password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reason for leaving (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us why you're leaving..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>
            </div>
          )}

          {/* Step: confirm */}
          {step === "confirm" && (
            <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Final confirmation</h2>
                <p className="text-muted-foreground text-sm">
                  You are about to permanently delete the account for <strong>{email}</strong>.
                  All your data will be erased and this cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-secondary transition font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition disabled:opacity-60"
                >
                  {loading ? "Deleting..." : "Yes, Delete Everything"}
                </button>
              </div>
            </div>
          )}

          {/* Step: success */}
          {step === "success" && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Account deleted</h2>
                <p className="text-muted-foreground text-sm">
                  Your account and all associated data have been permanently removed. Any remaining traces will be fully cleared within 30 days.
                </p>
              </div>
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-xl border border-border hover:bg-secondary transition text-sm font-medium"
              >
                Return to Home
              </Link>
            </div>
          )}

          {/* Step: error */}
          {step === "error" && (
            <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Deletion failed</h2>
                <p className="text-muted-foreground text-sm">{errorMsg}</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Email us at{" "}
                  <a href="mailto:support@invems.com" className="text-primary hover:underline">
                    support@invems.com
                  </a>{" "}
                  and we will manually remove your account within 30 days.
                </p>
              </div>
              <button
                onClick={() => { setStep("form"); setErrorMsg(""); }}
                className="px-6 py-3 rounded-xl border border-border hover:bg-secondary transition text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Boxes className="w-4 h-4 text-background" />
            </div>
            <span className="font-bold">INVENTRACK</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 INVENTRACK. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
