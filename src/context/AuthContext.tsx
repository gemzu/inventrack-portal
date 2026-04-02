"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
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
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, company?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

      if (data.org_id) {
        try {
          const { data: orgDoc } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", data.org_id)
            .single();

          if (orgDoc) {
            setOrgData({
              name: orgDoc.name,
              ownerId: orgDoc.owner_id,
              sheetId: orgDoc.sheet_id,
              lowStockThreshold: orgDoc.low_stock_threshold,
              subscribed: orgDoc.subscribed,
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
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user, userRole, userName, userCompany, userActive, userPermissions,
        orgId, orgData, facilities, userFacilityId, loading,
        login, signup, logout, resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
