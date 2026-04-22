"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users as UsersIcon, Search, ChevronDown, UserCheck, UserX } from "lucide-react";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";

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
  const { orgId, facilities } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [filtered, setFiltered] = useState<UserDoc[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase.from("users").select("*").eq("org_id", orgId);
      const mapped = (data || []).map(mapUser);
      setUsers(mapped);
      setFiltered(mapped);
      setLoading(false);
    };
    load();
  }, [orgId]);

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (<AdminGuard>
    <div className="animate-page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="worker">Worker</option>
            <option value="buyer">Buyer</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      <Card className="overflow-hidden"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell text-muted-foreground">Facility</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition border-b border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      className="appearance-none px-2 py-1 rounded-lg border text-xs cursor-pointer bg-input border-border text-foreground"
                    >
                      <option value="admin">Admin</option>
                      <option value="worker">Worker</option>
                      <option value="buyer">Buyer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={user.facilityId || ""}
                      onChange={(e) => assignFacility(user, e.target.value)}
                      className="appearance-none px-2 py-1 rounded-lg border text-xs cursor-pointer bg-input border-border text-foreground"
                    >
                      <option value="">None</option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.active
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-danger/10 text-danger border border-danger/20"
                    }`}>
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDate(user.createdAt as string)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`p-1.5 rounded-lg transition ${
                        user.active ? "hover:bg-danger/10 text-danger" : "hover:bg-success/10 text-success"
                      }`}
                      title={user.active ? "Deactivate" : "Activate"}
                    >
                      {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={UsersIcon} title="No users found" description="Team members who join your organization will appear here." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  </AdminGuard>);
}
