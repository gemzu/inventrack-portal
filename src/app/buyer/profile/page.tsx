"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMyStorefronts } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import { Panel, Rule, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Input } from "@/components/console/controls";
import { LogOut, QrCode } from "lucide-react";

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
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title={userName || "Your profile"}
        eyebrow="Buying"
        subtitle={user?.email || undefined}
        actions={
          <Action onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Action>
        }
      >
        <div className="space-y-12">
          {/* ── Account ──────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule label="Account" />
            <div className="reveal">
              <div className="row-line flex items-center justify-between gap-6 py-3">
                <ColHead>Name</ColHead>
                <span className="truncate text-sm">{userName || "—"}</span>
              </div>
              <div className="row-line flex items-center justify-between gap-6 py-3">
                <ColHead>Email</ColHead>
                <span className="truncate text-sm">{user?.email}</span>
              </div>
              <div className="row-line flex items-center justify-between gap-6 py-3">
                <ColHead>Role</ColHead>
                <span className="text-[12px] text-muted-foreground">
                  Buyer
                </span>
              </div>
            </div>
          </section>

          {/* ── Storefronts ──────────────────────────────────── */}
          <section className="space-y-5">
            <Rule label="Connected suppliers" />
            {loadingStorefronts ? (
              <ListSkeleton rows={2} />
            ) : storefronts.length === 0 ? (
              <p className="reveal text-sm leading-relaxed text-muted-foreground">
                None yet. A supplier gives you a join code —{" "}
                <Link
                  href="/buyer/catalog/connect"
                  className="text-[var(--brand-2)] transition-colors duration-300 hover:text-foreground"
                >
                  enter it here
                </Link>
                .
              </p>
            ) : (
              <Panel className="reveal">
                {storefronts.map((s, i) => (
                  <div
                    key={s.storefrontId || i}
                    className="row-line flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.storefronts?.name || "Storefront"}
                      </p>
                      {s.storefronts?.code ? (
                        <p className="mono truncate text-[12px] text-muted-foreground">
                          {s.storefronts.code}
                        </p>
                      ) : null}
                    </div>
                    <Status status="active" label="Connected" className="shrink-0" />
                  </div>
                ))}
              </Panel>
            )}
          </section>

          {/* ── Security ─────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule
              label="Two factor"
              action={
                <Status
                  status={mfaEnrolled ? "active" : "inactive"}
                  label={mfaEnrolled ? "On" : "Off"}
                  emphasis
                />
              }
            />

            <div className="reveal">
              {mfaEnrolled ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Signing in asks for a code from your authenticator as well as your password.
                </p>
              ) : !qr ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="min-w-[16rem] flex-1 text-sm leading-relaxed text-muted-foreground">
                    Without it, anyone holding your password can order as you. Any TOTP app works —
                    Google Authenticator, 1Password, whatever you already use.
                  </p>
                  <Action solid onClick={handleEnroll}>
                    <QrCode className="h-3.5 w-3.5" /> Turn it on
                  </Action>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="panel flex flex-col items-center gap-3 p-6">
                    <Image
                      src={qr}
                      alt="QR code for your authenticator app"
                      width={176}
                      height={176}
                      unoptimized
                      className="rounded-md border border-border bg-white p-2"
                    />
                    <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
                      Scan this, then type the six digit code it shows.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Action onClick={handleChallenge} disabled={!factorId}>
                      Request code
                    </Action>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      aria-label="Six digit code"
                      className="mono w-36 flex-none tracking-[0.3em]"
                    />
                    <Action
                      solid
                      onClick={handleVerify}
                      disabled={!challengeId || code.length !== 6}
                    >
                      Confirm
                    </Action>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}
