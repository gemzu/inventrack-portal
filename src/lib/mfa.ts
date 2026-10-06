import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/*
 * Two-step sign-in.
 *
 * A password gives a session at level aal1. For an account with an
 * authenticator app set up, the six-digit code raises it to aal2. The site
 * stopped at the password, so on the web two-step sign-in did nothing. The
 * database and the server functions now refuse an aal1 session for such an
 * account, and every way into the site asks for the code.
 */

function sessionLevel(accessToken: string): string | null {
  try {
    const part = accessToken.split(".")[1] ?? "";
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
    return typeof claims?.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

/**
 * True when this session still owes its authenticator code. Read from the
 * session itself, so it is safe inside onAuthStateChange, where calling the
 * auth client again can deadlock it.
 */
export function codeOwed(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const enrolled = (session.user.factors ?? []).some((f) => f.status === "verified");
  return enrolled && sessionLevel(session.access_token) !== "aal2";
}

/** Same question, for code running outside onAuthStateChange. */
export async function codeOwedNow(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return codeOwed(data.session);
}

/** Checks a six-digit code against the account's authenticator app. */
export async function verifyAuthenticatorCode(code: string): Promise<void> {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) {
    throw new Error("Type the 6-digit code from your authenticator app.");
  }
  const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr) throw new Error("Your authenticator could not be found. Try again.");
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!factor) throw new Error("This account has no authenticator app set up.");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: clean });
  if (error) {
    if (/many|rate/i.test(error.message)) throw new Error("Too many tries. Wait a minute, then try again.");
    throw new Error("That code did not match. Codes change every 30 seconds - try the current one.");
  }
}
