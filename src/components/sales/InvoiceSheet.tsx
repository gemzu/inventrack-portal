"use client";

/**
 * The invoice as the customer sees it, on screen. Mirrors the PDF
 * (InvoicePdf.tsx) so what you check here is what they get: key fields
 * highlighted in pale yellow with bold values, Bill To and Ship To, the ship
 * date / tracking / PO / SO / job strip, lines, totals, and "Scan to pay" when
 * the company has a pay link. It stays white in the dark theme on purpose: it
 * is a piece of paper, not part of the app.
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { daysBetween, fmtDate, fmtMoney, PAY_METHOD_LABEL, taxLine, type SalesInvoice, type SalesInvoiceLine } from "@/lib/sales";

const label = "mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#14121f]";
const hl = "inline-block bg-[#fff3b0] px-1.5 py-px text-[14px] font-bold text-[#14121f]";

function Strip({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0 border-t-[1.5px] border-[#14121f] pt-1.5">
      <p className={label}>{title}</p>
      {value ? <span className={`${hl} break-words`}>{value}</span> : <div className="h-4 border-b border-[#c9c6d6]" />}
    </div>
  );
}

export default function InvoiceSheet({ inv, lines, orderNumber }: { inv: SalesInvoice; lines: SalesInvoiceLine[]; orderNumber: string | null }) {
  const paid = inv.status === "paid";
  const isVoid = inv.status === "void";
  const onReceipt = daysBetween(inv.issued_on, inv.due_on) === 0;
  const contact = [inv.from_email, inv.from_phone].filter(Boolean).join(" · ");
  const sameShip = !inv.ship_to_name && !inv.ship_to_address;
  const link = inv.pay_link && /^https:\/\//i.test(inv.pay_link) && !paid && !isVoid ? inv.pay_link : null;
  const [made, setMade] = useState<{ link: string; url: string } | null>(null);
  useEffect(() => {
    if (!link) return undefined;
    let live = true;
    QRCode.toDataURL(link, { margin: 1, width: 240, errorCorrectionLevel: "M" }).then((url) => { if (live) setMade({ link, url }); }).catch(() => {});
    return () => { live = false; };
  }, [link]);
  const qr = link && made?.link === link ? made.url : null;

  return (
    <article
      aria-label={`Invoice ${inv.number}`}
      className="relative min-w-0 overflow-hidden rounded-md bg-white px-6 py-8 text-[14px] leading-relaxed text-[#14121f] shadow-[0_24px_60px_-28px_rgba(18,16,34,.45)] ring-1 ring-black/5 sm:px-10 sm:py-10"
    >
      <header className="flex flex-col gap-6 border-b-[3px] border-[#14121f] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-sm">
          {inv.from_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the owner's own link, any host
            <img src={inv.from_logo_url} alt={`${inv.from_name} logo`} className="mb-3 max-h-12 max-w-[10rem] object-contain" />
          ) : null}
          <p className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{inv.from_name}</p>
          {inv.from_address ? <p className="whitespace-pre-line text-[12.5px] text-[#4b4760]">{inv.from_address}</p> : null}
          {contact ? <p className="break-words text-[12.5px] text-[#4b4760]">{contact}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="font-display text-4xl font-extrabold leading-none tracking-[-0.05em] sm:text-5xl">INVOICE</p>
          <dl className="mt-3 space-y-1">
            {([["Invoice #", inv.number], ["Date", fmtDate(inv.issued_on)], ["Due date", fmtDate(inv.due_on)], ["Terms", onReceipt ? "Due on receipt" : inv.terms]] as const).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 sm:justify-end">
                <dt className="text-[11px] font-bold uppercase tracking-[0.08em]">{k}</dt>
                <dd className={hl}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="grid gap-6 pt-5 sm:grid-cols-2">
        <div className="min-w-0">
          <p className={label}>Bill to</p>
          <p className="text-[15px] font-bold">{inv.bill_to_name}</p>
          {inv.bill_to_contact ? <p>Attn: {inv.bill_to_contact}</p> : null}
          {inv.bill_to_address ? <p className="whitespace-pre-line">{inv.bill_to_address}</p> : null}
          {inv.bill_to_email ? <p className="break-words">{inv.bill_to_email}</p> : null}
        </div>
        <div className="min-w-0">
          <p className={label}>Ship to</p>
          <p className="text-[15px] font-bold">{sameShip ? inv.bill_to_name : inv.ship_to_name || inv.bill_to_name}</p>
          {sameShip
            ? (inv.bill_to_address ? <p className="whitespace-pre-line">{inv.bill_to_address}</p> : null)
            : (inv.ship_to_address ? <p className="whitespace-pre-line">{inv.ship_to_address}</p> : null)}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        <Strip title="Ship date" value={inv.ship_date ? fmtDate(inv.ship_date) : null} />
        <Strip title="Tracking no." value={inv.tracking_no} />
        <Strip title="PO number" value={inv.customer_po} />
        <Strip title="SO #" value={orderNumber} />
        <Strip title="Job number" value={inv.job_number} />
      </section>

      <table className="mt-5 w-full border-collapse">
        <thead className="hidden sm:table-header-group">
          <tr className="bg-[#d9d9d9] text-left">
            {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
              <th key={h} scope="col" className={`px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${i >= 1 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="flex flex-wrap border-b border-[#c9c6d6] py-3 sm:table-row sm:py-0">
              <td className="w-full px-2 sm:w-auto sm:py-3">
                <p className="text-[15px] font-bold">{l.description}</p>
                {l.part_number ? <p className="mono text-[12px] text-[#4b4760]">{l.part_number}</p> : null}
                {l.brand ? <p className="text-[12px] text-[#4b4760]">{l.brand}</p> : null}
              </td>
              <td className="mono ml-auto px-2 text-right tabular-nums sm:ml-0 sm:py-3">
                <span className="sm:hidden">{l.quantity.toLocaleString("en-US")} × {fmtMoney(l.unit_price_cents)} = </span>
                <span className="hidden sm:inline">{l.quantity.toLocaleString("en-US")}</span>
              </td>
              <td className="mono hidden px-2 text-right tabular-nums sm:table-cell sm:py-3">{fmtMoney(l.unit_price_cents)}</td>
              <td className="mono px-2 text-right font-medium tabular-nums sm:py-3">{fmtMoney(l.line_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-6 flex flex-col-reverse items-stretch gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-1 items-center justify-start gap-4">
          {qr ? (
            <div>
              <p className="mb-1 text-[14px] font-bold">Scan to pay</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
              <img src={qr} alt="QR code that opens the payment link" className="h-24 w-24" />
            </div>
          ) : null}
          {paid || isVoid ? (
            <span className={`font-display -rotate-[8deg] rounded-lg border-[3px] px-4 py-1 text-2xl font-extrabold tracking-[0.04em] ${paid ? "border-[#0f7a55] text-[#0f7a55]" : "border-[#b42318] text-[#b42318]"}`}>
              {paid ? "PAID" : "VOID"}
            </span>
          ) : null}
        </div>
        <dl className="w-full sm:w-72">
          <div className="flex justify-between py-1.5"><dt>Subtotal</dt><dd className="mono tabular-nums">{fmtMoney(inv.subtotal_cents)}</dd></div>
          {Number(inv.freight_cents) > 0 ? (
            <div className="flex justify-between py-1.5"><dt>Freight</dt><dd className="mono tabular-nums">{fmtMoney(inv.freight_cents)}</dd></div>
          ) : null}
          {Number(inv.tax_cents) > 0 ? (
            <div className="flex justify-between py-1.5"><dt>{taxLine(inv.tax_label, inv.tax_rate)}</dt><dd className="mono tabular-nums">{fmtMoney(inv.tax_cents)}</dd></div>
          ) : null}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t-[3px] border-[#14121f] pt-3">
            <dt className="text-[13px] font-bold uppercase tracking-[0.08em]">{paid ? "Total paid" : isVoid ? "Total" : "Balance due"}</dt>
            <dd className="font-display text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{fmtMoney(inv.total_cents)}</dd>
          </div>
        </dl>
      </section>

      {paid ? (
        <Block title="Payment">
          {fmtDate(inv.paid_on)}{inv.paid_method ? ` · ${PAY_METHOD_LABEL[inv.paid_method]}` : ""}{inv.paid_reference ? ` · Ref ${inv.paid_reference}` : ""}
        </Block>
      ) : null}
      {isVoid && inv.void_reason ? <Block title="Voided">{inv.void_reason}</Block> : null}
      {inv.notes || (inv.payment_details && !paid && !isVoid) ? (
        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          {inv.notes ? <div><p className={label}>Notes</p><p className="whitespace-pre-line">{inv.notes}</p></div> : null}
          {inv.payment_details && !paid && !isVoid ? <div><p className={label}>How to pay</p><p className="whitespace-pre-line">{inv.payment_details}</p></div> : null}
        </div>
      ) : null}

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-[#c9c6d6] pt-3.5 text-[12px] text-[#4b4760]">
        <span>{inv.from_name}{inv.from_email ? ` · ${inv.from_email}` : ""}</span>
        <span className="mono">{inv.number}</span>
      </footer>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <p className={label}>{title}</p>
      <p className="whitespace-pre-line">{children}</p>
    </section>
  );
}
