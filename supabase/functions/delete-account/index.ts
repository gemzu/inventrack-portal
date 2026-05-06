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

    // Anon client to resolve the JWT → user
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
    const { reason } = await req.json().catch(() => ({ reason: null }));

    // ── Admin client (service role) for destructive operations ──────────
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log the deletion request for audit trail before wiping anything
    await admin.from("deletion_requests").insert({
      user_id: userId,
      email: user.email,
      reason: reason ?? null,
      status: "processing",
    }).throwOnError();

    // ── Delete user-owned rows from all tables ───────────────────────────
    // Order matters: delete children before parents to avoid FK violations.
    const tables: Array<{ table: string; column: string }> = [
      { table: "inventory",        column: "created_by" },
      { table: "boxes",            column: "created_by" },
      { table: "orders",           column: "buyer_user_id" },
      { table: "order_items",      column: "created_by" },
      { table: "messages",         column: "sender_id" },
      { table: "conversations",    column: "created_by" },
      { table: "favorites",        column: "user_id" },
      { table: "notifications",    column: "user_id" },
      { table: "activity_logs",    column: "user_id" },
      { table: "org_members",      column: "user_id" },
      { table: "users",            column: "id" },
    ];

    for (const { table, column } of tables) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      // Ignore "table doesn't exist" or "column doesn't exist" errors gracefully
      if (error && !error.message.includes("does not exist")) {
        console.error(`Error deleting from ${table}:`, error.message);
      }
    }

    // ── Delete the auth user (this is irreversible) ──────────────────────
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
