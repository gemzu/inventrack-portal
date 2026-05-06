import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Verify the caller is authenticated ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the JWT → user using anon client
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const reason: string | null = body.reason ?? null;

    // ── Admin client (service role) for destructive operations ──────────
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Audit log before deleting anything
    await admin.from("deletion_requests").insert({
      user_id: userId,
      email: user.email,
      reason,
      status: "processing",
    });

    // ── Delete user-owned rows (correct columns per live schema) ─────────
    // messages: sender_id and receiver_id
    await admin.from("messages").delete().eq("sender_id", userId);
    await admin.from("messages").delete().eq("receiver_id", userId);

    // notifications, support_tickets: user_id
    await admin.from("notifications").delete().eq("user_id", userId);
    await admin.from("support_tickets").delete().eq("user_id", userId);

    // storefront_buyers: buyer_id (buyer-side connections)
    await admin.from("storefront_buyers").delete().eq("buyer_id", userId);

    // orders placed as buyer
    await admin.from("orders").delete().eq("buyer_id", userId);

    // users profile row
    await admin.from("users").delete().eq("id", userId);

    // ── Delete the auth user — irreversible ──────────────────────────────
    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthErr) throw deleteAuthErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("delete-account error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
