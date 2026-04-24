"use client";
import AdminGuard from "@/components/AdminGuard";

import { useState, useEffect, useCallback, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Check, Loader2 } from "lucide-react";
import PageShell from "@/components/page-shell";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="card-luxury p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingRow({ 
  label, 
  description, 
  children 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AutoSaveInput({ 
  value, 
  onChange, 
  label, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = async () => {
    if (localValue === value) return;
    setIsSaving(true);
    onChange(localValue);
    await new Promise(r => setTimeout(r, 500));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm transition-all focus:border-foreground focus:ring-0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : saved ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : null}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        value ? "bg-foreground" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { orgId, orgData } = useAuth();
  const { theme, toggleTheme, accent, setAccent } = useTheme();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [reservationHours, setReservationHours] = useState(24);
  const [orderApproval, setOrderApproval] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyNewOrders, setNotifyNewOrders] = useState(true);
  const [notifySubmissions, setNotifySubmissions] = useState(true);

  useEffect(() => {
    if (orgData) {
      setName(orgData.name || "");
      setAddress(orgData.address || "");
      setPhone(orgData.phone || "");
      setThreshold(orgData.lowStockThreshold || 2);
      setReservationHours(orgData.reservationHours || 24);
      setOrderApproval(orgData.orderApprovalRequired ?? true);
      setNotifyLowStock(orgData.notifyLowStock ?? true);
      setNotifyNewOrders(orgData.notifyNewOrders ?? true);
      setNotifySubmissions(orgData.notifySubmissions ?? true);
    }
  }, [orgData]);

  const saveSettings = useCallback(async (updates: Record<string, unknown>) => {
    if (!orgId) return;
    await supabase.from("organizations").update(updates).eq("id", orgId);
  }, [orgId]);

  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (key: string, value: unknown) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          startTransition(() => saveSettings({ [key]: value }));
        }, 800);
      };
    })(),
    [saveSettings]
  );

  return (
    <AdminGuard>
      <PageShell title="Settings" subtitle="Manage your preferences">
        <div className="max-w-2xl mx-auto space-y-6 stagger-children">
          <SettingsSection 
            title="Organization" 
            description="Basic information about your business"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <AutoSaveInput
                  value={name}
                  onChange={(v) => { setName(v); debouncedSave("name", v); }}
                  label="Organization Name"
                  placeholder="Your Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <AutoSaveInput
                  value={address}
                  onChange={(v) => { setAddress(v); debouncedSave("address", v); }}
                  label="Business Address"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <AutoSaveInput
                  value={phone}
                  onChange={(v) => { setPhone(v); debouncedSave("phone", v); }}
                  label="Phone Number"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection 
            title="Inventory" 
            description="Manage inventory behavior"
          >
            <SettingRow label="Low Stock Threshold" description="Alert when items reach this quantity">
              <input
                type="number"
                value={threshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setThreshold(val);
                  debouncedSave("low_stock_threshold", val);
                }}
                min={0}
                className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-center"
              />
            </SettingRow>
            <SettingRow label="Reservation Time" description="How long items are held for buyers">
              <select
                value={reservationHours}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setReservationHours(val);
                  debouncedSave("reservation_hours", val);
                }}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </SettingRow>
          </SettingsSection>

          <SettingsSection 
            title="Orders" 
            description="Configure order processing"
          >
            <SettingRow 
              label="Require Approval" 
              description={orderApproval ? "Orders need admin approval" : "Orders auto-confirm"}
            >
              <Toggle 
                value={orderApproval} 
                onChange={(v) => { setOrderApproval(v); debouncedSave("order_approval_required", v); }} 
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection 
            title="Notifications" 
            description="Choose what alerts you receive"
          >
            <SettingRow label="Low Stock Alerts">
              <Toggle 
                value={notifyLowStock} 
                onChange={(v) => { setNotifyLowStock(v); debouncedSave("notify_low_stock", v); }} 
              />
            </SettingRow>
            <SettingRow label="New Order Alerts">
              <Toggle 
                value={notifyNewOrders} 
                onChange={(v) => { setNotifyNewOrders(v); debouncedSave("notify_new_orders", v); }} 
              />
            </SettingRow>
            <SettingRow label="Worker Submissions">
              <Toggle 
                value={notifySubmissions} 
                onChange={(v) => { setNotifySubmissions(v); debouncedSave("notify_submissions", v); }} 
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection 
            title="Appearance" 
            description="Customize the interface"
          >
            <SettingRow label="Dark Mode" description="Switch between light and dark themes">
              <button
                onClick={toggleTheme}
                className="px-5 py-2.5 rounded-xl border border-border bg-secondary text-sm font-medium hover:bg-muted transition-all min-w-[80px]"
              >
                {theme === "dark" ? "🌙 On" : "☀️ Off"}
              </button>
            </SettingRow>
            <SettingRow label="Pink Theme (#E398CA)" description="Use soft pink accent color">
              <button
                onClick={() => setAccent(accent === "pink" ? "neutral" : "pink")}
                className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all min-w-[80px] ${
                  accent === "pink" 
                    ? "bg-[#E398CA] border-[#E398CA] text-[#3d2a35]" 
                    : "border-border bg-secondary hover:bg-muted"
                }`}
              >
                {accent === "pink" ? "✨ On" : "Off"}
              </button>
            </SettingRow>
          </SettingsSection>
        </div>
      </PageShell>
    </AdminGuard>
  );
}