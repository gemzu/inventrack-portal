"use client";

import Mark from "@/components/Mark";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard, Package, BookOpen, ShoppingCart, Users, Building2,
  Ban, Activity, Settings, LogOut, Menu,
  Sun, Moon, Boxes, Bell, ClipboardCheck, ClipboardList,
  TrendingUp, FileBarChart, MessageCircle, FileText,
  Sparkles, ShoppingBag, ShieldCheck,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import PageLoader from "@/components/PageLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getNotifications, getUnreadNotificationCount } from "@/lib/dataService";
import { useToast } from "@/components/Toast";
import { spring } from "@/lib/motion";

/* ── Nav structure with groups ───────────────────────── */
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/dashboard/inventory", label: "Inventory", icon: Package },
      { href: "/dashboard/catalog", label: "Product Catalog", icon: BookOpen },
      { href: "/dashboard/boxes", label: "Boxes", icon: Boxes },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
      { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
    ],
  },
  {
    label: "TEAM",
    items: [
      { href: "/dashboard/users", label: "Users", icon: Users },
      { href: "/dashboard/invites", label: "Invites", icon: FileText },
      { href: "/dashboard/chat", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/dashboard/facilities", label: "Facilities", icon: Building2 },
      { href: "/dashboard/storefronts", label: "Storefronts", icon: ShoppingBag },
      { href: "/dashboard/blacklist", label: "Blacklist", icon: Ban },
      { href: "/dashboard/whitelist", label: "Whitelist", icon: ShieldCheck },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/support", label: "Support", icon: MessageCircle },
      { href: "/dashboard/enrichment", label: "AI Enrichment", icon: Sparkles },
      { href: "/dashboard/activity", label: "Activity", icon: Activity },
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
    ],
  },
];

// Admin-only pages filtering
const adminOnlyPages = [
  "/dashboard/users",
  "/dashboard/facilities",
  "/dashboard/blacklist",
  "/dashboard/enrichment",
  "/dashboard/activity",
  "/dashboard/settings",
  "/dashboard/approvals",
  "/dashboard/storefronts",
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        active
          ? "text-white font-semibold"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={spring}
          className="absolute inset-0 rounded-xl bg-brand-gradient shadow-[0_8px_20px_-8px_var(--brand-1)]"
        />
      )}
      {!active && (
        <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-secondary transition-colors" />
      )}
      <item.icon className="relative w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function SidebarNav({
  visibleGroups,
  showSettings,
  pathname,
  onNavigate,
  onLogout,
}: {
  visibleGroups: NavGroup[];
  showSettings: boolean;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo area */}
      <div className="h-16 flex items-center px-5 shrink-0">
        <Link href="/" className="flex items-center gap-3 group" onClick={onNavigate}>
          <div className="relative w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-[0_6px_16px_-6px_var(--brand-1)] overflow-hidden">
            <Mark className="h-6 w-6 text-white" />
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Invems</span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.14em] px-3 mb-2">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + Sign out (bottom) */}
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-0.5">
        {showSettings && (
          <NavLink
            item={{ href: "/dashboard/settings", label: "Settings", icon: Settings }}
            active={pathname === "/dashboard/settings"}
            onNavigate={onNavigate}
          />
        )}
        <button
          onClick={onLogout}
          className="group flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="w-[18px] h-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userName, userRole, userActive, userPermissions, orgId, loading, logout } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPreview, setNotifPreview] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user && userRole === "buyer") {
      router.push("/buyer");
      return;
    }
    if (!loading && user && userRole === "admin" && !orgId) {
      router.push("/setup/organization");
    }
  }, [user, loading, userRole, orgId, router]);

  useEffect(() => {
    if (!user) return;
    getUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [user]);

  const openNotifications = async () => {
    if (!user) return;
    setNotifOpen((v) => !v);
    if (notifOpen) return;
    try {
      const rows = await getNotifications(user.id, 8);
      setNotifPreview(rows as Array<Record<string, unknown>>);
    } catch {
      toast("Failed to load notifications", "error");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return null;

  // Block inactive buyers
  if (userRole === "buyer" && userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
              <Bell className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold mb-2">Account Pending</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your account is awaiting activation. Contact your admin to get access.
            </p>
            <Button
              variant="outline"
              onClick={async () => { await logout(); router.push("/login"); }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build dynamic groups based on role/permissions (no mutation!)
  const visibleGroups = (() => {
    const isAdmin = userRole === "admin";

    const groups: NavGroup[] = navGroups.map((group) => ({
      label: group.label,
      items: isAdmin
        ? [...group.items]
        : group.items.filter((item) => !adminOnlyPages.includes(item.href)),
    })).filter((group) => group.items.length > 0);

    if (isAdmin) {
      const toolsIdx = groups.findIndex((g) => g.label === "TOOLS");
      if (toolsIdx !== -1) {
        groups[toolsIdx] = {
          ...groups[toolsIdx],
          items: [...groups[toolsIdx].items, { href: "/dashboard/reports", label: "Reports", icon: FileBarChart }],
        };
      }
    }

    if (userPermissions === "superadmin") {
      groups.push({
        label: "ADMIN",
        items: [{ href: "/dashboard/analytics", label: "Platform Analytics", icon: TrendingUp }],
      });
    }

    return groups;
  })();

  const showSettings = userRole === "admin";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Desktop Sidebar ──────────────── */}
      <aside className="hidden lg:block sticky top-0 h-screen w-64 shrink-0">
        <SidebarNav
          visibleGroups={visibleGroups}
          showSettings={showSettings}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="glass border-b border-border/60 h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border">
                <SidebarNav
                  visibleGroups={visibleGroups}
                  showSettings={showSettings}
                  pathname={pathname}
                  onNavigate={() => setSheetOpen(false)}
                  onLogout={handleLogout}
                />
              </SheetContent>
            </Sheet>
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
            <div className="relative">
              <button
                onClick={openNotifications}
                className="p-2.5 rounded-xl hover:bg-secondary transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background pulse-dot" />
                ) : null}
              </button>
              <AnimatePresence>
                {notifOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-popover backdrop-blur-xl shadow-glow z-40 overflow-hidden"
                  >
                    <div className="p-4 border-b border-border">
                      <span className="text-sm font-semibold">Notifications</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifPreview.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No recent notifications.</div>
                      ) : (
                        notifPreview.map((n, i) => (
                          <Link
                            key={`${n.id || i}`}
                            href="/dashboard/notifications"
                            className="block p-4 border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="text-sm font-medium truncate">{String(n.title || n.type || "Notification")}</div>
                            <div className="text-xs text-muted-foreground truncate">{String(n.body || n.message || "")}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <Link
              href="/dashboard/settings"
              className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold ml-1 shadow-[0_4px_12px_-4px_var(--brand-1)] hover:scale-105 transition-transform"
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* Page content — fade only (NO transform: a transform here would
            make position:fixed drawers/modals anchor to this box instead of
            the viewport, pinning them to the top of the page). */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto p-6 lg:p-8"
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
