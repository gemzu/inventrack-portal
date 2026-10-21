"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Action, Field, Input, Modal, Textarea } from "@/components/console/controls";
import type { BillingCompany, Customer } from "@/lib/sales";

const BLANK_CUSTOMER = { name: "", email: "", contact_name: "", billing_address: "", terms: "Net 30", w9_url: "" };

/* Add a customer without leaving the order. */
export function CustomerModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (c: Customer) => void }) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState(BLANK_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const close = () => { setF(BLANK_CUSTOMER); onClose(); };
  const add = async () => {
    if (!orgId || !f.name.trim()) return;
    if (f.w9_url && !/^https:\/\//.test(f.w9_url.trim())) { toast("The W-9 link must start with https://", "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("customers").insert({
      org_id: orgId, name: f.name.trim(), email: f.email.trim() || null, contact_name: f.contact_name.trim() || null,
      billing_address: f.billing_address.trim() || null, terms: f.terms.trim() || "Net 30", w9_url: f.w9_url.trim() || null,
    }).select().single();
    setSaving(false);
    if (error || !data) { toast(`Customer not added: ${error?.message || "unknown"}`, "error"); return; }
    toast(`${data.name} added`, "success");
    setF(BLANK_CUSTOMER);
    onAdded(data as Customer);
  };
  return (
    <Modal open={open} onClose={close} title="Add a customer" subtitle="Who is being billed">
      <div className="space-y-3">
        <Field label="Company or name"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Billing email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Contact"><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
        </div>
        <Field label="Billing address"><Textarea rows={2} value={f.billing_address} onChange={(e) => setF({ ...f, billing_address: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Terms"><Input value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field>
          <Field label="W-9 link (optional)"><Input value={f.w9_url} onChange={(e) => setF({ ...f, w9_url: e.target.value })} placeholder="https://" /></Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Action onClick={close}>Cancel</Action>
        <Action solid onClick={add} disabled={!f.name.trim() || saving}>Add customer</Action>
      </div>
    </Modal>
  );
}

/* One of the owner's companies that can bill (its name goes on the order and,
   later, the invoice). Logo and payment details are typed by the owner;
   nothing about a bank lives in the code. */
const BLANK_COMPANY = { name: "", email: "", phone: "", address: "", invoice_prefix: "INV", logo_url: "", payment_details: "" };

export function CompanyModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (c: BillingCompany) => void }) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState(BLANK_COMPANY);
  const [saving, setSaving] = useState(false);
  const close = () => { setF(BLANK_COMPANY); onClose(); };
  const prefix = f.invoice_prefix.trim().toUpperCase();
  const add = async () => {
    if (!orgId || !f.name.trim()) return;
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) { toast("Invoice prefix: 1 to 8 letters or numbers", "error"); return; }
    if (f.logo_url && !/^https:\/\//.test(f.logo_url.trim())) { toast("The logo link must start with https://", "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("billing_companies").insert({
      org_id: orgId, name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null,
      address: f.address.trim() || null, invoice_prefix: prefix, logo_url: f.logo_url.trim() || null,
      payment_details: f.payment_details.trim() || null,
    }).select().single();
    setSaving(false);
    if (error || !data) { toast(`Company not added: ${error?.message || "unknown"}`, "error"); return; }
    toast(`${data.name} added`, "success");
    setF(BLANK_COMPANY);
    onAdded(data as BillingCompany);
  };
  return (
    <Modal open={open} onClose={close} title="Add a billing company" subtitle="One of your companies that sends orders and invoices">
      <div className="space-y-3">
        <Field label="Company name"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Invoice prefix" hint="For invoice numbers later, e.g. INV-2026-0001">
            <Input value={f.invoice_prefix} maxLength={8} onChange={(e) => setF({ ...f, invoice_prefix: e.target.value })} />
          </Field>
          <Field label="Logo link (optional)"><Input value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://" /></Field>
        </div>
        <Field label="Payment details (optional)" hint="Printed on invoices. Typed by you and stored only on this company.">
          <Textarea rows={3} value={f.payment_details} onChange={(e) => setF({ ...f, payment_details: e.target.value })} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Action onClick={close}>Cancel</Action>
        <Action solid onClick={add} disabled={!f.name.trim() || saving}>Add company</Action>
      </div>
    </Modal>
  );
}
