"use client";

import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Zap, Shield, ArrowRight } from "lucide-react";

const features = [
  "Unlimited users",
  "Unlimited facilities",
  "Unlimited inventory items",
  "Barcode scanning & camera",
  "Analytics dashboard",
  "Order management & approvals",
  "Role-based access",
  "Google Sheets sync",
  "Priority support",
];

export default function BillingPage() {
  const { orgData, userName } = useAuth();
  const isSubscribed = orgData?.subscribed === true;

  return (
    <div className="max-w-lg mx-auto py-8">
      {/* Status */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isSubscribed ? "bg-success/10" : "gradient-bg"}`}>
          {isSubscribed ? <Shield className="w-8 h-8 text-success" /> : <Zap className="w-8 h-8 text-white" />}
        </div>
        <h1 className="text-2xl font-bold mb-1">
          {isSubscribed ? "You're Subscribed" : "Subscribe to INVENTRACK"}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {isSubscribed
            ? "You have full access to all features."
            : "Unlock full access to your warehouse management platform."}
        </p>
      </div>

      {/* Plan Card */}
      <div className={`glass-card p-6 mb-6 ${isSubscribed ? "ring-2 ring-success" : "ring-2 ring-primary"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">INVENTRACK Full Access</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isSubscribed
              ? "bg-success/10 text-success border border-success/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}>
            {isSubscribed ? "Active" : "Subscribe"}
          </span>
        </div>

        <div className="space-y-2.5 mb-6">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSubscribed ? "text-success" : "text-primary"}`} />
              {f}
            </div>
          ))}
        </div>

        {!isSubscribed && (
          <button
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-lg"
          >
            Subscribe Now <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {isSubscribed && (
          <div className="text-center py-3 rounded-xl bg-success/10 text-success text-sm font-medium">
            Your subscription is active
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center text-xs space-y-2" style={{ color: "var(--muted)" }}>
        <p>Pay directly on our website — no app store fees.</p>
        <p>Subscription activates instantly across web and mobile.</p>
      </div>
    </div>
  );
}
