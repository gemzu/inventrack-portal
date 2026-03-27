"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { CreditCard, CheckCircle2, Users, Package, Building2, Zap, Shield, Mail } from "lucide-react";

const allFeatures = [
  "Unlimited users",
  "Unlimited facilities",
  "Unlimited inventory items",
  "Barcode scanning & camera",
  "Advanced analytics dashboard",
  "Order management & approvals",
  "Role-based access control",
  "Google Sheets sync",
  "Multi-facility management",
  "Activity logs & history",
  "Priority support",
];

export default function BillingPage() {
  const { orgId, orgData } = useAuth();
  const [userCount, setUserCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [facilityCount, setFacilityCount] = useState(0);

  const isSubscribed = orgData?.subscribed === true;

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      const [usrSnap, invSnap, facSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("orgId", "==", orgId))),
        getDocs(query(collection(db, "inventory"), where("orgId", "==", orgId))),
        getDocs(collection(db, "organizations", orgId, "facilities")),
      ]);
      setUserCount(usrSnap.size);
      setItemCount(invSnap.size);
      setFacilityCount(facSnap.size);
    };
    load();
  }, [orgId]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Manage your subscription</p>
      </div>

      {/* Subscription Status */}
      <div className={`glass-card p-6 relative overflow-hidden ${isSubscribed ? "ring-2 ring-success" : "ring-2 ring-warning"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSubscribed ? "bg-success/10" : "bg-warning/10"}`}>
            {isSubscribed ? <Shield className="w-6 h-6 text-success" /> : <Zap className="w-6 h-6 text-warning" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{isSubscribed ? "Active Subscription" : "No Active Subscription"}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSubscribed ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20"
              }`}>
                {isSubscribed ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {isSubscribed
                ? "You have full access to all INVENTRACK features."
                : "Subscribe to unlock full access to all features."}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Users", value: userCount, icon: Users },
          { label: "Inventory Items", value: itemCount, icon: Package },
          { label: "Facilities", value: facilityCount, icon: Building2 },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Plan Features */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">INVENTRACK Subscription includes:</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {allFeatures.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSubscribed ? "text-success" : "text-muted-light dark:text-muted-dark"}`} />
              <span style={!isSubscribed ? { color: "var(--muted)" } : undefined}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="glass-card p-8 text-center">
        <CreditCard className="w-10 h-10 mx-auto mb-3 text-primary" />
        <h3 className="text-lg font-bold mb-2">
          {isSubscribed ? "Subscription Management" : "Ready to Subscribe?"}
        </h3>
        <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--muted)" }}>
          {isSubscribed
            ? "Your subscription is active. Contact us to manage your billing."
            : "Payment processing is being set up. Contact us to get started — pay directly on the web and save on app store fees."}
        </p>
        <a
          href="mailto:support@alkasid.com?subject=INVENTRACK Subscription"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/25"
        >
          <Mail className="w-4 h-4" />
          {isSubscribed ? "Contact Support" : "Contact Us to Subscribe"}
        </a>
      </div>

      {/* Why pay on web */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-3 text-center">Why pay on our website?</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-sm" style={{ color: "var(--muted)" }}>
          <div>
            <div className="text-xl font-bold text-danger mb-1">30%</div>
            <p>App stores charge up to 30%</p>
          </div>
          <div>
            <div className="text-xl font-bold text-success mb-1">0%</div>
            <p>We pass savings to you</p>
          </div>
          <div>
            <div className="text-xl font-bold text-primary mb-1">Instant</div>
            <p>Access unlocks in the app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
