import { useSyncExternalStore } from "react";

/* Does this browser hold a saved sign-in? Read straight from storage, so it is
   known on the first paint. The home page used to wait for the whole account
   profile (several requests, 5 to 11 seconds) before it dared say "Open
   dashboard", and showed "Create account" to people who were signed in. This
   is only a hint for what to show while the real check finishes; the real
   answer (AuthContext) replaces it the moment it arrives. The server snapshot
   is false so the first render matches the server's. */
const KEY = /^sb-.+-auth-token$/;

function read(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && KEY.test(k) && localStorage.getItem(k)) return true;
    }
  } catch {
    /* storage blocked: no hint */
  }
  return false;
}

export function useSignedInHint(): boolean {
  return useSyncExternalStore(() => () => {}, read, () => false);
}
