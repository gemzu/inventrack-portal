"use client";

/**
 * Users - the people in this company: their role, site, and whether the
 * account is switched on. What each person may do (Sales and invoices, Delete,
 * Invoice entry) lives on Access; this page links there.
 *
 * Every dropdown shows the label of what is chosen. The previous version used
 * a select that printed the stored value instead (a site's long id, "worker",
 * "none"), and replaced the whole page with a skeleton while it loaded. The
 * page frame now stays, and the two reads it needs run together.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, KeyRound, UserPlus, Users as UsersIcon } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Field, Input, Modal, SearchInput, Select } from "@/components/console/controls";
import { canManage, isOwner, roleBadgeLabel } from "@/lib/roles";
import { adminCreateUser, adminUpdateUserRole, transferOrgOwnership } from "@/lib/dataService";

interface UserDoc {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  permissions?: string;
  facilityId?: string;
  /** In this organization, but has another of theirs open right now. */
  elsewhere?: boolean;
}

function mapUser(row: Record<string, unknown>): UserDoc {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    email: (row.email as string) || "",
    role: (row.role as string) || "buyer",
    active: (row.active as boolean) ?? false,
    permissions: row.permissions as string | undefined,
    facilityId: row.facility_id as string | undefined,
  };
}

/* Who has this organization open, then members who have another of theirs
   open right now (org_members_elsewhere): listing by org_id alone dropped
   someone in two organizations from the list while they worked in the other.
   Asked together, not one after the other. */
async function fetchMembers(orgId: string): Promise<UserDoc[]> {
  const [here, away] = await Promise.all([
    supabase.from("users").select("id, name, email, role, active, permissions, facility_id").eq("org_id", orgId),
    supabase.rpc("org_members_elsewhere", { p_org_id: orgId }),
  ]);
  if (here.error) throw new Error(here.error.message);
  const mine = (here.data || []).map(mapUser);
  const ids = new Set(mine.map((u) => u.id));
  const elsewhere = ((away.data || []) as Record<string, unknown>[])
    .map((row) => ({ ...mapUser(row), elsewhere: true }))
    .filter((u) => !ids.has(u.id));
  return [...mine, ...elsewhere];
}

const ROLE_FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "admin", label: "Admins" },
  { value: "worker", label: "Workers" },
  { value: "buyer", label: "Buyers" },
];

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersEditor />
    </AdminGuard>
  );
}

function UsersEditor() {
  const { user: me, orgId, orgData, userRole, userPermissions, facilities, refreshProfile, isOwner: ownerFlag } = useAuth();
  const { toast } = useToast();
  /* The org's owner_id is who owns it; a membership label can lag behind. */
  const callerOwns = !!me?.id && (orgData?.ownerId === me.id || isOwner(userPermissions) || ownerFlag);
  const actor = useMemo(() => ({ id: me?.id || null, role: userRole, permissions: userPermissions }), [me?.id, userRole, userPermissions]);

  const [users, setUsers] = useState<UserDoc[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      setUsers(await fetchMembers(orgId));
      setError("");
    } catch (e) {
      setError((e as Error).message || "Could not load the people in this company");
      setUsers((prev) => prev ?? []);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const siteName = useCallback((id?: string) => facilities.find((f) => f.id === id)?.name, [facilities]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, search, roleFilter]);

  const patch = (id: string, p: Partial<UserDoc>) => setUsers((prev) => (prev || []).map((u) => (u.id === id ? { ...u, ...p } : u)));

  const toggleActive = async (u: UserDoc) => {
    if (u.elsewhere) { toast("Switching off covers their whole account, so it works while they have this organization open.", "error"); return; }
    if (u.active && !confirm(`Switch off ${u.name || u.email}? They are signed out of everything and cannot sign in until you switch them back on.`)) return;
    try {
      /* An update the rules filter out is no error and no rows - it used to say
         "activated" while nothing had changed. */
      const { data, error: e } = await supabase.from("users").update({ active: !u.active }).eq("id", u.id).select("id");
      if (e) throw e;
      if (!data?.length) throw new Error("not updated");
      patch(u.id, { active: !u.active });
      toast(`${u.name || u.email} switched ${u.active ? "off" : "on"}`, "success");
    } catch {
      toast("Could not change that account", "error");
    }
  };

  const changeRole = async (u: UserDoc, role: string) => {
    if (role === u.role) return;
    const before = u.role;
    patch(u.id, { role });
    try {
      await adminUpdateUserRole(u.id, role as "admin" | "worker" | "buyer");
      toast(`${u.name || u.email} is now ${role === "admin" ? "an admin" : role === "worker" ? "a worker" : "a buyer"}`, "success");
    } catch (e) {
      patch(u.id, { role: before });
      toast((e as Error).message || "Could not change the role", "error");
    }
  };

  const assignSite = async (u: UserDoc, siteId: string) => {
    if (u.elsewhere) { toast("Their site can be changed while they have this organization open.", "error"); return; }
    const before = u.facilityId;
    const next = siteId || undefined;
    patch(u.id, { facilityId: next });
    try {
      const { data, error: e } = await supabase.from("users").update({ facility_id: next ?? null }).eq("id", u.id).select("id");
      if (e) throw e;
      if (!data?.length) throw new Error("not updated");
      toast(next ? `${u.name || u.email} assigned to ${siteName(next) || "that site"}` : `${u.name || u.email} has no site now`, "success");
    } catch {
      patch(u.id, { facilityId: before });
      toast("Could not change the site", "error");
    }
  };

  /* Hand the organization to another admin (transfer_org_ownership). The
     database checks the same rules; the old owner stays on as a super admin. */
  const makeOwner = async (u: UserDoc) => {
    if (!orgId) return;
    const who = u.name || u.email;
    if (!confirm(`Make ${who} the owner of ${orgData?.name || "this organization"}?\n\nThey can then delete the company, decide who may delete records, replace the admin code and change super admins. You stay on as a super admin. Only the new owner can hand it back.`)) return;
    try {
      await transferOrgOwnership(orgId, u.id);
      toast(`${who} is now the owner`, "success");
      await refreshProfile();
      load();
    } catch (e) {
      toast((e as Error).message || "Could not hand over", "error");
    }
  };

  const total = users?.length ?? 0;
  const admins = (users || []).filter((u) => u.role === "admin").length;
  const workers = (users || []).filter((u) => u.role === "worker").length;
  const off = (users || []).filter((u) => !u.active).length;

  return (
    <PageShell
      title="Users"
      subtitle="The people in your company: role, site, and whether their account is on."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {callerOwns ? (
            <Link href="/dashboard/access" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]">
              <KeyRound className="h-3.5 w-3.5" /> Permissions
            </Link>
          ) : null}
          <Action solid onClick={() => setShowAdd(true)} disabled={userRole !== "admin"}>
            <UserPlus className="h-3.5 w-3.5" /> Add person
          </Action>
        </div>
      }
    >
      {users === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-6">
          {error ? <p role="alert" className="text-sm text-destructive">{error} <button type="button" onClick={load} className="underline underline-offset-2">Try again</button></p> : null}

          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="People" value={total} />
            <Figure label="Admins" value={admins} />
            <Figure label="Workers" value={workers} />
            {off ? <Figure label="Switched off" value={off} tone="warning" /> : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by name or email"
              aria-label="Search people"
              className="min-w-0 flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map((f) => (
                <Chip key={f.value} on={roleFilter === f.value} onClick={() => setRoleFilter(f.value)}>{f.label}</Chip>
              ))}
            </div>
          </div>

          <Panel className="reveal">
            {rows.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title={users.length === 0 ? "Nobody yet" : "No match"}
                description={users.length === 0 ? "People who join with an invite code appear here." : "Nobody matches that search."}
              />
            ) : (
              <>
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_9rem_12rem_11rem]">
                  <ColHead>Person</ColHead>
                  <ColHead>Role</ColHead>
                  <ColHead>Site</ColHead>
                  <ColHead className="text-right">Account</ColHead>
                </div>
                {rows.map((u) => {
                  const mine = u.id === me?.id;
                  const manageable = canManage(actor, u) && !u.elsewhere;
                  const owner = isOwner(u.permissions);
                  return (
                    <div key={u.id} className="row-line grid items-center gap-x-4 gap-y-3 px-5 py-3.5 lg:grid-cols-[minmax(0,1fr)_9rem_12rem_11rem]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.name || "Unnamed"}
                          {mine ? <span className="ml-2 text-[11px] font-semibold text-muted-foreground">You</span> : null}
                          {owner ? <span className="ml-2 text-[11px] font-semibold text-[var(--brand-2)]">Owner</span> : null}
                        </p>
                        <p className="mono truncate text-[12px] text-muted-foreground">{roleBadgeLabel(u.role, u.permissions)} · {u.email}</p>
                        {u.elsewhere ? <p className="truncate text-[12px] text-muted-foreground">Working in another organization right now</p> : null}
                      </div>

                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={!manageable || owner}
                        aria-label={`Role for ${u.name || u.email}`}
                        className="h-10 py-0 text-[13px]"
                      >
                        <option value="admin">Admin</option>
                        <option value="worker">Worker</option>
                        <option value="buyer">Buyer</option>
                      </Select>

                      <Select
                        value={u.facilityId || ""}
                        onChange={(e) => assignSite(u, e.target.value)}
                        disabled={!manageable || u.role === "buyer"}
                        aria-label={`Site for ${u.name || u.email}`}
                        className="h-10 py-0 text-[13px]"
                      >
                        <option value="">{u.role === "buyer" ? "—" : "No site"}</option>
                        {u.facilityId && !siteName(u.facilityId) ? <option value={u.facilityId}>Another site</option> : null}
                        {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </Select>

                      <div className="flex items-center gap-2 lg:justify-end">
                        <span className="inline-flex items-center gap-1.5 text-[12px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-success" : "bg-muted-foreground"}`} />
                          {u.active ? "On" : "Off"}
                        </span>
                        {callerOwns && !mine && u.role === "admin" && u.active && !u.elsewhere && !owner ? (
                          <button type="button" onClick={() => makeOwner(u)} title="Make owner" aria-label={`Make ${u.name || u.email} the owner`}
                            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]">
                            <Award className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {manageable && !owner ? (
                          <button type="button" onClick={() => toggleActive(u)}
                            className={`rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${u.active
                              ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                              : "border-[var(--brand-2)] text-[var(--brand-2)] hover:bg-[color-mix(in_oklab,var(--brand-2)_12%,transparent)]"}`}>
                            {u.active ? "Switch off" : "Switch on"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </Panel>

          <p className="text-[12px] text-muted-foreground">
            Sales and invoices, delete rights and Invoice entry are set per person on{" "}
            {callerOwns ? <Link href="/dashboard/access" className="underline underline-offset-2 hover:text-foreground">Access</Link> : "Access (owner only)"}.
            New people join with a code from <Link href="/dashboard/invites" className="underline underline-offset-2 hover:text-foreground">Invites</Link>.
          </p>
        </div>
      )}

      <AddPerson open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
    </PageShell>
  );
}

/* ── Add a person (a ready-made account, signed in straight away) ──────── */

function AddPerson({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { facilities } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "worker", permissions: "admin", facilityId: "" });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 10) {
      toast("A name, an email and a password of at least 10 characters are needed", "error");
      return;
    }
    setBusy(true);
    try {
      await adminCreateUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role as "admin" | "worker" | "buyer",
        permissions: form.role === "admin" ? (form.permissions as "admin" | "superadmin") : undefined,
        facilityId: form.role === "worker" && form.facilityId ? form.facilityId : null,
      });
      toast("Person added. They can sign in with that email and password.", "success");
      setForm({ name: "", email: "", password: "", role: "worker", permissions: "admin", facilityId: "" });
      onCreated();
    } catch (e) {
      toast((e as Error).message || "Could not add that person", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a person" subtitle="They can sign in straight away. Prefer an invite code? Use Invites.">
      <div className="space-y-4">
        <Field label="Full name"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" /></Field>
        <Field label="Temporary password" hint="At least 10 characters. They can change it after signing in.">
          <Input type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => set({ role: e.target.value })}>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
            <option value="buyer">Buyer</option>
          </Select>
        </Field>
        {form.role === "admin" ? (
          <Field label="Admin level">
            <Select value={form.permissions} onChange={(e) => set({ permissions: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="superadmin">Super admin</option>
            </Select>
          </Field>
        ) : null}
        {form.role === "worker" ? (
          <Field label="Site">
            <Select value={form.facilityId} onChange={(e) => set({ facilityId: e.target.value })}>
              <option value="">No site</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Action onClick={onClose}>Cancel</Action>
          <Action solid onClick={create} disabled={busy}>{busy ? "Adding" : "Add person"}</Action>
        </div>
      </div>
    </Modal>
  );
}
