"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Building2,
  Ban, Activity, Settings, LogOut, Menu,
  Sun, Moon, Boxes, Bell, Loader2, ClipboardCheck,
  TrendingUp, FileBarChart, MessageCircle, FileText,
  Sparkles, ShoppingBag,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead } from "@/lib/dataService";
import { useToast } from "@/components/Toast";

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
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/dashboard/inventory", label: "Inventory", icon: Package },
      { href: "/dashboard/boxes", label: "Boxes", icon: Boxes },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
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
      { href: "/dashboard/whitelist", label: "Whitelist", icon: Ban },
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
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo area */}
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-border">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <Boxes className="w-5 h-5 text-background" />
          </div>
          <span className="font-bold text-lg tracking-tight">Invems</span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-foreground text-background font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + Sign out (bottom) */}
      <div className="shrink-0 border-t border-border p-3 space-y-1">
        {showSettings && (
          <Link
            href="/dashboard/settings"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              pathname === "/dashboard/settings"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        )}
        <button
          onClick={onLogout}
          className="flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4" />
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // Block inactive buyers
  if (userRole === "buyer" && userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
              <Bell className="w-8 h-8 text-amber-500" />
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

    // Deep copy + filter by role
    const groups: NavGroup[] = navGroups.map((group) => ({
      label: group.label,
      items: isAdmin
        ? [...group.items]
        : group.items.filter((item) => !adminOnlyPages.includes(item.href)),
    })).filter((group) => group.items.length > 0);

    // Add Reports to TOOLS for admin (without mutating the original)
    if (isAdmin) {
      const toolsIdx = groups.findIndex((g) => g.label === "TOOLS");
      if (toolsIdx !== -1) {
        groups[toolsIdx] = {
          ...groups[toolsIdx],
          items: [...groups[toolsIdx].items, { href: "/dashboard/reports", label: "Reports", icon: FileBarChart }],
        };
      }
    }

    // Add ADMIN group for superadmin
    if (userPermissions === "superadmin") {
      groups.push({
        label: "ADMIN",
        items: [
          { href: "/dashboard/analytics", label: "Platform Analytics", icon: TrendingUp },
        ],
      });
    }

    return groups;
  })();

  // Settings visible only to admins
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
        <header className="bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-card border-r">
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
            <button onClick={toggleTheme} className="p-2.5 rounded-lg hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button onClick={openNotifications} className="p-2.5 rounded-lg hover:bg-secondary transition-colors relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </button>
              {notifOpen ? (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-40">
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
                          className="block p-4 border-b border-border/50 last:border-0 hover:bg-secondary/50"
                        >
                          <div className="text-sm font-medium truncate">{String(n.title || n.type || "Notification")}</div>
                          <div className="text-xs text-muted-foreground truncate">{String(n.body || n.message || "")}</div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <Link
              href="/dashboard/settings"
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 text-xs font-bold ml-1"
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 lg:p-8 animate-page-enter">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
