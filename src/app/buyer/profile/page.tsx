"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMyStorefronts } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import {
  User as UserIcon, Mail, Store, Shield, LogOut,
  CheckCircle2, QrCode, Moon, Sun, Trash2, AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface Storefront {
  storefrontId?: string;
  storefronts?: { id?: string; name?: string; code?: string };
}

export default function BuyerProfilePage() {
  const { user, userName, logout } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [loadingStorefronts, setLoadingStorefronts] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyStorefronts(user.id)
      .then((rows) => setStorefronts(rows as Storefront[]))
      .catch(() => setStorefronts([]))
      .finally(() => setLoadingStorefronts(false));
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaEnrolled(Boolean(data?.totp && data.totp.length > 0));
    });
  }, [user]);

  const initials = (userName || user?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Buyer Device" });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      toast("Scan the QR code in your authenticator app", "info");
    } catch (e) {
      toast((e as Error).message || "Failed to enroll MFA", "error");
    }
  };

  const handleChallenge = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      setChallengeId(data.id);
      toast("Enter the 6-digit code from your authenticator", "info");
    } catch (e) {
      toast((e as Error).message || "Challenge failed", "error");
    }
  };

  const handleVerify = async () => {
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      toast("2FA enabled successfully", "success");
      setMfaEnrolled(true);
      setFactorId(""); setQr(""); setCode(""); setChallengeId("");
    } catch (e) {
      toast((e as Error).message || "Verification failed", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Two-step confirm so the destructive action requires deliberate intent.
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    if (deleteConfirmStep === 0) { setDeleteConfirmStep(1); return; }
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      // The auth user is gone server-side; clear local session and bounce.
      await logout();
      router.push("/login?deleted=1");
    } catch (e) {
      toast((e as Error).message || "Could not delete account", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                {userName || user?.email || "Buyer"}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Account */}
        <div className="card-luxury p-6 scale-in">
          <div className="flex items-center gap-2 mb-5">
            <UserIcon className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Account</h2>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground font-medium">{userName || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground truncate max-w-[60%]">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                Buyer
              </Badge>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card-luxury p-6 scale-in" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
              <div>
                <h2 className="font-semibold text-foreground text-sm">Appearance</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Currently using {theme === "dark" ? "dark" : "light"} mode
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
            >
              Switch to {theme === "dark" ? "light" : "dark"}
            </button>
          </div>
        </div>

        {/* Storefronts */}
        <div className="card-luxury p-6 scale-in" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <Store className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Connected storefronts</h2>
          </div>
          {loadingStorefronts ? (
            <div className="space-y-2">
              <div className="h-12 bg-secondary rounded-xl animate-pulse" />
              <div className="h-12 bg-secondary rounded-xl animate-pulse opacity-60" />
            </div>
          ) : storefronts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              You haven&apos;t connected to any storefront yet.{" "}
              <a href="/buyer/catalog/connect" className="text-primary hover:underline font-medium">
                Connect one →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {storefronts.map((s, i) => (
                <div
                  key={s.storefrontId || i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">
                      {s.storefronts?.name || "Storefront"}
                    </div>
                    {s.storefronts?.code && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {s.storefronts.code}
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Two-factor auth */}
        <div className="card-luxury p-6 scale-in" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Two-factor authentication</h2>
            </div>
            {mfaEnrolled ? (
              <span className="text-[10px] font-semibold text-success bg-success/10 border border-success/30 px-2.5 py-1 rounded-full">
                Enabled
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-full">
                Not enabled
              </span>
            )}
          </div>

          {mfaEnrolled ? (
            <p className="text-sm text-muted-foreground">
              Your account is protected by an authenticator app. 2FA is active.
            </p>
          ) : !qr ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
                Add an extra layer of security with a TOTP authenticator app
                (Google Authenticator, 1Password, Authy, etc.).
              </p>
              <button
                onClick={handleEnroll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 transition-all shrink-0"
              >
                <QrCode className="w-4 h-4" />
                Enable 2FA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-5 bg-secondary/50 rounded-xl">
                <Image
                  src={qr} alt="MFA QR Code" width={180} height={180}
                  unoptimized className="rounded-xl border border-border"
                />
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Scan this QR code in your authenticator app, then enter the 6-digit code below.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChallenge}
                  disabled={!factorId}
                  className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                >
                  Request code
                </button>
                <Input
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="flex-1 font-mono text-center tracking-widest"
                />
                <button
                  onClick={handleVerify}
                  disabled={!challengeId || code.length !== 6}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="flex justify-end scale-in" style={{ animationDelay: "240ms" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        {/* Danger zone — account deletion (Apple App Store 5.1.1(v) compliance) */}
        <div className="mt-12 border-t border-border pt-8 scale-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-bold text-destructive uppercase tracking-wider">Danger zone</h3>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Delete your account</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Permanently removes your profile, push notification token, and disconnects you from all storefronts.
                Past orders and messages are anonymised but kept for the vendor&apos;s records. This cannot be undone.
              </p>
            </div>
            {deleteConfirmStep === 0 ? (
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete account
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDeleteConfirmStep(0)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all disabled:opacity-50"
                >
                  Cancel — keep my account
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting…" : "Yes, delete forever"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
