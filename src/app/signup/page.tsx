"use client";

/**
 * Signing up.
 *
 * This screen used to ask "I am a: Business owner / Buyer" and take the answer
 * at face value — no code, no check. Which meant two things: the role was self
 * declared, and there was no way at all to join an existing organization from a
 * browser. Codes worked in the app and nowhere else, so a worker signing up on
 * the web landed in an empty console with no way to enter the code they had
 * been sent.
 *
 * There is no role picker now, because the role was never the visitor's to
 * choose. Either you have a code, and it decides what you are — admin, worker
 * or buyer, resolved server-side by join-org-secure — or you are starting an
 * organization, and you own it.
 *
 * The account is created either way before the code is spent, because you have
 * to be somebody before you can join something.
 */

import Mark from "@/components/Mark";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { redeemInviteCode, homeFor, stashInvite } from "@/lib/invite";

const FIELD =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] placeholder:text-muted-foreground";

type Mode = "join" | "start";

export default function SignupPage() {
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signup, loading: authLoading } = useAuth();
  const router = useRouter();

  if (!authLoading && user) {
    router.push("/dashboard");
    return null;
  }

  const joining = mode === "join";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 6) {
      setError("Passwords need at least 6 characters.");
      return;
    }
    if (joining && !code.trim()) {
      setError("Enter the code you were sent, or start an organization instead.");
      return;
    }

    setLoading(true);
    try {
      /* Metadata carries the least it can. On the joining path the code decides
         the role and join-org-secure overwrites this; if the join then fails,
         the account is left as a buyer with no organization, which is the safe
         way to fail. */
      await signup(name, email, password, "", joining ? "buyer" : "admin");

      if (!joining) {
        router.push("/setup/organization");
        return;
      }

      /* With email confirmation switched on there is no session yet, so there
         is nobody to redeem the code as. Keep it and spend it at sign-in. */
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        stashInvite(code);
        setNotice(
          "Account created. Confirm your email, then sign in — we will finish joining you with that code."
        );
        return;
      }

      const result = await redeemInviteCode(code);
      router.push(homeFor(result.role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (/already/i.test(msg)) {
        setError("There is already an account on this email. Try signing in.");
      } else if (/weak|password/i.test(msg)) {
        setError("That password is too easy to guess. Use at least 6 characters.");
      } else if (/code not found|not found/i.test(msg)) {
        setError("No organization uses that code. Check it with whoever sent it.");
      } else if (msg) {
        /* join-org-secure explains itself — a wrong role for the code, or a
           country restriction. Those are worth repeating verbatim. */
        setError(msg);
      } else {
        setError("That did not go through. Try again.");
      }
    } finally {
      setLoading(false);
    }
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
            {joining ? "Join your team." : "Set up your warehouse."}
          </h1>
          <p className="reveal d2 mb-8 mt-2 text-sm leading-relaxed text-muted-foreground">
            {joining
              ? "Whoever runs the floor sends you a code. It decides what you can do, so you do not have to."
              : "Takes about a minute. You can invite your team afterwards."}
          </p>

          {/* Two ways in. The lit edge marks which, the same as everywhere. */}
          <div className="reveal d2 mb-7 flex items-end gap-6 border-b border-border" role="tablist">
            {([
              { value: "join", label: "I have a code" },
              { value: "start", label: "Start an organization" },
            ] as const).map((o) => {
              const on = mode === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setMode(o.value);
                    setError("");
                    setNotice("");
                  }}
                  className={`relative -mb-px pb-2.5 text-[13px] font-semibold transition-colors duration-300 ${
                    on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-px origin-left bg-[linear-gradient(to_right,var(--brand-1),var(--brand-3))] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.30,1)] ${
                      on ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="reveal d3 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive"
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="rounded-lg border border-[color-mix(in_oklab,var(--brand-2)_35%,transparent)] px-3 py-2.5 text-xs leading-relaxed text-[var(--brand-2)]"
              >
                {notice}
              </div>
            )}

            {joining && (
              <div>
                <label htmlFor="code" className="mb-2 block text-xs font-semibold text-muted-foreground">
                  Invite code
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="WRK-XXXX"
                  className={`${FIELD} mono tracking-[0.12em]`}
                />
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  A staff code from your admin, or a storefront code from a supplier.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="mb-2 block text-xs font-semibold text-muted-foreground">
                Full name
              </label>
              <input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Sam Okafor"
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
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

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border bg-background accent-[var(--brand-1)]"
              />
              <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-foreground underline underline-offset-4 hover:text-[var(--brand-1)]">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" className="text-foreground underline underline-offset-4 hover:text-[var(--brand-1)]">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="press mt-2 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_var(--brand-1)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {joining ? "Joining" : "Creating your account"}
                </span>
              ) : joining ? (
                "Join"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already set up?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-[var(--brand-1)]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
