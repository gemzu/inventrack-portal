/**
 * The invoice as the customer sees it, on screen. Mirrors the PDF
 * (InvoicePdf.tsx) so what you check here is what they get. It stays white
 * in the dark theme on purpose: it is a piece of paper, not part of the app.
 */

import { daysBetween, fmtDate, fmtMoney, PAY_METHOD_LABEL, taxLine, type SalesInvoice, type SalesInvoiceLine } from "@/lib/sales";

const label = "mono mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[#5b5770]";

export default function InvoiceSheet({ inv, lines, orderNumber }: { inv: SalesInvoice; lines: SalesInvoiceLine[]; orderNumber: string | null }) {
  const paid = inv.status === "paid";
  const isVoid = inv.status === "void";
  const onReceipt = daysBetween(inv.issued_on, inv.due_on) === 0;
  const contact = [inv.from_email, inv.from_phone].filter(Boolean).join(" · ");

  return (
    <article
      aria-label={`Invoice ${inv.number}`}
      className="relative min-w-0 overflow-hidden rounded-md bg-white px-6 py-8 text-[13px] leading-relaxed text-[#14121f] shadow-[0_24px_60px_-28px_rgba(18,16,34,.45)] ring-1 ring-black/5 sm:px-12 sm:py-12"
    >
      {/* Letterhead */}
      <header className="flex flex-col-reverse gap-6 border-b-[3px] border-[#14121f] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-sm">
          {inv.from_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the owner's own link, any host
            <img src={inv.from_logo_url} alt={`${inv.from_name} logo`} className="mb-3 max-h-12 max-w-[10rem] object-contain" />
          ) : null}
          <p className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{inv.from_name}</p>
          {inv.from_address ? <p className="whitespace-pre-line text-[12px] text-[#5b5770]">{inv.from_address}</p> : null}
          {contact ? <p className="break-words text-[12px] text-[#5b5770]">{contact}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="font-display text-4xl font-extrabold leading-none tracking-[-0.05em] sm:text-5xl">INVOICE</p>
          <p className="mono mt-2.5 text-[14px]">{inv.number}</p>
        </div>
      </header>

      {/* Who, when, which */}
      <section className="grid gap-6 py-7 sm:grid-cols-3">
        <div className="min-w-0">
          <p className={label}>Bill to</p>
          <p className="font-semibold">{inv.bill_to_name}</p>
          {inv.bill_to_contact ? <p>Attn: {inv.bill_to_contact}</p> : null}
          {inv.bill_to_address ? <p className="whitespace-pre-line">{inv.bill_to_address}</p> : null}
          {inv.bill_to_email ? <p className="break-words">{inv.bill_to_email}</p> : null}
        </div>
        <div>
          <p className={label}>Dates</p>
          <p>Issued {fmtDate(inv.issued_on)}</p>
          <p>Due {fmtDate(inv.due_on)} ({onReceipt ? "on receipt" : inv.terms})</p>
          {paid ? <p>Paid {fmtDate(inv.paid_on)}{inv.paid_method ? ` · ${PAY_METHOD_LABEL[inv.paid_method]}` : ""}</p> : null}
        </div>
        <div>
          <p className={label}>Reference</p>
          {orderNumber ? <p>Sales order {orderNumber}</p> : null}
          {inv.customer_po ? <p>PO {inv.customer_po} (customer)</p> : null}
          {paid && inv.paid_reference ? <p>Payment ref {inv.paid_reference}</p> : null}
        </div>
      </section>

      {/* Lines: a table from small tablets up, stacked rows on a phone */}
      <table className="w-full border-collapse">
        <thead className="hidden sm:table-header-group">
          <tr className="border-b-2 border-[#14121f] text-left">
            {["Description", "Part no.", "Qty", "Unit price", "Amount"].map((h, i) => (
              <th key={h} scope="col" className={`mono px-2 pb-2.5 text-[10px] font-medium uppercase tracking-[0.14em] ${i >= 2 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="flex flex-wrap border-b border-[#e4e1ec] py-3 sm:table-row sm:py-0">
              <td className="w-full px-2 sm:w-auto sm:py-3.5">
                <p className="font-semibold">{l.description}</p>
                {l.brand ? <p className="text-[12px] text-[#5b5770]">{l.brand}</p> : null}
              </td>
              <td className="mono px-2 text-[12px] text-[#5b5770] sm:py-3.5 sm:text-[13px] sm:text-[#14121f]">{l.part_number || "—"}</td>
              <td className="mono ml-auto px-2 text-right tabular-nums sm:ml-0 sm:py-3.5">
                <span className="sm:hidden">{l.quantity.toLocaleString("en-US")} × {fmtMoney(l.unit_price_cents)} = </span>
                <span className="hidden sm:inline">{l.quantity.toLocaleString("en-US")}</span>
              </td>
              <td className="mono hidden px-2 text-right tabular-nums sm:table-cell sm:py-3.5">{fmtMoney(l.unit_price_cents)}</td>
              <td className="mono px-2 text-right tabular-nums sm:py-3.5">{fmtMoney(l.line_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals, with the stamp beside them */}
      <section className="mt-6 flex flex-col-reverse items-stretch gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-1 justify-center">
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
          <div className="mt-2 flex items-baseline justify-between border-t-[3px] border-[#14121f] pt-3">
            <dt className="font-display text-xl font-extrabold tracking-[-0.03em]">{paid || isVoid ? "Total" : "Amount due"}</dt>
            <dd className="font-display text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{fmtMoney(inv.total_cents)}</dd>
          </div>
        </dl>
      </section>

      {isVoid && inv.void_reason ? <Block title="Voided">{inv.void_reason}</Block> : null}
      {inv.notes ? <Block title="Notes">{inv.notes}</Block> : null}
      {inv.payment_details && !paid && !isVoid ? <Block title="How to pay">{inv.payment_details}</Block> : null}

      <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-[#e4e1ec] pt-3.5 text-[11.5px] text-[#5b5770]">
        <span>{inv.from_name}{inv.from_email ? ` · ${inv.from_email}` : ""}</span>
        <span className="mono">{inv.number}</span>
      </footer>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <p className={label}>{title}</p>
      <p className="whitespace-pre-line">{children}</p>
    </section>
  );
}
