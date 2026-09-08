"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import { Plus, X, Download, FileText } from "lucide-react";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Modal, Select } from "@/components/console/controls";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  buyer_name: string;
  items: InvoiceItem[];
  total: number;
  status: "draft" | "sent" | "paid";
  created_at: string;
  org_id: string;
  order_id?: string;
}

interface Order {
  id: string;
  buyerName?: string;
  buyer_name?: string;
  items?: { name?: string; quantity?: number; price?: number }[];
  total_qty?: number;
}

const NEXT_STATUS: Record<string, string> = {
  draft: "sent",
  sent: "paid",
};

export default function InvoicesPage() {
  const { orgId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && data) setInvoices(data as unknown as Invoice[]);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const fetchOrders = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data as unknown as Order[]);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  }, [orgId]);

  useEffect(() => {
    fetchInvoices();
    fetchOrders();
  }, [fetchInvoices, fetchOrders]);

  function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setBuyerName(order.buyerName || order.buyer_name || "");
      setInvoiceItems(
        (order.items || []).map((item) => ({
          name: item.name || "Item",
          quantity: item.quantity || 1,
          price: item.price || 0,
        }))
      );
    }
  }

  async function handleSaveInvoice() {
    if (!orgId || !buyerName.trim()) return;
    setSaving(true);
    try {
      const total = invoiceItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        buyer_name: buyerName,
        items: invoiceItems,
        total,
        status: "draft",
        org_id: orgId,
        order_id: selectedOrderId || null,
      });

      if (!error) {
        setShowModal(false);
        setSelectedOrderId("");
        setInvoiceItems([]);
        setBuyerName("");
        await fetchInvoices();
      }
    } catch (err) {
      console.error("Error creating invoice:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(invoice: Invoice) {
    const next = NEXT_STATUS[invoice.status];
    if (!next) return;
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: next })
        .eq("id", invoice.id);

      if (!error) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id ? { ...inv, status: next as Invoice["status"] } : inv
          )
        );
      }
    } catch (err) {
      console.error("Error updating invoice status:", err);
    }
  }

  function downloadCsv() {
    if (invoices.length === 0) return;
    const headers = ["Invoice #", "Buyer", "Total", "Status", "Date"];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.buyer_name,
      inv.total.toFixed(2),
      inv.status,
      new Date(inv.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + (i.total || 0), 0);
  const collected = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (i.total || 0), 0);
  const draftTotal = invoiceItems.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <AdminGuard>
      <PageShell
        title="Invoices"
        eyebrow="Console"
        subtitle="What has been billed, and what is still owed."
        actions={
          <>
            {invoices.length > 0 && (
              <Action onClick={downloadCsv}>
                <Download className="h-3.5 w-3.5" /> Export
              </Action>
            )}
            <Action solid onClick={() => setShowModal(true)}>
              <Plus className="h-3.5 w-3.5" /> New invoice
            </Action>
          </>
        }
      >
        {loading ? (
          <ListSkeleton rows={6} />
        ) : (
          <div className="space-y-8">
            {/* Money is the content of this screen, so money is what is set
                large. Outstanding leads, because it is the one that needs
                doing something about. */}
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure
                label="Outstanding"
                value={`$${outstanding.toFixed(2)}`}
                tone={outstanding > 0 ? "warning" : undefined}
              />
              <Figure label="Collected" value={`$${collected.toFixed(2)}`} />
              <Figure label="Invoices" value={invoices.length} />
            </div>

            {invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nothing billed yet"
                description="Create an invoice from an order, or write one by hand."
              />
            ) : (
              <Panel className="reveal">
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                  <ColHead className="min-w-0 flex-1">Buyer</ColHead>
                  <ColHead className="w-28 shrink-0 text-right">Total</ColHead>
                  <ColHead className="w-32 shrink-0">Raised</ColHead>
                  <ColHead className="w-32 shrink-0">State</ColHead>
                </div>

                {invoices.map((inv) => (
                  <div key={inv.id} className="row-line flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.buyer_name}</p>
                      <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {inv.invoice_number}
                      </p>
                    </div>

                    <span className="mono w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                      ${inv.total.toFixed(2)}
                    </span>
                    <span className="mono hidden w-32 shrink-0 text-[11px] text-muted-foreground lg:block">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </span>

                    {/* The state is also the control: clicking advances it.
                        Kept as the shared marker so it reads the same as
                        every other state in the console. */}
                    <div className="w-32 shrink-0">
                      {inv.status === "paid" ? (
                        <Status status="paid" />
                      ) : (
                        <button
                          onClick={() => toggleStatus(inv)}
                          title="Advance this invoice"
                          className="text-left transition-opacity duration-300 hover:opacity-70"
                        >
                          <Status status={inv.status} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="New invoice"
          subtitle={draftTotal > 0 ? `$${draftTotal.toFixed(2)} so far` : "From an order, or by hand"}
        >
          <div className="space-y-5">
            <Field label="Link to an order" hint="Fills the lines in for you.">
              <Select
                value={selectedOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
              >
                <option value="">Not linked</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {String(o.buyerName || o.buyer_name || o.id)} — {o.items?.length || 0} items
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Buyer">
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Who is being billed"
              />
            </Field>

            <Field label="Lines">
              {invoiceItems.length === 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Pick an order above, or add lines by hand.
                </p>
              )}
              <div className="space-y-2">
                {invoiceItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].name = e.target.value;
                        setInvoiceItems(updated);
                      }}
                      placeholder="Item"
                      aria-label="Item name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].quantity = parseInt(e.target.value) || 0;
                        setInvoiceItems(updated);
                      }}
                      placeholder="Qty"
                      aria-label="Quantity"
                      className="w-20 text-center"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].price = parseFloat(e.target.value) || 0;
                        setInvoiceItems(updated);
                      }}
                      placeholder="Price"
                      aria-label="Unit price"
                      className="w-24 text-center"
                    />
                    <button
                      onClick={() => setInvoiceItems((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove line"
                      className="shrink-0 px-1 text-muted-foreground transition-colors duration-300 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setInvoiceItems((prev) => [...prev, { name: "", quantity: 1, price: 0 }])
                }
                className="mono mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-2)] transition-colors duration-300 hover:text-foreground"
              >
                Add a line
              </button>
            </Field>

            {invoiceItems.length > 0 && (
              <div className="flex items-baseline justify-between border-t border-border pt-5">
                <ColHead>Total</ColHead>
                <span className="font-display text-2xl font-bold tabular-nums tracking-[-0.03em]">
                  ${draftTotal.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Action onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Action>
              <Action
                solid
                onClick={handleSaveInvoice}
                disabled={!buyerName.trim() || saving}
                className="flex-1"
              >
                {saving ? "Saving" : "Save invoice"}
              </Action>
            </div>
          </div>
        </Modal>
      </PageShell>
    </AdminGuard>
  );
}
