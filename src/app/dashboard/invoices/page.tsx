"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import {
  Plus, X, Download, FileText, Loader2, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/page-shell";

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

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-primary text-primary dark:bg-primary/30 dark:text-primary",
  paid: "bg-success text-success dark:bg-success/30 dark:text-success",
};

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

  return (
    <AdminGuard>
      <PageShell
        title="Invoices"
        subtitle={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            {invoices.length > 0 && (
              <Button variant="outline" onClick={downloadCsv} className="h-10">
                <Download className="w-4 h-4" /> Export
              </Button>
            )}
            <Button variant="brand" onClick={() => setShowModal(true)} className="h-10">
              <Plus className="w-4 h-4" /> Create Invoice
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-20">
            <FileText className="w-12 h-12 mb-3 text-muted-foreground" />
            <p className="font-semibold mb-1">No invoices yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first invoice to get started
            </p>
          </CardContent></Card>
        ) : (
          <Card className="overflow-hidden"><CardContent className="p-0">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{inv.buyer_name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{inv.invoice_number}</div>
                </div>
                <div className="font-semibold tabular-nums shrink-0">${inv.total.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground shrink-0 hidden sm:block whitespace-nowrap">
                  {new Date(inv.created_at).toLocaleDateString()}
                </div>
                <button
                  onClick={() => toggleStatus(inv)}
                  disabled={inv.status === "paid"}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize shrink-0 ${STATUS_STYLES[inv.status]} ${inv.status !== "paid" ? "cursor-pointer hover:opacity-80" : ""}`}
                  title={inv.status !== "paid" ? "Advance status" : "Paid"}
                >
                  {inv.status}
                  {inv.status !== "paid" && <ChevronDown className="w-3 h-3 inline ml-1" />}
                </button>
              </div>
            ))}
      </CardContent></Card>
        )}

        {/* Create Invoice Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
              className="rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-background border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Create Invoice</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order selector */}
              <label className="block text-sm font-medium mb-1.5">
                Link to Order (optional)
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 outline-none bg-muted border border-border text-foreground"
              >
                <option value="">Select an order...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.buyerName || o.buyer_name || o.id} -{" "}
                    {(o.items?.length || 0)} items
                  </option>
                ))}
              </select>

              {/* Buyer name */}
              <label className="block text-sm font-medium mb-1.5">
                Buyer Name
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Enter buyer name"
                className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 outline-none bg-muted border border-border text-foreground"
              />

              {/* Items */}
              <label className="block text-sm font-medium mb-1.5">Items</label>
              {invoiceItems.length === 0 && (
                <p className="text-xs mb-2 text-muted-foreground">
                  Select an order to auto-fill items, or add manually.
                </p>
              )}
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...invoiceItems];
                      updated[idx].name = e.target.value;
                      setInvoiceItems(updated);
                    }}
                    placeholder="Item name"
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none bg-muted border border-border text-foreground"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...invoiceItems];
                      updated[idx].quantity = parseInt(e.target.value) || 0;
                      setInvoiceItems(updated);
                    }}
                    placeholder="Qty"
                    className="w-16 px-3 py-2 rounded-lg text-sm outline-none text-center bg-muted border border-border text-foreground"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => {
                      const updated = [...invoiceItems];
                      updated[idx].price = parseFloat(e.target.value) || 0;
                      setInvoiceItems(updated);
                    }}
                    placeholder="Price"
                    className="w-24 px-3 py-2 rounded-lg text-sm outline-none bg-muted border border-border text-foreground"
                  />
                  <button
                    onClick={() =>
                      setInvoiceItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setInvoiceItems((prev) => [
                    ...prev,
                    { name: "", quantity: 1, price: 0 },
                  ])
                }
                className="text-xs text-primary font-medium mb-4 hover:underline"
              >
                + Add Item
              </button>

              {/* Total */}
              {invoiceItems.length > 0 && (
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">
                    $
                    {invoiceItems
                      .reduce((sum, i) => sum + i.quantity * i.price, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInvoice}
                  disabled={!buyerName.trim() || saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save Invoice"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </AdminGuard>
  );
}
