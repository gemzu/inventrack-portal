"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users as UsersIcon, Search, UserCheck, UserX, Trash2 } from "lucide-react";
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
import { adminCreateUser } from "@/lib/dataService";

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
  const { user: currentUser, orgId, userRole, userPermissions, facilities } = useAuth();
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
      const { data } = await supabase.from("users").select("*").eq("org_id", orgId);
      const mapped = (data || []).map(mapUser);
      setUsers(mapped);
      setFiltered(mapped);
      setLoading(false);
      if (canEditDeleteAccess) {
        const { data: mem } = await supabase
          .from("organization_memberships")
          .select("user_id, can_delete")
          .eq("org_id", orgId);
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
    try {
      const newActive = !user.active;
      const { error } = await supabase.from("users").update({ active: newActive }).eq("id", user.id);
      if (error) throw error;
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
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", user.id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast(`Role updated to ${newRole}`, "success");
    } catch {
      toast("Failed to change role", "error");
    }
  };

  const assignFacility = async (user: UserDoc, facilityId: string) => {
    if (!canManage({ id: currentUser?.id || null, role: userRole, permissions: userPermissions }, user)) {
      toast("You don't have permission to assign facility", "error");
      return;
    }
    try {
      const val = facilityId === "" ? null : facilityId;
      const { error } = await supabase.from("users").update({ facility_id: val }).eq("id", user.id);
      if (error) throw error;
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
                    disabled={!manageable}
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
                    disabled={!manageable}
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
                    const res = await adminCreateUser({
                      name: newUser.name,
                      email: newUser.email,
                      password: newUser.password,
                      role: newUser.role as "admin" | "worker" | "buyer",
                      permissions: newUser.role === "admin" ? (newUser.permissions as "admin" | "superadmin") : undefined,
                      facilityId: newUser.role === "worker" && newUser.facilityId !== "none" ? newUser.facilityId : null,
                    }) as { invited?: boolean; message?: string } | undefined;
                    const { data } = await supabase.from("users").select("*").eq("org_id", orgId);
                    const mapped = (data || []).map(mapUser);
                    setUsers(mapped);
                    toast(res?.invited ? (res.message || "Invitation sent to existing user") : "User created", "success");
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
