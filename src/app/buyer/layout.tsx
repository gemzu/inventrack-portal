"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingBag, ClipboardList, Heart, MessageCircle, User, LogOut, Sun, Moon, Menu, Boxes } from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/dataService";

const links = [
  { href: "/buyer/catalog", label: "Catalog", icon: ShoppingBag },
  { href: "/buyer/orders", label: "My Orders", icon: ClipboardList },
  { href: "/buyer/favorites", label: "Favorites", icon: Heart },
  { href: "/buyer/messages", label: "Messages", icon: MessageCircle },
  { href: "/buyer/profile", label: "Profile", icon: User },
];

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { toggleTheme, theme } = useTheme();
  
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-gray-200">
        <Link href="/buyer/catalog" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E398CA] to-[#fce4ec] flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: '#1f1a1d' }}>INVENTRACK</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? 'text-white font-medium'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={active ? { background: '#E398CA' } : {}}
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 w-full transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" style={{ color: '#E398CA' }} /> : <Moon className="w-4 h-4" style={{ color: '#E398CA' }} />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs ${
                active ? "text-[#E398CA]" : "text-gray-400"
              }`}
            >
              <l.icon className="w-5 h-5" style={{ color: active ? '#E398CA' : 'gray-400' }} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, userActive, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && userRole !== "buyer") router.push("/dashboard");
  }, [loading, user, userRole, router]);

  useEffect(() => {
    if (!user) return;
    getUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || userRole !== "buyer") return null;

  if (userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white rounded-2xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold" style={{ color: '#1f1a1d' }}>Account pending activation</h2>
            <p className="text-sm text-gray-500">Your buyer account must be activated by an admin.</p>
            <Button variant="outline" onClick={async () => { await logout(); router.push("/login"); }}>
              <LogOut className="w-4 h-4 mr-1" style={{ color: '#E398CA' }} /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-40">
        <Sidebar pathname={pathname} />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:pl-64">
        {/* Mobile header */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-30 flex items-center justify-between px-4">
          <Link href="/buyer/catalog" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E398CA] to-[#fce4ec] flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: '#1f1a1d' }}>INVENTRACK</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2">
              {theme === "dark" ? <Sun className="w-4 h-4" style={{ color: '#E398CA' }} /> : <Moon className="w-4 h-4" style={{ color: '#E398CA' }} />}
            </button>
            <button onClick={() => setMobileOpen(true)} className="p-2">
              <Menu className="w-4 h-4" style={{ color: '#E398CA' }} />
            </button>
            {mobileOpen && (
              <>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
                <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 z-50">
                  <Sidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="pt-14 md:pt-0 pb-20 md:pb-0">{children}</div>

        {/* Mobile nav */}
        <MobileNav pathname={pathname} />
      </main>
    </div>
  );
}