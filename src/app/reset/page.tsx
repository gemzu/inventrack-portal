"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Boxes, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailWarning } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

type ResolveState = "checking" | "ready" | "invalid" | "needlink" | "success";

function readAuthParams(searchParams: URLSearchParams, hashParams: URLSearchParams) {
  return {
    accessToken: hashParams.get("access_token") || searchParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") || searchParams.get("refresh_token"),
    type: hashParams.get("type") || searchParams.get("type"),
    tokenHash: searchParams.get("token_hash") || hashParams.get("token_hash"),
    code: searchParams.get("code") || hashParams.get("code"),
    errorDescription:
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      hashParams.get("error") ||
      searchParams.get("error"),
  };
}

function scrubRecoveryUrl() {
  if (typeof window === "undefined") return;
  const cleanUrl = `${window.location.origin}/reset`;
  window.history.replaceState(window.history.state, "", cleanUrl);
}

function ResetPageContent() {
  const router = useRouter();
  const query = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [state, setState] = useState<ResolveState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inputClass = useMemo(
    () =>
      `w-full px-4 py-3 rounded-lg border text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] outline-none focus:border-foreground ${
        isDark
          ? "bg-card border-border text-foreground placeholder:text-muted-foreground"
          : "bg-background border-border text-foreground placeholder:text-muted-foreground"
      }`,
    [isDark]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveRecovery() {
      setState("checking");
      setError("");
      setMessage("");

      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);
      const params = readAuthParams(query, hashParams);

      if (params.errorDescription) {
        if (!cancelled) {
          setError(params.errorDescription);
          setState("invalid");
        }
        return;
      }

      try {
        // Preferred: token_hash + verifyOtp. The single-use check runs here in
        // client JS, so email link-scanners (Gmail/Outlook/corporate) can't
        // pre-consume it, and it needs no PKCE verifier so it works across
        // devices (request on desktop, open on phone).
        if (params.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: params.tokenHash,
          });
          if (error) throw error;
          scrubRecoveryUrl();
          if (!cancelled) setState("ready");
          return;
        }

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          scrubRecoveryUrl();
          if (!cancelled) {
            setState("ready");
          }
          return;
        }

        if (params.accessToken && params.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (error) throw error;
          scrubRecoveryUrl();
          if (!cancelled) {
            setState(params.type === "recovery" ? "ready" : "invalid");
            if (params.type !== "recovery") {
              setError("This link is not a password recovery link.");
            }
          }
          return;
        }

        if (!cancelled) {
          // No token in the URL at all (someone opened /reset directly, not via
          // an email link). Show a calm "request a link" state, not a scary
          // "expired" error.
          setState("needlink");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not verify the reset link.");
          setState("invalid");
        }
      }
    }

    resolveRecovery();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const next = password.trim();
    const confirmNext = confirm.trim();

    if (next.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (next !== confirmNext) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      await supabase.auth.signOut();
      setState("success");
      setMessage("Your password has been updated. You can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email so we can send a new reset link.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://www.invems.com/reset",
      });
      if (error) throw error;
      setMessage(`A new password reset link was sent to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new reset link.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">Invems</div>
              <div className="text-sm text-muted-foreground">Password recovery</div>
            </div>
          </div>

          {state === "checking" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Checking your reset link</h1>
              <p className="text-sm text-muted-foreground">Please wait while we verify your password recovery request.</p>
            </div>
          )}

          {state === "ready" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Set a new password</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a new password for your Invems account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/15 px-3 py-2.5 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/40 dark:text-destructive">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="rounded-lg border border-success/30 bg-success/15 px-3 py-2.5 text-sm text-success dark:border-success/30 dark:bg-success/40 dark:text-success">
                    {message}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="At least 6 characters"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setError("");
                      }}
                      placeholder="Re-enter your new password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating password...
                    </span>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          )}

          {(state === "invalid" || state === "needlink") && (
            <div className="space-y-5">
              <div className="text-center">
                {state === "needlink" ? (
                  <>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Reset your password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your email and we&apos;ll send you a secure reset link.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                      <MailWarning className="h-6 w-6 text-warning" />
                    </div>
                    <h1 className="text-2xl font-bold">This reset link is no longer valid</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {error || "Request a new password reset email and try again."}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                </div>

                {message && (
                  <div className="rounded-lg border border-success/30 bg-success/15 px-3 py-2.5 text-sm text-success dark:border-success/30 dark:bg-success/40 dark:text-success">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset link...
                    </span>
                  ) : (
                    "Request new reset link"
                  )}
                </button>
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {message || "Your password has been changed successfully."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Go to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Loading password recovery</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please wait while we prepare your reset session.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPageContent />
    </Suspense>
  );
}
