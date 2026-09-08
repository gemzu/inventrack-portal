"use client";

/**
 * Two-factor authentication.
 *
 * The mobile app could enrol a TOTP factor and the portal could not, so anyone
 * who signed up on the web had no way to turn 2FA on at all. This mirrors the
 * app's flow: enroll, show the QR and the secret, then challenge and verify the
 * six digit code.
 *
 * Supabase refuses a second enrolment while an unverified factor is still
 * lying around, which is the usual cause of a failed retry, so abandoned
 * factors are cleared before starting.
 */

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "off" | "enrolling" | "on";

export default function MfaSetup() {
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) {
      setError("Could not read your security settings.");
      setStatus("off");
      return;
    }
    const verified = (data?.totp || []).find((f) => f.status === "verified");
    setStatus(verified ? "on" : "off");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      /* Clear any half finished factor, or the next enroll is rejected. */
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp || []) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
        }
      }

      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Invems web ${new Date().toISOString().slice(0, 10)}`,
      });
      if (err) throw err;

      setFactorId(data.id);
      setSecret(data.totp.secret);
      setQr(
        await QRCode.toDataURL(data.totp.uri, {
          width: 320,
          margin: 1,
          color: { dark: "#14121f", light: "#ffffff" },
        })
      );
      setStatus("enrolling");
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        /not.*enabled/i.test(raw)
          ? "Two factor is not enabled on this Supabase project yet."
          : "Could not start setup. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length < 6) return;
    setBusy(true);
    setError("");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const res = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (res.error) throw res.error;
      setCode("");
      setSecret("");
      setQr("");
      await refresh();
    } catch {
      setError("That code did not match. Codes change every 30 seconds, so use the one showing now.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp || []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      await refresh();
    } catch {
      setError("Could not turn it off. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy. Select the code and copy it by hand.");
    }
  };

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {status === "on" && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="flex items-center gap-2.5 text-sm font-medium text-success">
            <ShieldCheck className="h-5 w-5" />
            On. Signing in asks for a code from your authenticator.
          </span>
          <button
            onClick={turnOff}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition-[background-color,border-color] duration-200 hover:bg-destructive/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            Turn off
          </button>
        </div>
      )}

      {status === "off" && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            Off. Anyone with your password can sign in.
          </span>
          <button
            onClick={start}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Turn on
          </button>
        </div>
      )}

      {status === "enrolling" && (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          {qr && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qr}
              alt="QR code for your authenticator app"
              width={168}
              height={168}
              className="rounded-md border border-border bg-white p-2"
            />
          )}

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Scan this with Google Authenticator, 1Password, or any TOTP app.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No camera? Type this code in by hand.
              </p>
              <button
                onClick={copySecret}
                className="mono mt-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-[border-color,color] duration-200 hover:border-[var(--brand-1)]"
              >
                {secret}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div>
              <label htmlFor="mfa-code" className="mb-2 block text-sm font-medium">
                Then enter the six digit code it shows
              </label>
              <div className="flex flex-wrap gap-3">
                <input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="000000"
                  className="mono w-36 rounded-lg border border-border bg-background px-4 py-2.5 text-lg tracking-[0.3em] outline-none transition-[border-color,box-shadow] duration-200"
                />
                <button
                  onClick={confirm}
                  disabled={busy || code.length < 6}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
