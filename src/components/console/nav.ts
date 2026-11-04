/**
 * One description of where the dashboard can go.
 *
 * The rail and the index were previously two separate lists that had already
 * drifted apart. They are now the same data, so a destination added here shows
 * up in both, keeps the same ordinal, and cannot be visible in one and missing
 * from the other.
 *
 * Every entry carries a `meta` line because the site's index shows a real
 * readout under whatever you are pointing at, and the dashboard should not
 * drop that habit the moment you sign in.
 */

import {
  Activity, Ban, BookOpen, Boxes, Building2, ClipboardCheck, ClipboardList,
  FileBarChart, FileText, LayoutDashboard, MessageCircle, Package, Bell,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, TrendingUp, Users,
  Receipt, Contact, Landmark, KeyRound, PenLine,
} from "lucide-react";

export type Dest = {
  href: string;
  label: string;
  meta: string;
  icon: typeof LayoutDashboard;
  /** Admins only. Workers never see these, in the rail or the index. */
  admin?: boolean;
  /** Superadmins only. */
  platform?: boolean;
  /** Admins the owner gave Sales and invoices (the database checks the same). */
  sales?: boolean;
  /** Only the owner of the company. */
  owner?: boolean;
  /** People the owner gave Invoice entry. */
  entry?: boolean;
  /** Also fine for someone who has Invoice entry and nothing else. */
  entryOk?: boolean;
};

export type Section = { label: string; items: Dest[] };

export const SECTIONS: Section[] = [
  {
    label: "Entry",
    items: [
      { href: "/dashboard/entry", label: "Invoice entry", meta: "Add items to your invoices", icon: PenLine, entry: true, entryOk: true },
    ],
  },
  {
    label: "Floor",
    items: [
      { href: "/dashboard", label: "Overview", meta: "Everything at a glance", icon: LayoutDashboard },
      { href: "/dashboard/inventory", label: "Inventory", meta: "Every unit on the floor", icon: Package },
      { href: "/dashboard/boxes", label: "Boxes", meta: "What is packed where", icon: Boxes },
      { href: "/dashboard/catalog", label: "Catalog", meta: "Products you carry", icon: BookOpen },
      { href: "/dashboard/cycle-count", label: "Cycle count", meta: "Count, then reconcile", icon: ClipboardCheck },
    ],
  },
  {
    label: "Movement",
    items: [
      { href: "/dashboard/orders", label: "Orders", meta: "Going out", icon: ShoppingCart, admin: true },
      { href: "/dashboard/purchase-orders", label: "Purchase orders", meta: "Coming in", icon: ClipboardList, admin: true },
      { href: "/dashboard/approvals", label: "Approvals", meta: "Waiting on you", icon: ClipboardCheck, admin: true },
      { href: "/dashboard/invoices", label: "Invoices", meta: "Billed and owed", icon: FileText, admin: true },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/dashboard/orders/sales", label: "Sales orders", meta: "Stock sold to customers", icon: ShoppingCart, sales: true },
      { href: "/dashboard/invoices/sales", label: "Sales invoices", meta: "Billed, paid, owed", icon: Receipt, sales: true },
      { href: "/dashboard/sales/customers", label: "Customers", meta: "Who you bill", icon: Contact, sales: true },
      { href: "/dashboard/sales/companies", label: "Billing companies", meta: "Who sends the invoice", icon: Landmark, sales: true },
      { href: "/dashboard/sales/reports", label: "Money reports", meta: "Billed, received, owed; CSV", icon: FileBarChart, sales: true },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/users", label: "Users", meta: "Accounts and roles", icon: Users, admin: true },
      { href: "/dashboard/access", label: "Access", meta: "Who can do what", icon: KeyRound, owner: true },
      { href: "/dashboard/invites", label: "Invites", meta: "Pending join codes", icon: FileText, admin: true },
      { href: "/dashboard/chat", label: "Messages", meta: "Talk to your team", icon: MessageCircle, entryOk: true },
      { href: "/dashboard/support", label: "Support", meta: "Tickets and replies", icon: MessageCircle, entryOk: true },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/dashboard/facilities", label: "Facilities", meta: "Sites and warehouses", icon: Building2, admin: true },
      { href: "/dashboard/storefronts", label: "Storefronts", meta: "Public buying pages", icon: ShoppingBag, admin: true },
      { href: "/dashboard/whitelist", label: "Whitelist", meta: "Allowed buyers", icon: ShieldCheck },
      { href: "/dashboard/blacklist", label: "Blacklist", meta: "Blocked buyers", icon: Ban, admin: true },
      { href: "/dashboard/notifications", label: "Notifications", meta: "What reaches you", icon: Bell, entryOk: true },
      { href: "/dashboard/settings", label: "Settings", meta: "Org, security, theme", icon: Settings, admin: true },
    ],
  },
  {
    label: "Read",
    items: [
      { href: "/dashboard/reports", label: "Reports", meta: "Exports and summaries", icon: FileBarChart, admin: true },
      { href: "/dashboard/activity", label: "Activity", meta: "Every scan, in order", icon: Activity, admin: true },
      { href: "/dashboard/enrichment", label: "Enrichment", meta: "Fill product detail", icon: Sparkles, admin: true },
      { href: "/dashboard/analytics", label: "Platform analytics", meta: "Across every org", icon: TrendingUp, platform: true },
    ],
  },
];

/** The rail and the index both need the list already filtered for this user. */
export function visibleSections(
  role: string | null,
  permissions: string | null,
  canSales = false,
  extra: { isOwner?: boolean; canEntry?: boolean } = {}
): Section[] {
  const isAdmin = role === "admin";
  const isPlatform = permissions === "superadmin";
  /* Invoice entry and no admin rights: the menu is that page and the team's
     messages, nothing else (the database refuses the rest in any case). */
  const entryOnly = Boolean(extra.canEntry) && !isAdmin;
  return SECTIONS.map((s) => ({
    label: s.label,
    items: s.items.filter((i) => {
      if (entryOnly) return Boolean(i.entryOk);
      if (i.entry) return Boolean(extra.canEntry);
      if (i.owner) return isAdmin && Boolean(extra.isOwner);
      if (i.platform) return isPlatform;
      if (i.sales) return isAdmin && canSales;
      if (i.admin) return isAdmin;
      return true;
    }),
  })).filter((s) => s.items.length > 0);
}

/** Where someone who has only Invoice entry may go; anywhere else sends them back to it. */
export const ENTRY_ONLY_PATHS = ["/dashboard/entry", "/dashboard/chat", "/dashboard/support", "/dashboard/notifications"];

/** Flat, in rail order, so ordinals match between the rail and the index. */
export function flatten(sections: Section[]): Dest[] {
  return sections.flatMap((s) => s.items);
}

/** The longest matching href wins, so /dashboard does not claim every child. */
export function activeHref(pathname: string, dests: Dest[]): string | null {
  let best: string | null = null;
  for (const d of dests) {
    if (pathname === d.href || pathname.startsWith(d.href + "/")) {
      if (!best || d.href.length > best.length) best = d.href;
    }
  }
  return best;
}
