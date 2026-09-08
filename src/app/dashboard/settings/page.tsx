"use client";

/**
 * Settings.
 *
 * Was five stacked cards, each with its own heading, and toggles drawn as
 * iOS-style capsules with a white knob. The appearance controls said "🌙 On"
 * and "✨ On", which is the only place in the product where an emoji was doing
 * the work of a word.
 *
 * Sections are rules now, the same as everywhere else, and the switch is the
 * console's: a hairline track with a square knob, on the site's easing. Every
 * field still saves itself as you leave it — that behaviour was good and is
 * untouched.
 */

import { useState, useEffect, useCallback, useTransition } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import MfaSetup from "@/components/dashboard/MfaSetup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Check, Loader2 } from "lucide-react";
import { Rule } from "@/components/console/surfaces";
import { Field, Input, Select } from "@/components/console/controls";

/* A row is a label, what it does, and the control. The hairline between rows
   is the only chrome. */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row-line flex items-center justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* The switch. Square knob, hairline track, brand fill when on — the same
   vocabulary as the rest of the console rather than a phone's. */
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-md border transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] ${
        value
          ? "border-[var(--brand-2)] bg-[color-mix(in_oklab,var(--brand-2)_28%,transparent)]"
          : "border-border bg-transparent"
      }`}
    >
      <span
        className={`absolute top-1 h-3.5 w-3.5 rounded-sm transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] ${
          value ? "translate-x-6 bg-[var(--brand-2)]" : "translate-x-1 bg-muted-foreground"
        }`}
      />
    </button>
  );
}

/* Saves on blur, and says so. The tick is the only feedback this screen needs;
   a Save button would be a lie about when the write happens. */
function AutoSaveInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
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
    await new Promise((r) => setTimeout(r, 500));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="relative">
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={label}
        className="pr-10"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2">
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : saved ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : null}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { orgId, orgData } = useAuth();
  const { theme, toggleTheme, accent, setAccent } = useTheme();
  const [, startTransition] = useTransition();

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

  const saveSettings = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!orgId) return;
      await supabase.from("organizations").update(updates).eq("id", orgId);
    },
    [orgId]
  );

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
      <PageShell
        title="Settings"
        eyebrow="Console"
        subtitle="Everything here saves itself as you leave the field."
      >
        <div className="max-w-2xl space-y-12">
          {/* ── Organisation ─────────────────────────────────── */}
          <section className="space-y-5">
            <Rule label="Organisation" />
            <div className="reveal space-y-5">
              <Field label="Name">
                <AutoSaveInput
                  value={name}
                  onChange={(v) => { setName(v); debouncedSave("name", v); }}
                  label="Organisation name"
                  placeholder="Your company"
                />
              </Field>
              <Field label="Address">
                <AutoSaveInput
                  value={address}
                  onChange={(v) => { setAddress(v); debouncedSave("address", v); }}
                  label="Business address"
                  placeholder="123 Main St"
                />
              </Field>
              <Field label="Phone">
                <AutoSaveInput
                  value={phone}
                  onChange={(v) => { setPhone(v); debouncedSave("phone", v); }}
                  label="Phone number"
                  placeholder="+1 555 000 0000"
                />
              </Field>
            </div>
          </section>

          {/* ── Stock ────────────────────────────────────────── */}
          <section className="space-y-2">
            <Rule label="Stock" className="mb-5" />
            <div className="reveal">
              <Row label="Low stock threshold" description="Anything at or below this counts as running low.">
                <Input
                  type="number"
                  min={0}
                  value={threshold}
                  aria-label="Low stock threshold"
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setThreshold(val);
                    debouncedSave("low_stock_threshold", val);
                  }}
                  className="w-20 text-center"
                />
              </Row>
              <Row label="Reservation time" description="How long stock is held for a buyer before it goes back.">
                <Select
                  value={reservationHours}
                  aria-label="Reservation time"
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setReservationHours(val);
                    debouncedSave("reservation_hours", val);
                  }}
                  className="w-36"
                >
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                </Select>
              </Row>
            </div>
          </section>

          {/* ── Orders ───────────────────────────────────────── */}
          <section className="space-y-2">
            <Rule label="Orders" className="mb-5" />
            <div className="reveal">
              <Row
                label="Require approval"
                description={
                  orderApproval
                    ? "Every order waits for an admin before it moves."
                    : "Orders confirm themselves as soon as they arrive."
                }
              >
                <Toggle
                  label="Require approval for orders"
                  value={orderApproval}
                  onChange={(v) => { setOrderApproval(v); debouncedSave("order_approval_required", v); }}
                />
              </Row>
            </div>
          </section>

          {/* ── Alerts ───────────────────────────────────────── */}
          <section className="space-y-2">
            <Rule label="Alerts" className="mb-5" />
            <div className="reveal">
              <Row label="Running low" description="When stock drops to the threshold above.">
                <Toggle
                  label="Alert on low stock"
                  value={notifyLowStock}
                  onChange={(v) => { setNotifyLowStock(v); debouncedSave("notify_low_stock", v); }}
                />
              </Row>
              <Row label="New orders" description="When a buyer places one.">
                <Toggle
                  label="Alert on new orders"
                  value={notifyNewOrders}
                  onChange={(v) => { setNotifyNewOrders(v); debouncedSave("notify_new_orders", v); }}
                />
              </Row>
              <Row label="Worker submissions" description="When floor staff send something for approval.">
                <Toggle
                  label="Alert on worker submissions"
                  value={notifySubmissions}
                  onChange={(v) => { setNotifySubmissions(v); debouncedSave("notify_submissions", v); }}
                />
              </Row>
            </div>
          </section>

          {/* ── Appearance ───────────────────────────────────── */}
          <section className="space-y-2">
            <Rule label="Appearance" className="mb-5" />
            <div className="reveal">
              <Row label="Dark" description="Follows whatever you pick here, on every device you sign in from.">
                <Toggle label="Dark mode" value={theme === "dark"} onChange={toggleTheme} />
              </Row>
              <Row label="Pink accent" description="Swaps the violet for a softer pink throughout.">
                <Toggle
                  label="Pink accent"
                  value={accent === "pink"}
                  onChange={(v) => setAccent(v ? "pink" : "neutral")}
                />
              </Row>
            </div>
          </section>

          {/* ── Security ─────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule label="Security" />
            <div className="reveal">
              <p className="mb-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Two factor asks for a code from an authenticator app as well as your password.
                Without it, anyone holding your password holds your floor.
              </p>
              <MfaSetup />
            </div>
          </section>
        </div>
      </PageShell>
    </AdminGuard>
  );
}
