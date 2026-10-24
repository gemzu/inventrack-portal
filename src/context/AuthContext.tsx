"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { codeOwed, verifyAuthenticatorCode } from "@/lib/mfa";
import { ORG_COLUMNS } from "@/lib/orgColumns";
import type { User } from "@supabase/supabase-js";

interface Facility {
  id: string;
  name: string;
  state: string;
  address: string;
}

interface OrgData {
  name: string;
  ownerId: string;
  sheetId?: string;
  lowStockThreshold?: number;
  subscribed?: boolean;
  address?: string;
  phone?: string;
  timezone?: string;
  reservationHours?: number;
  orderApprovalRequired?: boolean;
  notifyLowStock?: boolean;
  notifyNewOrders?: boolean;
  notifySubmissions?: boolean;
}

/** A company this account belongs to, for the switcher. */
export interface Membership {
  orgId: string;
  name: string;
  role: string | null;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  userName: string | null;
  userCompany: string | null;
  userActive: boolean;
  userPermissions: string | null;
  orgId: string | null;
  orgData: OrgData | null;
  facilities: Facility[];
  userFacilityId: string | null;
  loading: boolean;
  /** Signed in with the password, but the authenticator code is still owed. */
  mfaPending: boolean;
  verifyMfa: (code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, company?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Every company this account is in (active memberships). */
  memberships: Membership[];
  /** Make another of them the active company - the same switch the phone
      app makes, so both open in the company last chosen. */
  switchOrganization: (orgId: string) => Promise<void>;
  /** Has Sales and invoices ticked (owner's choice, checked by the database). */
  canSales: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userCompany, setUserCompany] = useState<string | null>(null);
  const [userActive, setUserActive] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [userFacilityId, setUserFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [canSales, setCanSales] = useState(false);

  /* The website had no way to change company: it opened whichever one the
     account was last switched to on a phone (reported 2026-10-19). */
  const fetchMemberships = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("organization_memberships")
        .select("org_id, role, organizations(name)")
        .eq("user_id", uid)
        .eq("active", true);
      const list = (data || [])
        .map((m: Record<string, unknown>) => {
          const org = (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations) as { name?: string } | null;
          return { orgId: m.org_id as string, name: org?.name || "Unnamed company", role: (m.role as string) || null };
        })
        .filter((m) => m.orgId)
        .sort((a, b) => a.name.localeCompare(b.name));
      setMemberships(list);
    } catch {
      setMemberships([]);
    }
  };

  const fetchUserProfile = async (supabaseUser: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (error || !data) {
        // User row doesn't exist yet (just signed up, trigger may be pending)
        setUserName(supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || null);
        setUserRole("buyer");
        setLoading(false);
        return;
      }

      setUserRole(data.role || null);
      setUserName(data.name || null);
      setUserCompany(data.company || null);
      setUserActive(data.active ?? false);
      setUserPermissions(data.permissions || null);
      setOrgId(data.org_id || null);
      setUserFacilityId(data.facility_id || null);
      fetchMemberships(supabaseUser.id);

      if (data.org_id) {
        try {
          const { data: orgDoc } = await supabase
            .from("organizations")
            .select(ORG_COLUMNS)
            .eq("id", data.org_id)
            .single<Record<string, unknown>>();

          if (orgDoc) {
            setOrgData({
              name: orgDoc.name as string,
              ownerId: orgDoc.owner_id as string,
              sheetId: (orgDoc.sheet_id as string) ?? undefined,
              lowStockThreshold: (orgDoc.low_stock_threshold as number) ?? undefined,
              subscribed: (orgDoc.subscribed as boolean) ?? undefined,
              address: (orgDoc.address as string) ?? undefined,
              phone: (orgDoc.phone as string) ?? undefined,
              timezone: (orgDoc.timezone as string) ?? undefined,
              reservationHours: (orgDoc.reservation_hours as number) ?? undefined,
              orderApprovalRequired: (orgDoc.order_approval_required as boolean) ?? undefined,
              notifyLowStock: (orgDoc.notify_low_stock as boolean) ?? undefined,
              notifyNewOrders: (orgDoc.notify_new_orders as boolean) ?? undefined,
              notifySubmissions: (orgDoc.notify_submissions as boolean) ?? undefined,
            });
          }

          const { data: facData } = await supabase
            .from("facilities")
            .select("*")
            .eq("org_id", data.org_id);

          setFacilities(
            (facData || []).map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: f.name as string,
              state: f.state as string,
              address: f.address as string,
            }))
          );
        } catch (orgErr) {
          console.warn("Could not fetch org data:", orgErr);
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setMfaPending(codeOwed(session));
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setMfaPending(codeOwed(session));
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser);
      } else {
        setUserRole(null);
        setUserName(null);
        setUserCompany(null);
        setUserActive(false);
        setUserPermissions(null);
        setOrgId(null);
        setOrgData(null);
        setFacilities([]);
        setUserFacilityId(null);
        setMemberships([]);
        setCanSales(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (name: string, email: string, password: string, company?: string, role?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: role || "buyer",
          company: company || "",
        },
      },
    });
    if (error) throw error;
    // A database trigger auto-creates the users table row
  };

  const verifyMfa = async (code: string) => {
    await verifyAuthenticatorCode(code);
    const { data } = await supabase.auth.getSession();
    setMfaPending(codeOwed(data.session));
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectTo = "https://www.invems.com/reset";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (!user) return;
    setLoading(true);
    await fetchUserProfile(user);
  };

  /* The database decides (caller_can_sales): admin, ticked by the owner,
     switched on. Asked once per person and company; sign-in loads the profile
     twice, and an early "no" arriving last used to hide Sales until the next
     page. A late answer for an earlier person or company is ignored. */
  useEffect(() => {
    if (!user?.id || !orgId) return;
    let stale = false;
    supabase.rpc("caller_can_sales").then(({ data, error }) => {
      if (!stale) setCanSales(!error && data === true);
    });
    return () => { stale = true; };
  }, [user?.id, orgId]);

  const switchOrganization = async (nextOrgId: string) => {
    if (!user || !nextOrgId || nextOrgId === orgId) return;
    const { data, error } = await supabase.functions.invoke("switch-active-organization", {
      body: { orgId: nextOrgId },
    });
    if (error) {
      /* The reason is in the response body; supabase-js only says non-2xx. */
      let why = error.message || "Could not switch company";
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) why = body.error;
      } catch { /* keep the generic reason */ }
      throw new Error(why);
    }
    if (data?.error) throw new Error(data.error);
    /* Every page holds the old company's rows in its own state; start clean. */
    window.location.assign("/dashboard");
  };

  return (
    <AuthContext.Provider
      value={{
        user, userRole, userName, userCompany, userActive, userPermissions,
        orgId, orgData, facilities, userFacilityId, loading, mfaPending, verifyMfa,
        login, signup, logout, resetPassword, refreshProfile,
        memberships, switchOrganization, canSales,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
