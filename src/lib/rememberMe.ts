/* "Keep me signed in" on the website. Ticked (the default): the session stays
   in this browser until you sign out, as before. Unticked, for a shared
   computer: the session lasts until the browser is closed. Supabase keeps the
   session in localStorage either way; this marks it as "this visit only" and
   ends it the next time the site opens in a fresh browser session.
   Per browser - other devices are never touched. */

const FLAG = "invems.ephemeral";
const ALIVE = "invems.alive";

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export function setKeepSignedIn(keep: boolean) {
  safe(() => {
    if (keep) localStorage.removeItem(FLAG);
    else { localStorage.setItem(FLAG, "1"); sessionStorage.setItem(ALIVE, "1"); }
  }, undefined);
}

export function forgetEphemeral() {
  safe(() => { localStorage.removeItem(FLAG); sessionStorage.removeItem(ALIVE); }, undefined);
}

/** True when the last sign-in asked not to be kept and the browser has been closed since. */
export function shouldEndOnOpen(): boolean {
  return safe(() => localStorage.getItem(FLAG) === "1" && sessionStorage.getItem(ALIVE) !== "1", false);
}
