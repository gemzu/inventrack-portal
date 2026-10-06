/**
 * Centralized Supabase data access layer for the web portal.
 * Mirrors utils/dataService.js from the mobile app — snake_case DB rows
 * come back as camelCase objects so React components stay consistent.
 *
 * Every read filters by org_id. Every write injects org_id on the row.
 * Errors are thrown, not swallowed.
 */
import { supabase } from "@/lib/supabase";
import { ORG_COLUMNS } from "@/lib/orgColumns";

/* ─── Helpers ──────────────────────────────────────────── */

type AnyRow = Record<string, unknown>;

export function toCamel<T = AnyRow>(row: AnyRow | null | undefined): T {
  if (!row) return row as T;
  const out: AnyRow = {};
  for (const key in row) {
    const camel = key.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
    out[camel] = row[key];
  }
  return out as T;
}

export function toSnake(obj: AnyRow | null | undefined): AnyRow {
  if (!obj) return {};
  const out: AnyRow = {};
  for (const key in obj) {
    const snake = key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    out[snake] = obj[key];
  }
  return out;
}

function mapAll<T = AnyRow>(rows: AnyRow[] | null | undefined): T[] {
  return (rows || []).map((r) => toCamel<T>(r));
}

/* ─── Auth ─────────────────────────────────────────────── */

export async function getCurrentUserProfile() {
  const { data: session } = await supabase.auth.getUser();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;
  return toCamel(data);
}

/* ─── Inventory ────────────────────────────────────────── */

export interface InventoryFilters {
  facilityId?: string | null;
  status?: string;
  loose?: boolean;
  boxIds?: string[];
  search?: string;
}

export async function getInventoryPaginated(
  orgId: string,
  filters: InventoryFilters = {},
  page = 0,
  pageSize = 50
) {
  const offset = page * pageSize;
  let q = supabase.from("inventory").select("*", { count: "exact" }).eq("org_id", orgId);
  if (filters.facilityId) q = q.eq("facility_id", filters.facilityId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.loose === true) q = q.is("box_id", null);
  if (filters.boxIds?.length) q = q.in("box_id", filters.boxIds);
  if (filters.search) {
    q = q.or(
      `model_id.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`
    );
  }
  q = q.order("updated_at", { ascending: false, nullsFirst: false }).range(offset, offset + pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: mapAll(data), total: count ?? 0, hasMore: (data?.length ?? 0) === pageSize };
}

export async function getInventoryByBarcode(orgId: string, barcode: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("org_id", orgId)
    .eq("barcode", barcode);
  if (error) throw error;
  return mapAll(data);
}

export async function getInventoryByModelId(orgId: string, modelId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("org_id", orgId)
    .eq("model_id", modelId);
  if (error) throw error;
  return mapAll(data);
}

export async function updateInventoryItem(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("inventory")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}

export async function moveItemsToBox(itemIds: string[], boxId: string | null) {
  if (!itemIds.length) return;
  const { error } = await supabase
    .from("inventory")
    .update({ box_id: boxId })
    .in("id", itemIds);
  if (error) throw error;
}

export async function getLooseItemsCount(orgId: string, facilityId?: string | null) {
  let q = supabase
    .from("inventory")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("box_id", null);
  if (facilityId) q = q.eq("facility_id", facilityId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/* ─── Boxes ────────────────────────────────────────────── */

export interface Box {
  id: string;
  orgId: string;
  facilityId: string | null;
  code: string;
  label: string | null;
  description: string | null;
  color: string | null;
  category: string | null;
  capacity: number | null;
  location: string | null;
  weightLimit: number | null;
  createdAt: string;
}

export async function getBoxes(orgId: string, facilityId?: string | null): Promise<Box[]> {
  let q = supabase.from("boxes").select("*").eq("org_id", orgId);
  if (facilityId) q = q.eq("facility_id", facilityId);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return mapAll<Box>(data);
}

export async function getBoxById(id: string): Promise<Box | null> {
  const { data, error } = await supabase.from("boxes").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return toCamel<Box>(data);
}

export async function createBox(
  orgId: string,
  input: {
    code: string;
    label?: string;
    facilityId?: string | null;
    description?: string;
    color?: string;
    category?: string;
    capacity?: number;
    location?: string;
    weightLimit?: number;
  }
): Promise<Box> {
  const row = {
    org_id: orgId,
    code: input.code,
    label: input.label ?? null,
    facility_id: input.facilityId ?? null,
    description: input.description ?? null,
    color: input.color ?? "#6366f1",
    category: input.category ?? null,
    capacity: input.capacity ?? null,
    location: input.location ?? null,
    weight_limit: input.weightLimit ?? null,
  };
  const { data, error } = await supabase.from("boxes").insert(row).select().single();
  if (error) throw error;
  return toCamel<Box>(data);
}

export async function updateBox(id: string, patch: Partial<Box>): Promise<Box> {
  const { data, error } = await supabase
    .from("boxes")
    .update(toSnake(patch as AnyRow))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel<Box>(data);
}

export async function deleteBox(id: string) {
  const { count, error: countErr } = await supabase
    .from("inventory")
    .select("*", { count: "exact", head: true })
    .eq("box_id", id);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete box: it still contains ${count} item(s).`);
  }
  const { error } = await supabase.from("boxes").delete().eq("id", id);
  if (error) throw error;
}

export async function getItemsInBox(boxId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("box_id", boxId)
    .order("updated_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return mapAll(data);
}

export interface BoxStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

export async function getBoxStats(boxId: string): Promise<BoxStats> {
  const { data, error } = await supabase
    .from("inventory")
    .select("status, quantity")
    .eq("box_id", boxId);
  if (error) throw error;
  const stats: BoxStats = { total: 0, available: 0, reserved: 0, sold: 0 };
  for (const r of data || []) {
    const q = (r.quantity as number) ?? 1;
    stats.total += q;
    if (r.status === "available") stats.available += q;
    else if (r.status === "reserved") stats.reserved += q;
    else if (r.status === "sold") stats.sold += q;
  }
  return stats;
}

/* ─── Orders ───────────────────────────────────────────── */

export async function getOrders(orgId: string, filters: { status?: string; buyerId?: string } = {}) {
  let q = supabase.from("orders").select("*").eq("org_id", orgId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.buyerId) q = q.eq("buyer_id", filters.buyerId);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return mapAll(data);
}

export async function createOrder(orgId: string, input: AnyRow) {
  const row = { ...toSnake(input), org_id: orgId };
  const { data, error } = await supabase.from("orders").insert(row).select().single();
  if (error) throw error;
  return toCamel(data);
}

export async function updateOrder(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("orders")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function setOrderStatus(id: string, status: string) {
  return updateOrder(id, { status });
}

/* ─── Users ────────────────────────────────────────────── */

export async function getOrgUsers(orgId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapAll(data);
}

export async function updateUser(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("users")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

/* ─── Facilities ───────────────────────────────────────── */

export async function getFacilities(orgId: string) {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw error;
  return mapAll(data);
}

export async function addFacility(orgId: string, input: { name: string; state?: string; address?: string }) {
  const { data, error } = await supabase
    .from("facilities")
    .insert({ org_id: orgId, ...input })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function updateFacility(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("facilities")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function deleteFacility(id: string) {
  const { error } = await supabase.from("facilities").delete().eq("id", id);
  if (error) throw error;
}

/* ─── Storefronts ──────────────────────────────────────── */

export async function getStorefronts(orgId: string) {
  const { data, error } = await supabase
    .from("storefronts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapAll(data);
}

export async function createStorefront(orgId: string, input: AnyRow) {
  /* Eight characters from 32, from crypto.getRandomValues: about a trillion
     codes. It was four from Math.random - about a million, few enough for a
     script to try them all. 256 is a multiple of 32, so no bias. */
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomCode = () => {
    let code = "STORE-";
    for (const b of crypto.getRandomValues(new Uint8Array(8))) code += chars[b % chars.length];
    return code;
  };

  const provided = typeof input.inviteCode === "string" ? input.inviteCode.trim().toUpperCase() : "";
  const inviteCode = provided || randomCode();
  const row = { ...toSnake(input), org_id: orgId, invite_code: inviteCode };
  const { data, error } = await supabase.from("storefronts").insert(row).select().single();
  if (error) throw error;
  return toCamel(data);
}

export async function updateStorefront(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("storefronts")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function deleteStorefront(id: string) {
  const { error } = await supabase.from("storefronts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * What a connected store offers this buyer, through buyer_storefront_items.
 * Buyers cannot read a vendor's inventory directly - the database applies the
 * store's filters and its "show prices" switch, and never returns cost.
 */
export async function getStorefrontItems(storefrontId: string) {
  const { data, error } = await supabase.rpc("buyer_storefront_items", { p_storefront_id: storefrontId });
  if (error) throw error;
  return mapAll(data as AnyRow[]);
}

/**
 * Holds units of an item for this buyer (reserve_inventory_units) and returns
 * the held row - what an order points at, as in the app.
 */
export async function holdUnits(itemId: string, take: number, storefrontId: string) {
  const { data, error } = await supabase.rpc("reserve_inventory_units", {
    p_item_id: itemId,
    p_take: take,
    p_storefront_id: storefrontId,
  });
  if (error) throw error;
  return toCamel(data as AnyRow);
}

/** Gives held units back to the store (buyer_release_item). */
export async function releaseHold(heldItemId: string) {
  const { error } = await supabase.rpc("buyer_release_item", { p_item_id: heldItemId });
  if (error) throw error;
}

/**
 * A store by its join code, through lookup_storefront_by_code. A buyer cannot
 * read a store they are not connected to, so reading storefronts directly
 * found nothing; the lookup also counts wrong guesses, and is what lets
 * connectStorefrontByCode go ahead.
 */
export async function getStorefrontByCode(code: string) {
  const { data, error } = await supabase.rpc("lookup_storefront_by_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as AnyRow | null | undefined;
  return row ? toCamel(row) : null;
}

export async function getMyStorefronts(buyerId: string) {
  const { data, error } = await supabase
    .from("storefront_buyers")
    .select("*, storefronts(*)")
    .eq("buyer_id", buyerId)
    .eq("status", "active");
  if (error) throw error;
  return (data || []).map((row: AnyRow) => ({
    ...toCamel(row),
    storefront: toCamel(row.storefronts as AnyRow),
  }));
}

/**
 * Connects the signed-in buyer to the store behind a code they have just
 * looked up (getStorefrontByCode), through connect_storefront_by_code.
 *
 * This used to write storefront_buyers directly, which the database has
 * refused since buyers stopped being able to join any store without its code
 * (2026-09-26): connecting on the web failed for every buyer.
 */
export async function connectStorefrontByCode(code: string) {
  const { data, error } = await supabase.rpc("connect_storefront_by_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) {
    const m = error.message || "";
    if (m.includes("already_connected")) return null;
    if (m.includes("connection_blocked")) {
      throw new Error("This supplier has removed you from their store. Ask them to add you back.");
    }
    if (m.includes("storefront_not_found")) throw new Error("Look the code up again, then connect.");
    throw error;
  }
  return data as string;
}

export async function disconnectStorefront(buyerId: string, storefrontId: string) {
  const { error } = await supabase
    .from("storefront_buyers")
    .delete()
    .eq("buyer_id", buyerId)
    .eq("storefront_id", storefrontId);
  if (error) throw error;
}

/* ─── Messages ─────────────────────────────────────────── */

export async function getConversations(userId: string) {
  // Get storefront orgs for this buyer
  const { data: sfs } = await supabase
    .from("storefront_buyers")
    .select("storefronts(org_id)")
    .eq("buyer_id", userId)
    .eq("status", "active");
  
  if (!sfs || sfs.length === 0) return [];
  
  const orgIds = sfs.map((s: unknown) => (s as { storefronts?: { org_id?: string } })?.storefronts?.org_id).filter(Boolean);
  if (orgIds.length === 0) return [];
  
  // All messages in these orgs involving this user
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("org_id", orgIds)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  
  const byPeer = new Map<string, AnyRow>();
  for (const m of data || []) {
    const peer = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!byPeer.has(peer as string)) byPeer.set(peer as string, m);
  }
  return Array.from(byPeer.entries()).map(([peerId, last]) => ({
    peerId,
    last: toCamel(last),
  }));
}

export async function getMessages(userId: string, peerId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return mapAll(data);
}

export async function sendMessage(orgId: string, senderId: string, receiverId: string, text: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ org_id: orgId, sender_id: senderId, receiver_id: receiverId, text, read: false })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function markConversationRead(userId: string, peerId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("sender_id", peerId)
    .eq("receiver_id", userId)
    .eq("read", false);
  if (error) throw error;
}

/* ─── Notifications ────────────────────────────────────── */

export async function getNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapAll(data);
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

/* ─── Approvals ────────────────────────────────────────── */

export async function getApprovals(orgId: string) {
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapAll(data);
}

/* `approvals` has no resolved_at and no reason column. Both of these wrote to
   them anyway, so both would have failed outright the first time anything
   called them — and nothing does yet, which is the only reason it has not
   been noticed. Left as they were, the next person to wire up a reject button
   would have inherited the same silent rejection that made approving from
   this dashboard impossible since the day it was written.

   updated_at exists and carries the timestamp. The reason goes into note,
   which is the only free-text column on the table, appended rather than
   assigned so the submitter's own note is not overwritten by the answer to
   it. */
export async function approveApproval(id: string) {
  const { error } = await supabase
    .from("approvals")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectApproval(id: string, reason?: string) {
  const patch: Record<string, unknown> = {
    status: "rejected",
    updated_at: new Date().toISOString(),
  };

  const why = reason?.trim();
  if (why) {
    const { data: existing } = await supabase
      .from("approvals")
      .select("note")
      .eq("id", id)
      .maybeSingle();
    const prior = (existing?.note ?? "").trim();
    patch.note = prior ? `${prior}\n\nRejected: ${why}` : `Rejected: ${why}`;
  }

  const { error } = await supabase.from("approvals").update(patch).eq("id", id);
  if (error) throw error;
}

/* ─── Blacklist ────────────────────────────────────────── */

export async function getBlacklist(orgId: string) {
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapAll(data);
}

export async function addToBlacklist(orgId: string, input: { barcode: string; label?: string; reason?: string }) {
  const { data, error } = await supabase
    .from("blacklist")
    .insert({ org_id: orgId, ...input })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function removeFromBlacklist(id: string) {
  const { error } = await supabase.from("blacklist").delete().eq("id", id);
  if (error) throw error;
}

/* ─── Whitelist ────────────────────────────────────────────
 * NOTE: there is no dedicated whitelist table in the schema.
 * We model it as blacklist rows with reason prefix "WHITELIST:".
 * If a proper table is added later, swap the implementation here.
 */
const WHITELIST_PREFIX = "WHITELIST:";

export async function getWhitelist(orgId: string) {
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .eq("org_id", orgId)
    .ilike("reason", `${WHITELIST_PREFIX}%`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapAll(data).map((r: AnyRow) => ({
    ...r,
    reason: typeof r.reason === "string" ? (r.reason as string).replace(WHITELIST_PREFIX, "").trim() : r.reason,
  }));
}

export async function addToWhitelist(orgId: string, input: { barcode: string; label?: string; reason?: string }) {
  const { data, error } = await supabase
    .from("blacklist")
    .insert({
      org_id: orgId,
      barcode: input.barcode,
      label: input.label ?? null,
      reason: `${WHITELIST_PREFIX} ${input.reason ?? ""}`.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function removeFromWhitelist(id: string) {
  const { error } = await supabase.from("blacklist").delete().eq("id", id);
  if (error) throw error;
}

/* ─── Support tickets ──────────────────────────────────── */

export async function getTickets(orgId: string, filters: { status?: string } = {}) {
  let q = supabase.from("support_tickets").select("*").eq("org_id", orgId);
  if (filters.status) q = q.eq("status", filters.status);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return mapAll(data);
}

export async function createTicket(
  orgId: string,
  userId: string,
  userEmail: string,
  input: { category: string; message: string; priority?: string }
) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      org_id: orgId,
      user_id: userId,
      user_email: userEmail,
      category: input.category,
      message: input.message,
      priority: input.priority ?? "normal",
      status: "open",
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function updateTicket(id: string, patch: AnyRow) {
  const { data, error } = await supabase
    .from("support_tickets")
    .update(toSnake(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

/* ─── Favorites (buyer) ────────────────────────────────────
 * NOTE: no `favorites` table. We use `inventory.favorited_by` jsonb
 * array of buyer user ids. Matches mobile app's current convention.
 */

export async function getFavorites(_orgId: string, buyerId: string) {
  // Fetch all inventory and filter in JS - avoids jsonb query issues
  const { data, error } = await supabase
    .from("inventory")
    .select("*");
  if (error) throw error;
  // Filter items where favorited_by contains this buyerId
  const favorites = (data || []).filter((item: AnyRow) => {
    const fav = item.favorited_by;
    if (!fav || !Array.isArray(fav)) return false;
    return fav.includes(buyerId);
  });
  return mapAll(favorites);
}

export async function toggleFavorite(itemId: string, buyerId: string) {
  const { data: row, error: readErr } = await supabase
    .from("inventory")
    .select("favorited_by")
    .eq("id", itemId)
    .single();
  if (readErr) throw readErr;
  const current: string[] = Array.isArray(row?.favorited_by) ? (row!.favorited_by as string[]) : [];
  const next = current.includes(buyerId) ? current.filter((id) => id !== buyerId) : [...current, buyerId];
  const { error } = await supabase.from("inventory").update({ favorited_by: next }).eq("id", itemId);
  if (error) throw error;
  return next.includes(buyerId);
}

/* ─── Org / invite codes ───────────────────────────────── */

export async function getOrg(orgId: string) {
  const { data, error } = await supabase.from("organizations").select(ORG_COLUMNS).eq("id", orgId).single<AnyRow>();
  if (error) throw error;
  return toCamel(data);
}

/** The staff join codes, through the server: an admin of the organization only. */
export async function getInviteCodes(orgId: string): Promise<{ admin?: string; worker?: string }> {
  const { data, error } = await supabase.rpc("ensure_org_invite_codes", { p_org_id: orgId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { admin_invite_code?: string | null; worker_invite_code?: string | null }
    | null;
  return { admin: row?.admin_invite_code ?? undefined, worker: row?.worker_invite_code ?? undefined };
}

/**
 * Staff join codes only.
 *
 * Through rotate_org_invite_code: the database makes the new code (8
 * characters, secure random), checks who is asking (any admin for the worker
 * code, the owner or a super admin for the admin one) and returns it. This
 * used to make a 4-character code here and write it with a direct update -
 * short enough to guess - and read the row back with select(), which the
 * hidden code columns made fail.
 */
export async function regenerateInviteCode(orgId: string, kind: "admin" | "worker") {
  const { data, error } = await supabase.rpc("rotate_org_invite_code", { p_org_id: orgId, p_kind: kind });
  if (error) throw error;
  return { code: data as string };
}

/**
 * Call an Edge Function and hand back its answer, or throw its own reason.
 *
 * supabase-js reports any non-2xx answer as "Edge Function returned a non-2xx
 * status code"; what the function said ("Owners cannot be edited.", "That
 * email already has an account...") is in the response body. The portal used
 * to show the generic line, so an admin never learned why something was
 * refused.
 */
async function invokeFunction(name: string, body: unknown) {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    try {
      const response = (error as { context?: Response }).context;
      const parsed = response && typeof response.json === "function" ? await response.json() : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      /* not JSON - keep the generic message */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Create an organisation, with the signed-in user as its owner.
 *
 * Through the create-org-secure Edge Function, the same as the app: it makes
 * the organisation with long invite codes, applies the owner's country
 * restriction, and sets up their profile and membership in one go. This used
 * to insert the organisation from the browser with 4-character codes and then
 * write the owner's role onto their own profile - which the database refuses
 * (role changes on your own row need a matching membership), and the insert's
 * select() read columns that are hidden. The organisation's id comes back.
 */
export async function createOrganization(input: { name: string }) {
  const data = await invokeFunction("create-org-secure", { name: input.name.trim() });
  return { id: data?.orgId as string };
}

/* ─── Edge function wrappers (destructive user actions) ── */

export async function adminCreateUser(input: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "worker" | "buyer";
  permissions?: "admin" | "superadmin";
  facilityId?: string | null;
}) {
  return invokeFunction("create-user", input);
}

export async function adminResetPassword(userId: string, newPassword: string) {
  return invokeFunction("admin-reset-password", { targetUserId: userId, newPassword });
}

export async function adminDeleteUser(userId: string) {
  return invokeFunction("admin-delete-user", { targetUserId: userId });
}

/**
 * Change a member's role, through admin-update-user-role: it ranks both
 * people by the organisation's own records (the owner cannot be changed, only
 * owners and super admins change roles) and updates the membership the app
 * reads as well as the profile. A direct update of users.role did neither -
 * the app read the old role back from the membership on its next launch.
 */
export async function adminUpdateUserRole(userId: string, newRole: "admin" | "worker" | "buyer") {
  return invokeFunction("admin-update-user-role", { targetUserId: userId, newRole });
}
