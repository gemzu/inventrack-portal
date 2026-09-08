"use client";

import Mark from "@/components/Mark";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FIELD =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] placeholder:text-muted-foreground";

const ROLES = [
  { value: "admin", label: "Business owner" },
  { value: "buyer", label: "Buyer" },
];

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signup, loading: authLoading } = useAuth();
  const router = useRouter();

  if (!authLoading && user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Passwords need at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(name, email, password, "", role);
      if (role === "admin") router.push("/setup/organization");
      else router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("already")) setError("There is already an account on this email. Try signing in.");
      else if (msg.includes("weak") || msg.includes("password")) setError("That password is too easy to guess. Use at least 6 characters.");
      else setError("That did not go through. Try again.");
    } finally { setLoading(false); }
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
            Set up your warehouse.
          </h1>
          <p className="reveal d2 mb-8 mt-2 text-sm text-muted-foreground">
            Takes about a minute. You can add your team afterwards.
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

            <div>
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">I am a</span>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={role === r.value}
                    onClick={() => setRole(r.value)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background,color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      role === r.value
                        ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_var(--brand-1)]"
                        : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

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
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating your account
                </span>
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
