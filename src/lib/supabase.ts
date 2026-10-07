import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* detectSessionInUrl is off. With it on, any page of the site opened with a
   session in its address (#access_token=...) signed the browser into that
   session, silently replacing whoever was signed in - so a link from anyone
   could put a visitor in the sender's account, and whatever they did next
   landed there. The one page that takes a session from a link, /reset, reads
   it itself and asks before switching accounts. An email-confirmation link
   still confirms the address (Supabase does that before redirecting); the
   person then signs in as usual. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { detectSessionInUrl: false },
});
