"use client";

/**
 * "New order without stock" on the Sales orders page: starts an empty draft for goods that are not in inventory
 * (not entered yet, services, anything typed by hand). Only the billing company and, optionally, the customer are
 * chosen here; the lines are typed on the order itself, with the same quick entry bar as every other order.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Action, Field, Modal, Select } from "@/components/console/controls";
import { CompanyModal, CustomerModal } from "@/components/sales/SalesModals";
import { createBlankSalesOrder, why, type BillingCompany, type Customer } from "@/lib/sales";

export default function BlankSalesOrderButton() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [company, setCompany] = useState("");
  const [customer, setCustomer] = useState("");
  const [adding, setAdding] = useState<"company" | "customer" | null>(null);
  const [busy, setBusy] = useState(false);

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

  const start = async () => {
    if (!company) return;
    setBusy(true);
    try {
      const id = await createBlankSalesOrder(company, customer || null);
      toast("Draft order started. Type the items on it.", "success");
      router.push(`/dashboard/orders/sales/${id}`);
    } catch (e) {
      toast(`Order not started: ${why(e)}`, "error");
      setBusy(false);
    }
  };

  return (
    <>
      <Action onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Order without stock</Action>
      <Modal open={open && !adding} onClose={() => setOpen(false)} title="New order without stock"
        subtitle="For items that are not in inventory. You type the items on the next screen.">
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
          <p className="text-[12px] text-muted-foreground">Starts as a draft with no lines. Nothing in stock is touched.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={() => setOpen(false)}>Cancel</Action>
          <Action solid onClick={start} disabled={!company || busy}>Start draft order</Action>
        </div>
      </Modal>
      <CompanyModal open={adding === "company"} onClose={() => setAdding(null)}
        onAdded={(c) => { setCompanies((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name))); setCompany(c.id); setAdding(null); }} />
      <CustomerModal open={adding === "customer"} onClose={() => setAdding(null)}
        onAdded={(c) => { setCustomers((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name))); setCustomer(c.id); setAdding(null); }} />
    </>
  );
}
