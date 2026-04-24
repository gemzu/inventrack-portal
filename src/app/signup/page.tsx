"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme();
  const router = useRouter();

  if (!authLoading && user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(name, email, password, "", role);
      if (role === "admin") router.push("/setup/organization");
      else router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("already")) setError("An account with this email already exists.");
      else if (msg.includes("weak") || msg.includes("password")) setError("Password too weak. Use at least 6 characters.");
      else setError("Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const isDark = theme === "dark";
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition-all outline-none focus:border-foreground ${
    isDark 
      ? "bg-card border-border text-foreground placeholder:text-muted-foreground" 
      : "bg-background border-border text-foreground placeholder:text-muted-foreground"
  }`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-foreground">
              <Boxes className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-wide">INVENTRACK</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-8">Start managing your warehouse operations.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`px-3 py-2.5 rounded-lg text-xs ${isDark ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-red-50 border border-red-200 text-red-600"}`}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2 text-muted-foreground">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "admin", label: "Business Owner" },
                  { value: "buyer", label: "Buyer" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      role === r.value
                        ? "bg-foreground text-background"
                        : `border border-border hover:bg-secondary ${isDark ? "text-muted-foreground" : "text-foreground"}`
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-muted-foreground">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className={`${inputClass} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border bg-background accent-foreground cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-foreground hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" className="text-foreground hover:underline">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full bg-foreground text-background font-medium text-sm py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}