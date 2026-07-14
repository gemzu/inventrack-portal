import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { userId, email } = body;

    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!serviceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // If no userId but email provided, look up user
    if (!userId && email) {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .limit(1);
      
      if (users && users.length > 0) {
        userId = users[0].id;
      } else {
        return NextResponse.json(
          { error: "User not found with that email" },
          { status: 404 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID or valid email required" },
        { status: 400 }
      );
    }

    // Delete user's data from related tables
    // Delete orders
    await supabase.from("orders").delete().eq("buyer_id", userId);
    
    // Remove from favorites (update inventory)
    await supabase.from("inventory")
      .update({ favorited_by: [] })
      .contains("favorited_by", [userId]);
    
    // Delete storefront_buyers records
    await supabase.from("storefront_buyers").delete().eq("buyer_id", userId);
    
    // Delete messages
    await supabase.from("messages")
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    
    // Delete the user from users table
    const { error: deleteUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      return NextResponse.json(
        { error: deleteUserError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}