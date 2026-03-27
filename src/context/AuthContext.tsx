"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
  signup: (name: string, email: string, password: string, company?: string) => Promise<void>;
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || null);
            setUserName(data.name || null);
            setUserCompany(data.company || null);
            setUserActive(data.active ?? false);
            setUserPermissions(data.permissions || null);
            setOrgId(data.orgId || null);
            setUserFacilityId(data.facilityId || null);

            if (data.orgId) {
              const orgDoc = await getDoc(doc(db, "organizations", data.orgId));
              if (orgDoc.exists()) {
                setOrgData(orgDoc.data() as OrgData);
              }
              const facSnap = await getDocs(
                collection(db, "organizations", data.orgId, "facilities")
              );
              setFacilities(
                facSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Facility))
              );
            }
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
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
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string, company?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      company: company || "",
      role: "buyer",
      active: false,
      createdAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
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
