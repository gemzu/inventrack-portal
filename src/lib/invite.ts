/**
 * Redeeming an invite code on the web.
 *
 * The web signup used to ask for no code at all. It showed "I am a: Admin /
 * Worker / Buyer" as buttons and took your word for it, which meant the role
 * was self-declared and there was no way to join an existing organization from
 * a browser — codes only worked in the app. This is the missing half.
 *
 * `join-org-secure` is the only thing that may grant a role. It resolves a code
 * against three columns and decides the role itself:
 *
 *   organizations.admin_invite_code   -> admin
 *   organizations.worker_invite_code  -> worker
 *   storefronts.invite_code           -> buyer
 *
 * It also enforces the country restriction for staff roles and writes the
 * audit row, which is exactly why the client must not be trusted to work any
 * of this out for itself. The code is sent; the answer comes back.
 */

import { supabase } from "@/lib/supabase";
import { connectToStorefront, getStorefrontByCode } from "@/lib/dataService";

export type JoinResult = {
  orgId: string;
  role: "admin" | "worker" | "buyer";
  alreadyJoined?: boolean;
};

/**
 * Redeem a code for the signed-in user. Requires a session — the edge function
 * identifies the caller from their JWT, not from anything we send.
 */
export async function redeemInviteCode(code: string): Promise<JoinResult> {
  const inviteCode = code.trim().toUpperCase();

  const { data, error } = await supabase.functions.invoke("join-org-secure", {
    body: { inviteCode },
  });

  /* The function answers with a real status code and a readable message, so
     surface that rather than a generic failure. */
  if (error) {
    let message = "";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        message = typeof body?.error === "string" ? body.error : "";
      } catch {
        /* Not JSON. Fall through to the generic message. */
      }
    }
    throw new Error(message || error.message || "That code did not work.");
  }
  if (!data?.ok) throw new Error(data?.error || "That code did not work.");

  const result: JoinResult = {
    orgId: String(data.orgId),
    role: data.role,
    alreadyJoined: Boolean(data.alreadyJoined),
  };

  /* A buyer code is a storefront code, and joining the organization is only
     half of it: the catalog reads storefront_buyers, which the edge function
     does not write. Without this the buyer lands on an empty catalog holding a
     code that supposedly worked. */
  if (result.role === "buyer") {
    try {
      const { data: session } = await supabase.auth.getUser();
      const storefront = (await getStorefrontByCode(inviteCode)) as { id?: string } | null;
      if (session.user?.id && storefront?.id) {
        await connectToStorefront(session.user.id, String(storefront.id));
      }
    } catch {
      /* They are in the organization either way; they can finish connecting
         from Suppliers. Failing the whole join here would be worse. */
    }
  }

  return result;
}

/** Where someone belongs once a code has told us what they are. */
export function homeFor(role: JoinResult["role"]) {
  return role === "buyer" ? "/buyer/catalog" : "/dashboard";
}

/* ── Codes that outlive the signup ─────────────────────────────
   If the project has email confirmation switched on, signUp returns no
   session, so there is nobody to redeem the code as. Rather than lose it,
   it waits here and the login page spends it on the way in. */

const PENDING = "invems-pending-invite";

export function stashInvite(code: string) {
  try {
    localStorage.setItem(PENDING, code.trim().toUpperCase());
  } catch {
    /* Private mode. They can enter it again from the app or Suppliers. */
  }
}

export function takeInvite(): string | null {
  try {
    const code = localStorage.getItem(PENDING);
    if (code) localStorage.removeItem(PENDING);
    return code;
  } catch {
    return null;
  }
}
