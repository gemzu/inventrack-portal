/**
 * Centralized Supabase data access layer for the web portal.
 * Mirrors utils/dataService.js from the mobile app — snake_case DB rows
 * come back as camelCase objects so React components stay consistent.
 *
 * Every read filters by org_id. Every write injects org_id on the row.
 * Errors are thrown, not swallowed.
 */
import { supabase } from "@/lib/supabase";

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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomCode = () => {
    let code = "STORE-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
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

export async function getStorefrontByCode(code: string) {
  const { data, error } = await supabase
    .from("storefronts")
    .select("*")
    .eq("invite_code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamel(data) : null;
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

export async function connectToStorefront(buyerId: string, storefrontId: string) {
  // storefront_buyers.status CHECK constraint only allows 'active' | 'blocked'.
  const { data, error } = await supabase
    .from("storefront_buyers")
    .upsert(
      { buyer_id: buyerId, storefront_id: storefrontId, status: "active", connected_at: new Date().toISOString() },
      { onConflict: "storefront_id,buyer_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
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
  // All messages involving this user, latest per peer.
  const { data, error } = await supabase
    .from("messages")
    .select("*")
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

export async function approveApproval(id: string) {
  const { error } = await supabase
    .from("approvals")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectApproval(id: string, reason?: string) {
  const { error } = await supabase
    .from("approvals")
    .update({ status: "rejected", resolved_at: new Date().toISOString(), reason: reason ?? null })
    .eq("id", id);
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

export async function getFavorites(orgId: string, buyerId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("org_id", orgId)
    .contains("favorited_by", [buyerId]);
  if (error) throw error;
  return mapAll(data);
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
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).single();
  if (error) throw error;
  return toCamel(data);
}

function randomCode(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix + "-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function regenerateInviteCode(orgId: string, kind: "admin" | "worker" | "buyer") {
  const column =
    kind === "admin" ? "admin_invite_code" : kind === "worker" ? "worker_invite_code" : "invite_code";
  const prefix = kind === "admin" ? "ADM" : kind === "worker" ? "WRK" : "ORG";
  const code = randomCode(prefix);
  const { data, error } = await supabase
    .from("organizations")
    .update({ [column]: code })
    .eq("id", orgId)
    .select()
    .single();
  if (error) throw error;
  return { code, org: toCamel(data) };
}

export async function createOrganization(input: { name: string; ownerId: string }) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomCode = (prefix: string) => {
    let code = `${prefix}-`;
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name.trim(),
      owner_id: input.ownerId,
      admin_invite_code: randomCode("ADM"),
      worker_invite_code: randomCode("WRK"),
      invite_code: randomCode("ORG"),
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function assignOwnerToOrganization(userId: string, orgId: string) {
  // User row can lag briefly after signup trigger. Retry a few times.
  let lastErr: unknown = null;
  for (let i = 0; i < 5; i++) {
    const { error } = await supabase
      .from("users")
      .update({ org_id: orgId, role: "admin", permissions: "owner", active: true })
      .eq("id", userId);
    if (!error) return;
    lastErr = error;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw (lastErr as Error) || new Error("Failed to assign owner to organization");
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
  const { data, error } = await supabase.functions.invoke("create-user", { body: input });
  if (error) throw error;
  return data;
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const { data, error } = await supabase.functions.invoke("admin-reset-password", {
    body: { userId, newPassword },
  });
  if (error) throw error;
  return data;
}

export async function adminDeleteUser(userId: string) {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
  });
  if (error) throw error;
  return data;
}
