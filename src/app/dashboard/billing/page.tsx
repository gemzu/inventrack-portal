"use client";

import { CheckCircle2, Boxes } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

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
  return (
    <div className="animate-page-enter max-w-lg mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-1">INVENTRACK is Free</h1>
        <p className="text-sm text-muted-foreground">
          You have full access to all features at no cost.
        </p>
      </div>

      <Card className="ring-2 ring-success"><CardContent className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Full Access</h3>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            Free
          </span>
        </div>

        <div className="space-y-2.5 mb-6">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
              {f}
            </div>
          ))}
        </div>

        <div className="text-center py-3 rounded-xl bg-success/10 text-success text-sm font-medium">
          All features included — no payment required
        </div>
      </CardContent></Card>

      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-primary font-medium hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
