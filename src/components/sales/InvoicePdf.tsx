/**
 * The invoice as a real PDF file, drawn in the browser (@react-pdf/renderer).
 * Only loaded when someone downloads or prints, so it adds nothing to the
 * pages people browse. Layout follows docs/mockups/sales-orders/3-invoice:
 * bold letterhead, bill-to / dates / reference, lines with part numbers,
 * totals, notes, payment details and "page x of y" on every page.
 *
 * Everything on it comes from the invoice's own copy of the details, so a
 * reprint next year looks exactly like the one that was sent. Sale prices
 * only: the invoice has no cost price to print.
 */

import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { daysBetween, fmtDate, fmtMoney, PAY_METHOD_LABEL, type SalesInvoice, type SalesInvoiceLine } from "@/lib/sales";

const INK = "#14121f";
const MUTE = "#5b5770";
const HAIR = "#dedbe8";
const GREEN = "#0f7a55";
const RED = "#b42318";

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const at = (f: string) => `${window.location.origin}/fonts/invoice/${f}`;
  Font.register({ family: "Display", fonts: [
    { src: at("unbounded-latin-700-normal.woff"), fontWeight: 700 },
    { src: at("unbounded-latin-800-normal.woff"), fontWeight: 800 },
  ] });
  Font.register({ family: "Body", fonts: [
    { src: at("public-sans-latin-400-normal.woff"), fontWeight: 400 },
    { src: at("public-sans-latin-600-normal.woff"), fontWeight: 600 },
    { src: at("public-sans-latin-700-normal.woff"), fontWeight: 700 },
  ] });
  Font.register({ family: "Mono", fonts: [
    { src: at("ibm-plex-mono-400.woff"), fontWeight: 400 },
    { src: at("ibm-plex-mono-500.woff"), fontWeight: 500 },
  ] });
  // Words are never hyphenated (the engine prints a "-" at every break, which
  // mangles part numbers and emails). Only a run of over 24 characters with
  // no space, which would not fit any column even in small type, is split.
  Font.registerHyphenationCallback((word) => (word.length > 40 ? word.match(/.{1,36}/g) || [word] : [word]));
  fontsReady = true;
}

const s = StyleSheet.create({
  page: { fontFamily: "Body", fontSize: 9.5, color: INK, paddingTop: 48, paddingBottom: 72, paddingHorizontal: 52, lineHeight: 1.45 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2.5, borderBottomColor: INK, paddingBottom: 18 },
  fromBlock: { maxWidth: 270 },
  logo: { maxWidth: 140, maxHeight: 48, objectFit: "contain", marginBottom: 10 },
  fromName: { fontFamily: "Display", fontWeight: 800, fontSize: 14, letterSpacing: -0.3, textTransform: "uppercase", marginBottom: 4 },
  small: { fontSize: 8.5, color: MUTE },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Display", fontWeight: 800, fontSize: 34, letterSpacing: -1.2, lineHeight: 1 },
  number: { fontFamily: "Mono", fontSize: 10.5, marginTop: 8 },
  cols: { flexDirection: "row", marginTop: 22, marginBottom: 24 },
  col: { flex: 1, paddingRight: 16 },
  label: { fontFamily: "Mono", fontSize: 7, letterSpacing: 1.2, color: MUTE, textTransform: "uppercase", marginBottom: 5 },
  strong: { fontWeight: 700 },
  row: { flexDirection: "row" },
  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 6, paddingHorizontal: 4 },
  thText: { fontFamily: "Mono", fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: HAIR, paddingVertical: 6.5, paddingHorizontal: 4 },
  cDesc: { flex: 1, paddingRight: 8 },
  cPart: { width: 124, paddingRight: 8 },
  part: { fontFamily: "Mono", fontSize: 8.5 },
  longEmail: { fontSize: 8.5 },
  cQty: { width: 44, textAlign: "right" },
  cUnit: { width: 76, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },
  mono: { fontFamily: "Mono" },
  totalsWrap: { flexDirection: "row", marginTop: 14 },
  stampArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  totals: { width: 262 },
  totLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2.5, borderTopColor: INK, marginTop: 6, paddingTop: 8 },
  grandLabel: { fontFamily: "Display", fontWeight: 800, fontSize: 12, letterSpacing: -0.3, paddingTop: 3 },
  grandText: { fontFamily: "Display", fontWeight: 800, fontSize: 20, letterSpacing: -0.6 },
  stamp: { borderWidth: 2.5, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12, transform: "rotate(-8deg)" },
  stampText: { fontFamily: "Display", fontWeight: 800, fontSize: 18, letterSpacing: 0.6 },
  section: { marginTop: 22 },
  // Measured from the top (Letter is 792pt tall): react-pdf 4.9 drops a fixed
  // footer anchored with bottom when it holds page numbers.
  footer: { position: "absolute", left: 52, right: 52, top: 740, borderTopWidth: 0.75, borderTopColor: HAIR, paddingTop: 9, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTE },
});

/* A long address goes onto two lines at the @ rather than being cut anywhere. */
const breakEmail = (e: string) => (e.length > 28 ? e.replace("@", "\n@") : e);

function InvoiceDoc({ inv, lines, orderNumber, logo }: { inv: SalesInvoice; lines: SalesInvoiceLine[]; orderNumber: string | null; logo: string | null }) {
  const paid = inv.status === "paid";
  const isVoid = inv.status === "void";
  const days = daysBetween(inv.issued_on, inv.due_on);
  const contact = [inv.from_email, inv.from_phone].filter(Boolean).join("  ·  ");
  return (
    <Document title={`Invoice ${inv.number}`} author={inv.from_name} subject={`Invoice ${inv.number} for ${inv.bill_to_name}`} creator="Invems" producer="Invems">
      <Page size="LETTER" style={s.page} wrap>
        {/* Letterhead */}
        <View style={s.head}>
          <View style={s.fromBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.fromName}>{inv.from_name}</Text>
            {inv.from_address ? <Text style={s.small}>{inv.from_address}</Text> : null}
            {contact ? <Text style={s.small}>{contact}</Text> : null}
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>INVOICE</Text>
            <Text style={s.number}>{inv.number}</Text>
          </View>
        </View>

        {/* Who, when, which */}
        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.strong}>{inv.bill_to_name}</Text>
            {inv.bill_to_contact ? <Text>Attn: {inv.bill_to_contact}</Text> : null}
            {inv.bill_to_address ? <Text>{inv.bill_to_address}</Text> : null}
            {inv.bill_to_email ? <Text style={inv.bill_to_email.length > 28 ? s.longEmail : undefined}>{breakEmail(inv.bill_to_email)}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Dates</Text>
            <Text>Issued  {fmtDate(inv.issued_on)}</Text>
            <Text>Due  {fmtDate(inv.due_on)}  ({days === 0 ? "on receipt" : inv.terms})</Text>
            {paid ? <Text>Paid  {fmtDate(inv.paid_on)}{inv.paid_method ? `  ·  ${PAY_METHOD_LABEL[inv.paid_method]}` : ""}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Reference</Text>
            {orderNumber ? <Text>Sales order {orderNumber}</Text> : null}
            {inv.customer_po ? <Text>PO {inv.customer_po} (customer)</Text> : null}
            {paid && inv.paid_reference ? <Text>Payment ref {inv.paid_reference}</Text> : null}
          </View>
        </View>

        {/* Lines; the head repeats on each page */}
        <View style={s.th} fixed>
          <Text style={[s.thText, s.cDesc]}>Description</Text>
          <Text style={[s.thText, s.cPart]}>Part no.</Text>
          <Text style={[s.thText, s.cQty]}>Qty</Text>
          <Text style={[s.thText, s.cUnit]}>Unit price</Text>
          <Text style={[s.thText, s.cAmt]}>Amount</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={s.tr} wrap={false}>
            <View style={s.cDesc}>
              <Text style={s.strong}>{l.description}</Text>
              {l.brand ? <Text style={s.small}>{l.brand}</Text> : null}
            </View>
            <Text style={[s.part, s.cPart]}>{l.part_number || "—"}</Text>
            <Text style={[s.mono, s.cQty]}>{l.quantity.toLocaleString("en-US")}</Text>
            <Text style={[s.mono, s.cUnit]}>{fmtMoney(l.unit_price_cents)}</Text>
            <Text style={[s.mono, s.cAmt]}>{fmtMoney(l.line_cents)}</Text>
          </View>
        ))}

        {/* Totals, with the stamp beside them */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.stampArea}>
            {paid ? <View style={[s.stamp, { borderColor: GREEN }]}><Text style={[s.stampText, { color: GREEN }]}>PAID</Text></View> : null}
            {isVoid ? <View style={[s.stamp, { borderColor: RED }]}><Text style={[s.stampText, { color: RED }]}>VOID</Text></View> : null}
          </View>
          <View style={s.totals}>
            <View style={s.totLine}><Text>Subtotal</Text><Text style={s.mono}>{fmtMoney(inv.subtotal_cents)}</Text></View>
            {Number(inv.freight_cents) > 0 ? (
              <View style={s.totLine}><Text>Freight</Text><Text style={s.mono}>{fmtMoney(inv.freight_cents)}</Text></View>
            ) : null}
            <View style={s.grand}>
              <Text style={s.grandLabel}>{paid || isVoid ? "Total" : "Amount due"}</Text>
              <Text style={s.grandText}>{fmtMoney(inv.total_cents)}</Text>
            </View>
          </View>
        </View>

        {isVoid && inv.void_reason ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Voided</Text>
            <Text>{inv.void_reason}</Text>
          </View>
        ) : null}
        {inv.notes ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Notes</Text>
            <Text>{inv.notes}</Text>
          </View>
        ) : null}
        {inv.payment_details && !paid && !isVoid ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>How to pay</Text>
            <Text>{inv.payment_details}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text>{inv.from_name}{inv.from_email ? `  ·  ${inv.from_email}` : ""}</Text>
          <Text style={s.mono} render={({ pageNumber, totalPages }) => `${inv.number}  ·  page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/* A logo from another site can fail to load (or be blocked); the invoice is
   still made, just without it. */
async function logoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!/^image\/(png|jpe?g)$/.test(blob.type)) return null;
    return await new Promise((ok) => {
      const r = new FileReader();
      r.onload = () => ok(typeof r.result === "string" ? r.result : null);
      r.onerror = () => ok(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function invoicePdf(inv: SalesInvoice, lines: SalesInvoiceLine[], orderNumber: string | null): Promise<Blob> {
  registerFonts();
  const logo = await logoData(inv.from_logo_url);
  return pdf(<InvoiceDoc inv={inv} lines={lines} orderNumber={orderNumber} logo={logo} />).toBlob();
}
