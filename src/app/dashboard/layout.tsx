"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Building2,
  Ban, Activity, Settings, CreditCard, LogOut, Menu, X,
  Sun, Moon, Boxes, ChevronRight, Bell, Loader2, ClipboardCheck,
  TrendingUp, FileBarChart, MessageCircle, FileText,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import ErrorBoundary from "@/components/ErrorBoundary";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/facilities", label: "Facilities", icon: Building2 },
  { href: "/dashboard/blacklist", label: "Blacklist", icon: Ban },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/dashboard/chat", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

// Filter sidebar items by role
const adminOnlyPages = ["/dashboard/users", "/dashboard/facilities", "/dashboard/blacklist", "/dashboard/activity", "/dashboard/settings", "/dashboard/approvals", "/dashboard/team"];

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Block inactive buyers
  if (userRole === "buyer" && userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <div className="glass-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold mb-2">Account Pending</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Your account is awaiting activation. Contact your admin to get access.
          </p>
          <button onClick={async () => { await logout(); router.push("/login"); }} className="px-6 py-2.5 rounded-xl border text-sm font-medium hover:border-primary transition" style={{ borderColor: "var(--border)" }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Build dynamic nav items based on role and permissions
  const dynamicNavItems = [...navItems];
  if (userPermissions === "superadmin") {
    dynamicNavItems.push({ href: "/dashboard/analytics", label: "Platform Analytics", icon: TrendingUp });
  }
  if (userRole === "admin") {
    dynamicNavItems.push({ href: "/dashboard/reports", label: "Reports", icon: FileBarChart });
  }

  // Filter nav items by role
  const visibleNavItems = userRole === "admin"
    ? dynamicNavItems
    : dynamicNavItems.filter((item) => !adminOnlyPages.includes(item.href));

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 z-50 flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <div className="h-16 flex items-center justify-between px-5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">INVENTRACK</span>
          </Link>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition nav-item ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={!active ? { color: "var(--muted)" } : undefined}
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full hover:bg-danger/10 hover:text-danger transition"
            style={{ color: "var(--muted)" }}
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 glass sticky top-0 z-30"
        >
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold">{orgData?.name || "INVENTRACK"}</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {userName} &middot; {userRole}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <Link href="/dashboard/settings" className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold ml-1">
              {userName?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Breadcrumb />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
