"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Building2,
  Ban, Activity, Settings, LogOut, Menu, X,
  Sun, Moon, Boxes, ChevronRight, Bell, Loader2, ClipboardCheck,
  TrendingUp, FileBarChart, MessageCircle, FileText,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import ErrorBoundary from "@/components/ErrorBoundary";

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
      { href: "/dashboard/blacklist", label: "Blacklist", icon: Ban },
      { href: "/dashboard/activity", label: "Activity", icon: Activity },
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
    ],
  },
];

const settingsItem: NavItem = { href: "/dashboard/settings", label: "Settings", icon: Settings };

// Admin-only pages filtering
const adminOnlyPages = [
  "/dashboard/users",
  "/dashboard/facilities",
  "/dashboard/blacklist",
  "/dashboard/activity",
  "/dashboard/settings",
  "/dashboard/approvals",
  "/dashboard/team",
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userName, userRole, userActive, userPermissions, orgId, orgData, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  // Block inactive buyers
  if (userRole === "buyer" && userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <div className="card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Account Pending</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Your account is awaiting activation. Contact your admin to get access.
          </p>
          <button
            onClick={async () => { await logout(); router.push("/login"); }}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Build dynamic groups based on role/permissions
  const buildVisibleGroups = (): NavGroup[] => {
    const isAdmin = userRole === "admin";

    // Filter each group's items by role
    const filtered = navGroups.map((group) => ({
      ...group,
      items: isAdmin
        ? group.items
        : group.items.filter((item) => !adminOnlyPages.includes(item.href)),
    })).filter((group) => group.items.length > 0);

    // Add ADMIN group for superadmin
    if (userPermissions === "superadmin") {
      filtered.push({
        label: "ADMIN",
        items: [
          { href: "/dashboard/analytics", label: "Platform Analytics", icon: TrendingUp },
        ],
      });
    }

    // Add Reports for admin role
    if (isAdmin) {
      const toolsGroup = filtered.find((g) => g.label === "TOOLS");
      if (toolsGroup) {
        toolsGroup.items.push({ href: "/dashboard/reports", label: "Reports", icon: FileBarChart });
      }
    }

    return filtered;
  };

  const visibleGroups = buildVisibleGroups();

  // Settings visible only to admins
  const showSettings = userRole === "admin";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (always dark navy) ──────────────────── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-60 z-50 flex flex-col bg-slate-900 transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">INVENTRACK</span>
          </Link>
          <button className="lg:hidden p-1 text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`sidebar-nav-item ${active ? "active" : ""}`}
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
        <div className="shrink-0 border-t border-slate-800 p-3 space-y-0.5">
          {showSettings && (
            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-nav-item ${pathname === "/dashboard/settings" ? "active" : ""}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-nav-item w-full hover:!text-red-400 hover:!bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30 border-b"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/dashboard/settings"
              className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold ml-1"
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8 animate-page-enter">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
