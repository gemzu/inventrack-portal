"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
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
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(name, email, password, company, role);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("already")) setError("An account with this email already exists.");
      else if (msg.includes("weak") || msg.includes("password")) setError("Password too weak. Use at least 6 characters.");
      else setError("Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5 text-zinc-950" />
            </div>
            <span className="text-sm font-semibold text-zinc-100 tracking-wide">INVENTRACK</span>
          </div>

          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Create your account</h1>
          <p className="text-sm text-zinc-500 mb-8">Start managing your warehouse operations.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "admin", label: "Business Owner" },
                  { value: "buyer", label: "Buyer" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      role === r.value
                        ? "bg-teal-500 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">
                Company <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
              </label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Warehousing" className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Password</label>
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
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
                className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-teal-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-zinc-500 cursor-pointer leading-relaxed">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-teal-500 hover:text-teal-400">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" className="text-teal-500 hover:text-teal-400">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full bg-zinc-100 text-zinc-950 font-medium text-sm py-2.5 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
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

          <p className="text-center mt-8 text-xs text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
