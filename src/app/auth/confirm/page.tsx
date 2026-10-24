"use client";

/**
 * Where the sign-up confirmation email points (www.invems.com/auth/confirm).
 * The email carries a one-time token; this page hands it to Supabase, so the
 * person only ever sees invems.com - never the project's own address.
 * Confirmed: on to sign-in with "Email confirmed" (from the app: "go back to
 * the app"). Expired or used: sign-in says so and offers a new email.
 */

import { useEffect, useState } from "react";
import Mark from "@/components/Mark";
import { supabase } from "@/lib/supabase";

export default function ConfirmEmailPage() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const token_hash = q.get("token_hash");
    if (!token_hash) { window.location.replace("/login#error_code=otp_expired"); return; }

    (async () => {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });
      if (error) { window.location.replace("/login#error_code=otp_expired"); return; }
      /* The app marks its sign-ups (signup_from), so those people are sent back
         to the app rather than told to sign in here. */
      const fromApp = q.get("from") === "app" || data.user?.user_metadata?.signup_from === "app";
      const done = `/login?confirmed=1${fromApp ? "&from=app" : ""}`;
      /* Confirming signs this browser in as a side effect. Sign-in is the
         next step anyway (and for app sign-ups it happens in the app), so
         leave no half-session behind on whatever phone opened the email. */
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace(done);
    })().catch(() => setStuck(true));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
          <Mark className="h-full w-full text-foreground" />
        </span>
        {stuck ? (
          <p className="text-sm text-muted-foreground">
            That did not go through. <a href="/login" className="font-semibold text-[var(--brand-2)] underline">Go to sign in</a>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">Confirming your email…</p>
        )}
      </div>
    </div>
  );
}
