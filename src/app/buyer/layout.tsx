"use client";

import Mark from "@/components/Mark";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingBag, ClipboardList, Heart, MessageCircle, User, LogOut, Sun, Moon, ShoppingCart } from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/dataService";
import { spring } from "@/lib/motion";

const links = [
  { href: "/buyer/catalog", label: "Catalog", icon: ShoppingBag },
  { href: "/buyer/cart", label: "Cart", icon: ShoppingCart },
  { href: "/buyer/orders", label: "My Orders", icon: ClipboardList },
  { href: "/buyer/favorites", label: "Favorites", icon: Heart },
  { href: "/buyer/messages", label: "Messages", icon: MessageCircle },
  { href: "/buyer/profile", label: "Profile", icon: User },
];

function NavItem({
  href, label, icon: Icon, active, badge, onNavigate, layoutId,
}: {
  href: string; label: string; icon: typeof ShoppingBag; active: boolean; badge?: number; onNavigate?: () => void; layoutId: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
        active ? "text-white font-semibold" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-md bg-primary shadow-[0_8px_20px_-8px_var(--brand-1)]" />
      )}
      {!active && <span className="absolute inset-0 rounded-md group-hover:bg-secondary transition-colors" />}
      <span className="relative"><Icon className="w-[18px] h-[18px] transition-transform group-hover:scale-110" /></span>
      <span className="relative flex-1">{label}</span>
      {badge ? <span className="relative text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-destructive text-white">{badge}</span> : null}
    </Link>
  );
}

function Sidebar({ pathname, onNavigate, unread, cartCount }: { pathname: string; onNavigate?: () => void; unread: number; cartCount: number }) {
  const { toggleTheme, theme } = useTheme();
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center px-5 shrink-0">
        <Link href="/buyer/catalog" className="flex items-center gap-3 group" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shadow-[0_6px_16px_-6px_var(--brand-1)]">
            <Mark className="h-6 w-6 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Invems</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {links.map((l) => (
          <NavItem
            key={l.href}
            {...l}
            active={pathname === l.href}
            badge={l.href === "/buyer/messages" ? unread : l.href === "/buyer/cart" ? cartCount : undefined}
            onNavigate={onNavigate}
            layoutId="buyer-nav-active"
          />
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
        >
          {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </div>
  );
}

function MobileNav({ pathname, unread, cartCount }: { pathname: string; unread: number; cartCount: number }) {
  // Compact bottom bar — 5 primary destinations.
  const mobileLinks = links.filter((l) => l.href !== "/buyer/profile");
  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around py-1.5">
        {mobileLinks.map((l) => {
          const active = pathname === l.href;
          const badge = l.href === "/buyer/messages" ? unread : l.href === "/buyer/cart" ? cartCount : 0;
          return (
            <Link key={l.href} href={l.href} className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
              <div className="relative">
                <l.icon className="w-5 h-5" />
                {badge ? <span className="absolute -top-1.5 -right-2 text-[8px] font-bold px-1 py-px rounded-sm bg-destructive text-white min-w-[14px] text-center">{badge}</span> : null}
              </div>
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
  const { items: cartItems } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const cartCount = cartItems?.length || 0;

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
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || userRole !== "buyer") return null;

  if (userActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">Account pending activation</h2>
            <p className="text-sm text-muted-foreground">Your buyer account must be activated by an admin.</p>
            <Button variant="outline" onClick={async () => { await logout(); router.push("/login"); }}>
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-40">
        <Sidebar pathname={pathname} unread={unreadCount} cartCount={cartCount} />
      </aside>

      <main className="flex-1 md:pl-64 w-full min-w-0">
        {/* Mobile header */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 glass border-b border-border z-30 flex items-center justify-between px-4">
          <Link href="/buyer/catalog" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Mark className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-sm">Invems</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/buyer/profile" className="p-2 rounded-lg hover:bg-secondary transition-colors"><User className="w-4 h-4" /></Link>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Fade only — a transform here would break position:fixed drawers/modals. */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pt-14 md:pt-0 pb-24 md:pb-0"
        >
          {children}
        </motion.div>

        <MobileNav pathname={pathname} unread={unreadCount} cartCount={cartCount} />
      </main>
    </div>
  );
}
