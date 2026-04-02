"use client";
import AdminGuard from "@/components/AdminGuard";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Settings, Save, Building2, Phone, MapPin, Package, Clock, ShoppingCart, Bell, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/components/Toast";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative inline-flex items-center shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30"
      style={{
        width: 40,
        height: 24,
        backgroundColor: value ? "var(--primary)" : "var(--border)",
      }}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
        style={{
          width: 18,
          height: 18,
          transform: value ? "translateX(19px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="shrink-0" style={{ color: "var(--muted)" }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>{description}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { orgId, orgData } = useAuth();
  const { toast } = useToast();

  // Organization Info
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Inventory Settings
  const [threshold, setThreshold] = useState(2);
  const [reservationHours, setReservationHours] = useState(24);

  // Order Settings
  const [orderApproval, setOrderApproval] = useState(true);

  // Notifications
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyNewOrders, setNotifyNewOrders] = useState(true);
  const [notifySubmissions, setNotifySubmissions] = useState(true);

  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("organizations").update({
        name,
        address,
        phone,
        low_stock_threshold: threshold,
        reservation_hours: reservationHours,
        order_approval_required: orderApproval,
        notify_low_stock: notifyLowStock,
        notify_new_orders: notifyNewOrders,
        notify_submissions: notifySubmissions,
      }).eq("id", orgId);
      if (error) throw error;
      toast("Settings saved successfully", "success");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";
  const inputStyle = { background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" };

  return (<AdminGuard>
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Manage your organization settings</p>
      </div>

      {/* Section 1: Organization Info */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold">Organization Info</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Organization Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="My Organization"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Business Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="123 Main St, City, State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Business Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Section 2: Inventory Settings */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold">Inventory Settings</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Low Stock Threshold</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            min={0}
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Items at or below this quantity will trigger low stock alerts.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Default Reservation Time</label>
          <select
            value={reservationHours}
            onChange={(e) => setReservationHours(parseInt(e.target.value))}
            className={inputClass}
            style={inputStyle}
          >
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            How long reserved items are held before being released.
          </p>
        </div>
      </div>

      {/* Section 3: Order Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold">Order Settings</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Order Approval Required</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {orderApproval
                ? "Buyer orders require admin approval before processing"
                : "Buyer orders are confirmed instantly"}
            </p>
          </div>
          <Toggle value={orderApproval} onChange={setOrderApproval} />
        </div>
      </div>

      {/* Section 4: Notifications */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>

        <ToggleRow
          icon={AlertTriangle}
          label="Low Stock Alerts"
          description="Get notified when items drop below threshold"
          value={notifyLowStock}
          onChange={setNotifyLowStock}
        />

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        <ToggleRow
          icon={ShoppingCart}
          label="New Order Alerts"
          description="Get notified when buyers place orders"
          value={notifyNewOrders}
          onChange={setNotifyNewOrders}
        />

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        <ToggleRow
          icon={Upload}
          label="Worker Submissions"
          description="Get notified when workers submit items"
          value={notifySubmissions}
          onChange={setNotifySubmissions}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition shadow-lg shadow-primary/25 disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  </AdminGuard>);
}
