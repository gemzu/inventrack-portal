"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  // Already logged in → go to dashboard
  if (!authLoading && user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password, company, role);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else if (msg.includes("weak-password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-zinc-100" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">INVENTRACK</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start managing your inventory today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Company <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Warehousing"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">I am a...</label>
                <div className="flex gap-2">
                  {[
                    { value: "admin", label: "Business Owner", desc: "Manage inventory & team" },
                    { value: "buyer", label: "Buyer", desc: "Browse & order products" },
                  ].map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      variant={role === r.value ? "default" : "outline"}
                      onClick={() => setRole(r.value)}
                      className="flex-1 h-auto flex-col items-start py-3 px-4"
                    >
                      <span className="text-sm font-medium">{r.label}</span>
                      <span className={`text-xs mt-0.5 ${role === r.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {r.desc}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border border-border accent-primary cursor-pointer"
                />
                <label htmlFor="agree-terms" className="text-sm text-muted-foreground cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>

              <Button type="submit" disabled={loading || !agreedToTerms} className="w-full">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
