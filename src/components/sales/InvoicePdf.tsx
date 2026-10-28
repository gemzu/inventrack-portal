/**
 * The invoice as a real PDF file, drawn in the browser (@react-pdf/renderer).
 * Only loaded when someone downloads or prints, so it adds nothing to the
 * pages people browse. QuickBooks-style layout (docs/mockups/invoice-and-bol):
 * big bold labels, the key fields highlighted in pale yellow with bold values
 * (so a black-and-white print stays readable), Bill To and Ship To, a strip
 * for ship date / tracking / PO / SO / job number, lines, totals with an
 * optional "Scan to pay" code, and "page x of y" on every page.
 *
 * Everything on it comes from the invoice's own copy of the details, so a
 * reprint next year looks exactly like the one that was sent. Sale prices
 * only: the invoice has no cost price to print.
 */

import QRCode from "qrcode";
import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { daysBetween, fmtDate, fmtMoney, PAY_METHOD_LABEL, taxLine, type SalesInvoice, type SalesInvoiceLine } from "@/lib/sales";

const INK = "#14121f";
const MUTE = "#4b4760";
const HAIR = "#c9c6d6";
const BAND = "#d9d9d9";
const HILITE = "#fff3b0";
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
  // mangles part numbers and emails). Only a run of over 40 characters with
  // no space, which would not fit any column, is split.
  Font.registerHyphenationCallback((word) => (word.length > 40 ? word.match(/.{1,36}/g) || [word] : [word]));
  fontsReady = true;
}

const s = StyleSheet.create({
  page: { fontFamily: "Body", fontSize: 11, color: INK, paddingTop: 44, paddingBottom: 70, paddingHorizontal: 44, lineHeight: 1.4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2.5, borderBottomColor: INK, paddingBottom: 14 },
  fromBlock: { maxWidth: 250 },
  logo: { maxWidth: 150, maxHeight: 52, objectFit: "contain", marginBottom: 8 },
  fromName: { fontFamily: "Display", fontWeight: 800, fontSize: 15, letterSpacing: -0.3, textTransform: "uppercase", marginBottom: 4 },
  small: { fontSize: 10, color: MUTE },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Display", fontWeight: 800, fontSize: 30, letterSpacing: -1, lineHeight: 1, marginBottom: 8 },
  kv: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 3 },
  kvLabel: { fontWeight: 700, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", marginRight: 8 },
  hl: { backgroundColor: HILITE, fontWeight: 700, fontSize: 12.5, paddingHorizontal: 5, paddingVertical: 1 },
  cols: { flexDirection: "row", marginTop: 16 },
  col: { flex: 1, paddingRight: 16 },
  label: { fontWeight: 700, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  who: { fontWeight: 700, fontSize: 13 },
  strip: { flexDirection: "row", marginTop: 16, marginBottom: 6 },
  cell: { flex: 1, borderTopWidth: 1.5, borderTopColor: INK, paddingTop: 5, paddingRight: 8 },
  blank: { height: 16, borderBottomWidth: 0.75, borderBottomColor: HAIR },
  th: { flexDirection: "row", backgroundColor: BAND, paddingVertical: 6, paddingHorizontal: 8, marginTop: 10 },
  thText: { fontWeight: 700, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: HAIR, paddingVertical: 8, paddingHorizontal: 8 },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 52, textAlign: "right" },
  cUnit: { width: 76, textAlign: "right" },
  cAmt: { width: 90, textAlign: "right" },
  item: { fontWeight: 700, fontSize: 12 },
  part: { fontFamily: "Mono", fontSize: 9.5, color: MUTE, marginTop: 1 },
  longEmail: { fontSize: 10 },
  mono: { fontFamily: "Mono", fontSize: 11 },
  monoB: { fontFamily: "Mono", fontWeight: 500, fontSize: 12 },
  totalsWrap: { flexDirection: "row", marginTop: 14, alignItems: "flex-start" },
  leftArea: { flex: 1, alignItems: "flex-start", justifyContent: "center", paddingTop: 4 },
  qr: { width: 80, height: 80 },
  scan: { fontWeight: 700, fontSize: 13, marginBottom: 5 },
  totals: { width: 270 },
  totLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2.5, borderTopColor: INK, marginTop: 6, paddingTop: 8 },
  grandLabel: { fontWeight: 700, fontSize: 12.5, letterSpacing: 0.8, textTransform: "uppercase" },
  grandText: { fontFamily: "Display", fontWeight: 800, fontSize: 22, letterSpacing: -0.6 },
  stamp: { borderWidth: 2.5, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12, transform: "rotate(-8deg)", marginLeft: 20 },
  stampText: { fontFamily: "Display", fontWeight: 800, fontSize: 18, letterSpacing: 0.6 },
  section: { marginTop: 14 },
  // Measured from the top (Letter is 792pt tall): react-pdf 4.9 drops a fixed
  // footer anchored with bottom when it holds page numbers.
  footer: { position: "absolute", left: 44, right: 44, top: 744, borderTopWidth: 0.75, borderTopColor: HAIR, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: MUTE },
});

/* A long address goes onto two lines at the @ rather than being cut anywhere. */
const breakEmail = (e: string) => (e.length > 28 ? e.replace("@", "\n@") : e);

/* The big total shrinks for large amounts so it never runs into its label. */
const grandSize = (t: string) => (t.length <= 9 ? 22 : t.length <= 11 ? 19 : 16);

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      {value ? <Text style={[s.hl, { alignSelf: "flex-start" }]}>{value}</Text> : <View style={s.blank} />}
    </View>
  );
}

function InvoiceDoc({ inv, lines, orderNumber, logo, qr }: { inv: SalesInvoice; lines: SalesInvoiceLine[]; orderNumber: string | null; logo: string | null; qr: string | null }) {
  const paid = inv.status === "paid";
  const isVoid = inv.status === "void";
  const days = daysBetween(inv.issued_on, inv.due_on);
  const contact = [inv.from_email, inv.from_phone].filter(Boolean).join("  ·  ");
  const shipName = inv.ship_to_name || inv.bill_to_name;
  const shipAddress = inv.ship_to_name || inv.ship_to_address ? inv.ship_to_address : inv.bill_to_address;
  const showQr = !!qr && !paid && !isVoid;
  // The last two lines travel with the totals, so the totals are never alone
  // on a page and a long list never ends in a dangling total.
  const head = lines.length > 2 ? lines.slice(0, lines.length - 2) : [];
  const tail = lines.length > 2 ? lines.slice(lines.length - 2) : lines;
  const row = (l: SalesInvoiceLine) => (
    <View key={l.id} style={s.tr} wrap={false}>
      <View style={s.cDesc}>
        <Text style={s.item}>{l.description}</Text>
        {l.part_number ? <Text style={s.part}>{l.part_number}</Text> : null}
        {l.brand ? <Text style={s.small}>{l.brand}</Text> : null}
      </View>
      <Text style={[s.mono, s.cQty]}>{l.quantity.toLocaleString("en-US")}</Text>
      <Text style={[s.mono, s.cUnit]}>{fmtMoney(l.unit_price_cents)}</Text>
      <Text style={[s.monoB, s.cAmt]}>{fmtMoney(l.line_cents)}</Text>
    </View>
  );
  return (
    <Document title={`Invoice ${inv.number}`} author={inv.from_name} subject={`Invoice ${inv.number} for ${inv.bill_to_name}`} creator="Invems" producer="Invems">
      <Page size="LETTER" style={s.page} wrap>
        <View wrap={false}>
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
              <View style={s.kv}><Text style={s.kvLabel}>Invoice #</Text><Text style={s.hl}>{inv.number}</Text></View>
              <View style={s.kv}><Text style={s.kvLabel}>Date</Text><Text style={s.hl}>{fmtDate(inv.issued_on)}</Text></View>
              <View style={s.kv}><Text style={s.kvLabel}>Due date</Text><Text style={s.hl}>{fmtDate(inv.due_on)}</Text></View>
              <View style={s.kv}><Text style={s.kvLabel}>Terms</Text><Text style={s.hl}>{days === 0 ? "Due on receipt" : inv.terms}</Text></View>
            </View>
          </View>

          <View style={s.cols}>
            <View style={s.col}>
              <Text style={s.label}>Bill to</Text>
              <Text style={s.who}>{inv.bill_to_name}</Text>
              {inv.bill_to_contact ? <Text>Attn: {inv.bill_to_contact}</Text> : null}
              {inv.bill_to_address ? <Text>{inv.bill_to_address}</Text> : null}
              {inv.bill_to_email ? <Text style={inv.bill_to_email.length > 28 ? s.longEmail : undefined}>{breakEmail(inv.bill_to_email)}</Text> : null}
            </View>
            <View style={s.col}>
              <Text style={s.label}>Ship to</Text>
              <Text style={s.who}>{shipName}</Text>
              {shipAddress ? <Text>{shipAddress}</Text> : null}
            </View>
          </View>

          <View style={s.strip}>
            <Field label="Ship date" value={inv.ship_date ? fmtDate(inv.ship_date) : null} />
            <Field label="Tracking no." value={inv.tracking_no} />
            <Field label="PO number" value={inv.customer_po} />
            <Field label="SO #" value={orderNumber} />
            <Field label="Job number" value={inv.job_number} />
          </View>
        </View>

        {/* The band repeats on each page */}
        <View style={s.th} fixed>
          <Text style={[s.thText, s.cDesc]}>Description</Text>
          <Text style={[s.thText, s.cQty]}>Qty</Text>
          <Text style={[s.thText, s.cUnit]}>Rate</Text>
          <Text style={[s.thText, s.cAmt]}>Amount</Text>
        </View>
        {head.map(row)}

        <View wrap={false}>
          {tail.map(row)}
          <View style={s.totalsWrap}>
            <View style={s.leftArea}>
              {showQr ? (
                <View>
                  <Text style={s.scan}>Scan to pay</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                  <Image src={qr!} style={s.qr} />
                </View>
              ) : null}
              {paid ? <View style={[s.stamp, { borderColor: GREEN }]}><Text style={[s.stampText, { color: GREEN }]}>PAID</Text></View> : null}
              {isVoid ? <View style={[s.stamp, { borderColor: RED }]}><Text style={[s.stampText, { color: RED }]}>VOID</Text></View> : null}
            </View>
            <View style={s.totals}>
              <View style={s.totLine}><Text>Subtotal</Text><Text style={s.mono}>{fmtMoney(inv.subtotal_cents)}</Text></View>
              {Number(inv.freight_cents) > 0 ? (
                <View style={s.totLine}><Text>Freight</Text><Text style={s.mono}>{fmtMoney(inv.freight_cents)}</Text></View>
              ) : null}
              {Number(inv.tax_cents) > 0 ? (
                <View style={s.totLine}><Text>{taxLine(inv.tax_label, inv.tax_rate)}</Text><Text style={s.mono}>{fmtMoney(inv.tax_cents)}</Text></View>
              ) : null}
              <View style={s.grand}>
                <Text style={s.grandLabel}>{paid ? "Total paid" : isVoid ? "Total" : "Balance due"}</Text>
                <Text style={[s.grandText, { fontSize: grandSize(fmtMoney(inv.total_cents)) }]}>{fmtMoney(inv.total_cents)}</Text>
              </View>
            </View>
          </View>
        </View>

        {paid ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Payment</Text>
            <Text>{fmtDate(inv.paid_on)}{inv.paid_method ? `  ·  ${PAY_METHOD_LABEL[inv.paid_method]}` : ""}{inv.paid_reference ? `  ·  Ref ${inv.paid_reference}` : ""}</Text>
          </View>
        ) : null}
        {isVoid && inv.void_reason ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Voided</Text>
            <Text>{inv.void_reason}</Text>
          </View>
        ) : null}
        {inv.notes || (inv.payment_details && !paid && !isVoid) ? (
          <View style={[s.section, { flexDirection: "row" }]} wrap={false}>
            {inv.notes ? (
              <View style={s.col}>
                <Text style={s.label}>Notes</Text>
                <Text>{inv.notes}</Text>
              </View>
            ) : null}
            {inv.payment_details && !paid && !isVoid ? (
              <View style={s.col}>
                <Text style={s.label}>How to pay</Text>
                <Text>{inv.payment_details}</Text>
              </View>
            ) : null}
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
  // Only a secure link becomes a code; anything else is ignored.
  const qr = inv.pay_link && /^https:\/\//i.test(inv.pay_link)
    ? await QRCode.toDataURL(inv.pay_link, { margin: 1, width: 300, errorCorrectionLevel: "M" }).catch(() => null)
    : null;
  return pdf(<InvoiceDoc inv={inv} lines={lines} orderNumber={orderNumber} logo={logo} qr={qr} />).toBlob();
}
