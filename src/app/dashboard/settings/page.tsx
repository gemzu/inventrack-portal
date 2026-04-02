"use client";
import AdminGuard from "@/components/AdminGuard";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { orgId, orgData } = useAuth();
  const [name, setName] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (orgData) {
      setName(orgData.name || "");
      setSheetId(orgData.sheetId || "");
      setThreshold(orgData.lowStockThreshold || 2);
    }
  }, [orgData]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("organizations").update({
        name, sheet_id: sheetId, low_stock_threshold: threshold,
      }).eq("id", orgId);
      if (error) throw error;
      toast("Settings saved successfully", "success");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (<AdminGuard>
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Manage your organization settings</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Organization Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="My Organization"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Google Sheet ID</label>
          <input
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Used for inventory sync. Find this in your Google Sheet URL.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Low Stock Threshold</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Items at or below this quantity will trigger low stock alerts.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  </AdminGuard>);
}
