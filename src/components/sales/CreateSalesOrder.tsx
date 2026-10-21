"use client";

/**
 * "Create sales order" on the Inventory bulk bar, for people with Sales and
 * invoices ticked. Sums the selection at the sale price (never cost), says
 * which lines have no price yet, and starts a draft order from it. Reserved
 * and sold lines are left out: they are already spoken for.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Action, Field, Modal, Select } from "@/components/console/controls";
import { CompanyModal, CustomerModal } from "@/components/sales/SalesModals";
import { createSalesOrder, fmtMoney, why, type BillingCompany, type Customer } from "@/lib/sales";

export interface PickedItem { id: string; quantity: number; status: string; sellingPrice?: number }

export function sellable(items: PickedItem[]) {
  const lines = items.filter((i) => (i.status || "available") === "available" && (i.quantity || 0) > 0);
  return {
    lines,
    skipped: items.length - lines.length,
    units: lines.reduce((n, i) => n + i.quantity, 0),
    cents: lines.reduce((n, i) => n + i.quantity * Math.round((Number(i.sellingPrice) || 0) * 100), 0),
    unpriced: lines.filter((i) => !(Number(i.sellingPrice) > 0)).length,
  };
}

/* The summary line and button that sit in the bulk bar. */
export function SalesOrderButton({ items }: { items: PickedItem[] }) {
  const [open, setOpen] = useState(false);
  const s = sellable(items);
  return (
    <>
      <span className="text-[12px] text-muted-foreground">
        <span className="mono font-semibold text-foreground">{fmtMoney(s.cents)}</span> at sale price
        {s.unpriced ? <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">{s.unpriced} without a price</span> : null}
        {s.skipped ? <span className="ml-2">{s.skipped} reserved or sold, left out</span> : null}
      </span>
      <Action solid onClick={() => setOpen(true)} disabled={s.lines.length === 0}
        title={s.lines.length ? "Start a draft order from these lines" : "Nothing selected is available to sell"}>
        <FileText className="h-3.5 w-3.5" /> Create sales order
      </Action>
      <CreateSalesOrderModal open={open} onClose={() => setOpen(false)} items={items} />
    </>
  );
}

function CreateSalesOrderModal({ open, onClose, items }: { open: boolean; onClose: () => void; items: PickedItem[] }) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [company, setCompany] = useState("");
  const [customer, setCustomer] = useState("");
  const [adding, setAdding] = useState<"company" | "customer" | null>(null);
  const [busy, setBusy] = useState(false);
  const s = sellable(items);

  useEffect(() => {
    if (!open || !orgId) return;
    (async () => {
      const [b, c] = await Promise.all([
        supabase.from("billing_companies").select("*").eq("org_id", orgId).eq("archived", false).order("name"),
        supabase.from("customers").select("*").eq("org_id", orgId).eq("archived", false).order("name"),
      ]);
      const bs = (b.data || []) as BillingCompany[];
      setCompanies(bs);
      setCustomers((c.data || []) as Customer[]);
      setCompany((prev) => prev || bs[0]?.id || "");
    })();
  }, [open, orgId]);

  const create = async () => {
    if (!company || s.lines.length === 0) return;
    setBusy(true);
    try {
      const id = await createSalesOrder(company, customer || null, s.lines.map((i) => ({ id: i.id })));
      toast("Draft order started", "success");
      router.push(`/dashboard/orders/sales/${id}`);
    } catch (e) {
      toast(`Order not started: ${why(e)}`, "error");
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open && !adding} onClose={onClose} title="Create sales order"
        subtitle={`${s.lines.length} line${s.lines.length === 1 ? "" : "s"} · ${s.units} units · ${fmtMoney(s.cents)} at sale price`}>
        <div className="space-y-4">
          <Field label="Billed by (our company)">
            <div className="flex gap-2">
              <Select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Our company">
                {companies.length === 0 ? <option value="">Add your first company</option> : null}
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Action onClick={() => setAdding("company")} aria-label="Add a billing company" className="px-3"><Plus className="h-4 w-4" /></Action>
            </div>
          </Field>
          <Field label="Bill to (customer)" hint="You can choose this later on the order.">
            <div className="flex gap-2">
              <Select value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Customer">
                <option value="">Choose later</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Action onClick={() => setAdding("customer")} aria-label="Add a customer" className="px-3"><Plus className="h-4 w-4" /></Action>
            </div>
          </Field>
          {s.unpriced ? (
            <div className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{s.unpriced} line{s.unpriced === 1 ? " has" : "s have"} no sale price. Type the price on the order before sending it.</span>
            </div>
          ) : null}
          <p className="text-[12px] text-muted-foreground">
            Starts as a draft with every unit of each line; change quantities on the order. Nothing is reserved until you mark it sent.
            {s.skipped ? ` ${s.skipped} reserved or sold line${s.skipped === 1 ? " is" : "s are"} left out.` : ""}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={onClose}>Cancel</Action>
          <Action solid onClick={create} disabled={!company || busy || s.lines.length === 0}>Start draft order</Action>
        </div>
      </Modal>
      <CompanyModal open={adding === "company"} onClose={() => setAdding(null)}
        onAdded={(c) => { setCompanies((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name))); setCompany(c.id); setAdding(null); }} />
      <CustomerModal open={adding === "customer"} onClose={() => setAdding(null)}
        onAdded={(c) => { setCustomers((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name))); setCustomer(c.id); setAdding(null); }} />
    </>
  );
}
