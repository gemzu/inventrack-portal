"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { user, login, resetPassword, loading: authLoading } = useAuth();
  const { theme } = useTheme();
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
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid") || msg.includes("Invalid")) setError("Invalid email or password.");
      else if (msg.includes("many")) setError("Too many attempts. Try again later.");
      else setError("Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!email) { setError("Enter your email first."); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError("");
    } catch { setError("Could not send reset email."); }
  };

  const isDark = theme === "dark";
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition-all outline-none focus:border-foreground ${
    isDark 
      ? "bg-card border-border text-foreground placeholder:text-muted-foreground" 
      : "bg-background border-border text-foreground placeholder:text-muted-foreground"
  }`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-background" : "bg-background"}`}>
      <div className={`border-b ${isDark ? "border-border" : "border-border"}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Invems" className="w-full h-full object-contain" />
            </div>
            <span className={`text-sm font-semibold tracking-wide ${isDark ? "text-foreground" : "text-foreground"}`}>Invems</span>
          </div>

          <h1 className={`text-2xl font-bold mb-1 ${isDark ? "text-foreground" : "text-foreground"}`}>Welcome back</h1>
          <p className={`text-sm mb-8 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>Sign in to your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`px-3 py-2.5 rounded-lg text-xs ${isDark ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-red-50 border border-red-200 text-red-600"}`}>
                {error}
              </div>
            )}
            {resetSent && (
              <div className={`px-3 py-2.5 rounded-lg text-xs ${isDark ? "bg-green-950/50 border border-green-800 text-green-400" : "bg-green-50 border border-green-200 text-green-600"}`}>
                Password reset email sent. Check your inbox.
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium mb-2 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                  placeholder="Enter your password"
                  className={`${inputClass} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleReset} className={`text-xs transition-colors ${isDark ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:underline"}`}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-medium text-sm py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark 
                  ? "bg-foreground text-background hover:opacity-90" 
                  : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className={`text-center mt-8 text-sm ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className={`transition-colors ${isDark ? "text-foreground hover:underline" : "text-foreground hover:underline"}`}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
