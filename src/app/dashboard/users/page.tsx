"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users as UsersIcon, Search, UserCheck, UserX, Trash2, Award } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import { Panel, ListSkeleton } from "@/components/console/surfaces";
import { Modal } from "@/components/console/controls";
import { canManage, isOwner, roleBadgeLabel } from "@/lib/roles";
import { adminCreateUser, adminUpdateUserRole, transferOrgOwnership } from "@/lib/dataService";

interface UserDoc {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: string;
  active: boolean;
  permissions?: string;
  facilityId?: string;
  createdAt: unknown;
  /** In this organization, but has another of theirs open right now. */
  elsewhere?: boolean;
}

/* Who has this organization open, then members who have another of theirs
   open right now (org_members_elsewhere). Listing by org_id alone dropped
   someone in two organizations from one list while they worked in the other,
   so its admins could not see them, change their role or remove them. */
async function fetchMembers(orgId: string): Promise<UserDoc[]> {
  const { data } = await supabase.from("users").select("*").eq("org_id", orgId);
  const here = (data || []).map(mapUser);
  const { data: away } = await supabase.rpc("org_members_elsewhere", { p_org_id: orgId });
  const ids = new Set(here.map((u) => u.id));
  const elsewhere = ((away || []) as Record<string, unknown>[])
    .map((row) => ({ ...mapUser(row), elsewhere: true }))
    .filter((u) => !ids.has(u.id));
  return [...here, ...elsewhere];
}

function mapUser(row: Record<string, unknown>): UserDoc {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    email: (row.email as string) || "",
    company: row.company as string | undefined,
    role: (row.role as string) || "buyer",
    active: (row.active as boolean) ?? false,
    permissions: row.permissions as string | undefined,
    facilityId: row.facility_id as string | undefined,
    createdAt: row.created_at,
  };
}

export default function UsersPage() {
  const { user: currentUser, orgId, orgData, userRole, userPermissions, facilities, refreshProfile } = useAuth();
  /* The org's owner_id is who owns it; a membership label can lag behind. */
  const callerOwns = !!currentUser?.id && (orgData?.ownerId === currentUser.id || isOwner(userPermissions));
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [filtered, setFiltered] = useState<UserDoc[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "worker",
    permissions: "admin",
    facilityId: "none",
  });
  const { toast } = useToast();

  // Owner-controlled delete access - free only for our organization (matches app).
  const DELETE_ACCESS_ORGS = ["054fd1ca-927b-413f-93a4-c1e4d1f3853a"];
  const canEditDeleteAccess = isOwner(userPermissions) && orgId != null && DELETE_ACCESS_ORGS.includes(orgId);
  const [deleteAccessMap, setDeleteAccessMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const mapped = await fetchMembers(orgId);
      setUsers(mapped);
      setFiltered(mapped);
      setLoading(false);
      if (canEditDeleteAccess) {
        /* Through org_delete_access: a plain select returned only the
           owner's own membership, so every other switch read as off. */
        const { data: mem } = await supabase.rpc("org_delete_access", { p_org_id: orgId });
        const map: Record<string, boolean> = {};
        (mem || []).forEach((r: Record<string, unknown>) => { map[r.user_id as string] = r.can_delete === true; });
        setDeleteAccessMap(map);
      }
    };
    load();
  }, [orgId, canEditDeleteAccess]);

  const toggleDeleteAccess = async (u: UserDoc) => {
    const next = !deleteAccessMap[u.id];
    setDeleteAccessMap((m) => ({ ...m, [u.id]: next }));
    const { error } = await supabase
      .from("organization_memberships")
      .update({ can_delete: next })
      .eq("org_id", orgId)
      .eq("user_id", u.id);
    if (error) {
      setDeleteAccessMap((m) => ({ ...m, [u.id]: !next }));
      toast("Failed to update delete access", "error");
    } else {
      toast(next ? "Delete access granted" : "Delete access revoked", "success");
    }
  };

  useEffect(() => {
    let result = users;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((u) => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
    }
    if (roleFilter !== "all") result = result.filter((u) => u.role === roleFilter);
    setFiltered(result);
  }, [search, roleFilter, users]);

  const toggleActive = async (user: UserDoc) => {
    if (!canManage({ id: currentUser?.id || null, role: userRole, permissions: userPermissions }, user)) {
      toast("You don't have permission to change this user", "error");
      return;
    }
    if (user.elsewhere) {
      toast("Switching off covers their whole account, so it works while they have this organization open.", "error");
      return;
    }
    try {
      const newActive = !user.active;
      /* An update the rules filter out is no error and no rows - it said
         "activated" while nothing had changed. */
      const { data, error } = await supabase.from("users").update({ active: newActive }).eq("id", user.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not updated");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: newActive } : u)));
      toast(`User ${newActive ? "activated" : "deactivated"}`, "success");
    } catch {
      toast("Failed to update user status", "error");
    }
  };

  const changeRole = async (user: UserDoc, newRole: string) => {
    if (!canManage({ id: currentUser?.id || null, role: userRole, permissions: userPermissions }, user)) {
      toast("You don't have permission to change this role", "error");
      return;
    }
    if (isOwner(user.permissions)) {
      toast("Owner role can't be changed", "error");
      return;
    }
    try {
      await adminUpdateUserRole(user.id, newRole as "admin" | "worker" | "buyer");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast(`Role updated to ${newRole}`, "success");
    } catch (e) {
      toast((e as Error).message || "Failed to change role", "error");
    }
  };

  /* Hand the organization to another admin (transfer_org_ownership). The
     database checks the same rules; the old owner stays on as a super admin. */
  const makeOwner = async (user: UserDoc) => {
    if (!orgId) return;
    const who = user.name || user.email;
    const company = orgData?.name || "this organization";
    if (!confirm(`Make ${who} the owner of ${company}?

They can then delete the company, decide who may delete records, replace the admin code and change super admins. You stay on as a super admin. Only the new owner can hand it back.`)) return;
    try {
      await transferOrgOwnership(orgId, user.id);
      toast(`${who} is now the owner`, "success");
      await refreshProfile();
      setUsers(await fetchMembers(orgId));
    } catch (e) {
      toast((e as Error).message || "Could not hand over", "error");
    }
  };

  const assignFacility = async (user: UserDoc, facilityId: string) => {
    if (!canManage({ id: currentUser?.id || null, role: userRole, permissions: userPermissions }, user)) {
      toast("You don't have permission to assign facility", "error");
      return;
    }
    if (user.elsewhere) {
      toast("Their facility can be changed while they have this organization open.", "error");
      return;
    }
    try {
      const val = facilityId === "" ? null : facilityId;
      const { data, error } = await supabase.from("users").update({ facility_id: val }).eq("id", user.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not updated");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, facilityId: val || undefined } : u)));
      toast("Facility assignment updated", "success");
    } catch {
      toast("Failed to assign facility", "error");
    }
  };

  if (loading) {
    return (
      <ListSkeleton />
    );
  }

  return (<AdminGuard>
    <PageShell
      title="Users"
      subtitle={`${filtered.length} members`}
      actions={
        <Button
          onClick={() => setShowAdd(true)}
          disabled={userRole !== "admin"}
        >
          Add User
        </Button>
      }
    >

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10 h-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || "all")}>
          <SelectTrigger className="sm:w-[170px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel className="reveal">
        {filtered.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="Team members who join your organization will appear here." />
        ) : (
          filtered.map((user) => {
            const manageable = canManage({ id: currentUser?.id || null, role: userRole, permissions: userPermissions }, user);
            return (
              <div key={user.id} className="row-line flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
                {/* Identity */}
                <div className="min-w-[200px] flex-1">
                  <p className="truncate text-sm font-medium">{user.name || "Unnamed"}</p>
                  <p className="mono truncate text-[12px] text-muted-foreground">
                    {roleBadgeLabel(user.role, user.permissions)} · {user.email}
                  </p>
                  {user.elsewhere && (
                    <p className="truncate text-[12px] text-muted-foreground">Working in another organization right now</p>
                  )}
                </div>

                {/* Inline controls — wrap onto next line instead of scrolling off */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={user.role}
                    onValueChange={(val) => changeRole(user, val || user.role)}
                    disabled={!manageable || isOwner(user.permissions)}
                  >
                    <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={user.facilityId || "none"}
                    onValueChange={(val) => assignFacility(user, (val || "none") === "none" ? "" : (val || ""))}
                    disabled={!manageable || user.elsewhere}
                  >
                    <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No facility</SelectItem>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Status
                    status={user.active ? "active" : "blocked"}
                    label={user.active ? "Active" : "Inactive"}
                  />
                  {/* Actions — always visible */}
                  {callerOwns && user.id !== currentUser?.id && user.role === "admin" && user.active && (
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => makeOwner(user)}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      title="Make owner"
                      aria-label={`Make ${user.name || user.email} the owner`}
                    >
                      <Award className="w-4 h-4" />
                    </Button>
                  )}
                  {canEditDeleteAccess && user.role !== "buyer" && !isOwner(user.permissions) && (
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => toggleDeleteAccess(user)}
                      className={`h-9 w-9 ${deleteAccessMap[user.id] ? "text-destructive bg-destructive/10" : "text-muted-foreground"}`}
                      title={deleteAccessMap[user.id] ? "Delete access: ON (tap to revoke)" : "Delete access: OFF (tap to grant)"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={() => toggleActive(user)}
                    disabled={!manageable || user.elsewhere}
                    className={`h-9 w-9 ${user.active ? "hover:bg-destructive/10 text-destructive" : "hover:bg-success/10 text-success"}`}
                    title={user.active ? "Deactivate" : "Activate"}
                  >
                    {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Panel>
    </PageShell>
    {showAdd && (
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add a person" subtitle="They can sign in straight away">
        <div className="space-y-4">
            <Input placeholder="Full name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Temporary password (min 6)" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
            <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v || "worker" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
              </SelectContent>
            </Select>
            {newUser.role === "admin" && (
              <Select value={newUser.permissions} onValueChange={(v) => setNewUser((p) => ({ ...p, permissions: v || "admin" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            )}
            {newUser.role === "worker" && (
              <Select value={newUser.facilityId} onValueChange={(v) => setNewUser((p) => ({ ...p, facilityId: v || "none" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Facility</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                disabled={creating}
                onClick={async () => {
                  if (!newUser.name || !newUser.email || newUser.password.length < 6) {
                    toast("Name, email, and password (min 6) are required", "error");
                    return;
                  }
                  try {
                    setCreating(true);
                    await adminCreateUser({
                      name: newUser.name,
                      email: newUser.email,
                      password: newUser.password,
                      role: newUser.role as "admin" | "worker" | "buyer",
                      permissions: newUser.role === "admin" ? (newUser.permissions as "admin" | "superadmin") : undefined,
                      facilityId: newUser.role === "worker" && newUser.facilityId !== "none" ? newUser.facilityId : null,
                    });
                    const mapped = orgId ? await fetchMembers(orgId) : [];
                    setUsers(mapped);
                    toast("User created", "success");
                    setShowAdd(false);
                    setNewUser({ name: "", email: "", password: "", role: "worker", permissions: "admin", facilityId: "none" });
                  } catch (e) {
                    toast((e as Error).message || "Failed to create user", "error");
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? "Creating..." : "Create User"}
              </Button>
            </div>
        </div>
      </Modal>
    )}
  </AdminGuard>);
}
