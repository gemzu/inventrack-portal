"use client";

import Mark from "@/components/Mark";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { redeemInviteCode, homeFor, takeInvite } from "@/lib/invite";

/* Shared field styling. Focus ring comes from globals (input:focus). */
const FIELD =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] placeholder:text-muted-foreground";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { user, login, resetPassword, loading: authLoading } = useAuth();
  const router = useRouter();

  if (!authLoading && user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);

      /* Somebody who signed up with a code but had to confirm their email
         first left it behind. This is the first moment there is a session to
         spend it as. A failure here is not a failed sign-in — they are in,
         they just are not in an organization yet, and Suppliers or the app
         can still take the code. */
      const pending = takeInvite();
      if (pending) {
        try {
          const result = await redeemInviteCode(pending);
          router.push(homeFor(result.role));
          return;
        } catch {
          /* Fall through to the usual destination. */
        }
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid") || msg.includes("Invalid")) setError("That email and password do not match.");
      else if (msg.includes("many")) setError("Too many tries. Wait a minute, then try again.");
      else setError("That did not go through. Try again.");
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!email) { setError("Type your email above first, then tap this again."); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError("");
    } catch { setError("The reset email would not send. Try again in a moment."); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="reveal mb-9 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
              <Mark className="h-full w-full text-foreground" />
            </span>
            <span className="font-display text-sm font-bold tracking-tight">Invems</span>
          </div>

          <h1 className="reveal d1 font-display text-[1.6rem] font-bold tracking-[-0.015em] sm:text-[2rem]">
            Welcome back.
          </h1>
          <p className="reveal d2 mb-8 mt-2 text-sm text-muted-foreground">
            Sign in and pick up where the floor left off.
          </p>

          <form onSubmit={handleSubmit} className="reveal d3 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
              >
                {error}
              </div>
            )}
            {resetSent && (
              <div
                role="status"
                className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success"
              >
                Reset email sent. Check your inbox.
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                placeholder="you@company.com"
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                  placeholder="Your password"
                  className={`${FIELD} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="press w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_var(--brand-1)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-[var(--brand-1)]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
