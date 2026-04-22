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
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
      { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
    ],
  },
  {
    label: "TEAM",
    items: [
      { href: "/dashboard/users", label: "Users", icon: Users },
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: "/dashboard/chat", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/dashboard/facilities", label: "Facilities", icon: Building2 },
      { href: "/dashboard/storefronts", label: "Storefronts", icon: ShoppingBag },
      { href: "/dashboard/blacklist", label: "Blacklist", icon: Ban },
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
  "/dashboard/team",
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
    <div className="flex flex-col h-full bg-[#0c0c0f]">
      {/* Logo area */}
      <div className="h-14 flex items-center px-5 shrink-0 border-b border-[#2a2a30]">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-zinc-950" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">INVENTRACK</span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider px-3 mb-2">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-indigo-500/10 text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
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
      <div className="shrink-0 border-t border-[#2a2a30] p-3 space-y-0.5">
        {showSettings && (
          <Link
            href="/dashboard/settings"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === "/dashboard/settings"
                ? "bg-indigo-500/10 text-indigo-400"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userName, userRole, userActive, userPermissions, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
      {/* ── Desktop Sidebar (always dark) ──────────────── */}
      <aside className="hidden lg:block sticky top-0 h-screen w-60 shrink-0">
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
        <header className="bg-background border-b border-border h-14 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 bg-[#0c0c0f] border-[#2a2a30]">
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

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
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
          <div className="max-w-6xl mx-auto p-6 animate-page-enter">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
