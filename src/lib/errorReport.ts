/* Sends crashes and unhandled errors to the report-error server function (shared with the phone app), which keeps
   one row per kind of error and emails the developer about new kinds. The same error goes once per page load, at
   most 20 per load, never from local development. Only message, stack, page path and version are sent. */
import { supabase } from "@/lib/supabase";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const VERSION = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 8);
const sent = new Set<string>();

function isLocal() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}

export async function reportError(error: unknown, info: { kind?: string; componentStack?: string } = {}) {
  try {
    if (!URL_BASE || !ANON || isLocal()) return;
    const e = error as { message?: string; stack?: string } | undefined;
    const message = String(e?.message || error || "Unknown error").slice(0, 500);
    const screen = window.location.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").slice(0, 120);
    const key = `${message}|${screen}`;
    if (sent.has(key) || sent.size >= 20) return;
    sent.add(key);
    let token = ANON;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) token = data.session.access_token;
    } catch {}
    const stack = info.componentStack ? `${e?.stack || ""}\n--- component ---${info.componentStack}` : e?.stack || "";
    await fetch(`${URL_BASE}/functions/v1/report-error`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        platform: "web", version: VERSION, screen, message, stack: stack.slice(0, 4000),
        extra: { kind: info.kind || "error", browser: navigator.userAgent.slice(0, 200) },
      }),
    });
  } catch { /* reporting must never cause an error of its own */ }
}
