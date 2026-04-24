"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getMyStorefronts } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import {
  User as UserIcon,
  Mail,
  Store,
  Shield,
  LogOut,
  CheckCircle2,
  QrCode,
} from "lucide-react";

interface Storefront {
  storefrontId?: string;
  storefronts?: { id?: string; name?: string; code?: string };
}

export default function BuyerProfilePage() {
  const { user, userName, logout } = useAuth();
  const { toast } = useToast();
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
    // Check MFA status
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaEnrolled(Boolean(data?.totp && data.totp.length > 0));
    });
  }, [user]);

  const initials = (userName || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Buyer Device",
      });
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
      toast("MFA verified and enabled", "success");
      setMfaEnrolled(true);
      setFactorId("");
      setQr("");
      setCode("");
      setChallengeId("");
    } catch (e) {
      toast((e as Error).message || "Verification failed", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight truncate" style={{ color: '#1f1a1d' }}>
                {userName || user?.email || "Buyer"}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: '#E398CA' }} />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {/* Account */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="w-5 h-5" style={{ color: '#E398CA' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>Account</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span>{userName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="truncate max-w-[60%]">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role</span>
              <Badge variant="outline" style={{ background: '#E398CA', color: '#E398CA' }}>Buyer</Badge>
            </div>
          </div>
        </div>

        {/* Storefronts */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5" style={{ color: '#E398CA' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>Connected storefronts</h2>
          </div>
          {loadingStorefronts ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : storefronts.length === 0 ? (
            <div className="text-sm text-gray-500">
              You haven&apos;t connected to any storefront yet.{" "}
              <Link href="/buyer/catalog/connect" className="text-[#E398CA] hover:underline">
                Connect one
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-2">
              {storefronts.map((s, i) => (
                <div
                  key={s.storefrontId || i}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <div className="font-medium" style={{ color: '#1f1a1d' }}>{s.storefronts?.name || "Storefront"}</div>
                    {s.storefronts?.code ? (
                      <div className="text-xs text-gray-400 font-mono">
                        {s.storefronts.code}
                      </div>
                    ) : null}
                  </div>
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: '#E398CA' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>Two-factor authentication</h2>
            </div>
            {mfaEnrolled ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline">Not enabled</Badge>
            )}
          </div>

          {mfaEnrolled ? (
            <p className="text-sm text-gray-500">
              Your account is protected by an authenticator app.
            </p>
          ) : !qr ? (
            <div className="flex gap-4 flex-wrap">
              <p className="text-sm text-gray-500 flex-1 min-w-[200px]">
                Add an extra layer of security with a TOTP authenticator app
                (Google Authenticator, 1Password, etc.).
              </p>
              <Button onClick={handleEnroll} style={{ background: '#E398CA' }}>
                <QrCode className="w-4 h-4 mr-2" /> Enable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Image
                  src={qr}
                  alt="MFA QR Code"
                  width={192}
                  height={192}
                  unoptimized
                  className="rounded border border-gray-200"
                />
                <p className="text-xs text-gray-500 text-center">
                  Scan this QR code in your authenticator app, then enter the 6-digit code below.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleChallenge} disabled={!factorId} style={{ background: 'white', border: '1px solid #E398CA', color: '#E398CA' }}>
                  Request code
                </Button>
                <Input
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="h-11"
                />
                <Button onClick={handleVerify} disabled={!challengeId || code.length !== 6} style={{ background: '#E398CA' }}>
                  Verify
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleLogout} style={{ background: 'white', border: '1px solid #E398CA', color: '#E398CA' }}>
            <LogOut className="w-4 h-4 mr-2" style={{ color: '#E398CA' }} /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}