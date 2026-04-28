"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Loader2, ShoppingBag, ClipboardList, Heart, MessageCircle,
  User, LogOut, Sun, Moon, Menu, Boxes, X, ShoppingCart,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/buyer/catalog",   label: "Catalog",    icon: ShoppingBag },
  { href: "/buyer/orders",    label: "My Orders",  icon: ClipboardList },
  { href: "/buyer/cart",      label: "Cart",       icon: ShoppingCart },
  { href: "/buyer/favorites", label: "Favorites",  icon: Heart },
  { href: "/buyer/messages",  label: "Messages",   icon: MessageCircle },
  { href: "/buyer/profile",   label: "Profile",    icon: User },
];

function NavLink({
  href, label, icon: Icon, active, badge, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; badge?: number; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
        }`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function Sidebar({ pathname, cartCount, onNavigate }: {
  pathname: string; cartCount: number; onNavigate?: () => void;
}) {
  const { toggleTheme, theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-border">
        <Link href="/buyer/catalog" className="flex items-center gap-3 group" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Boxes className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest text-foreground">Invems</span>
            <div className="text-[10px] text-muted-foreground tracking-wide">Buyer Portal</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        <div className="px-3 mb-3">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Navigation</p>
        </div>
        {links.map((l) => (
          <NavLink
            key={l.href}
            {...l}
            active={pathname === l.href || (l.href !== "/buyer/catalog" && pathname.startsWith(l.href))}
            badge={l.href === "/buyer/cart" ? cartCount : undefined}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 text-primary" />
            : <Moon className="w-4 h-4 text-primary" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function MobileNav({ pathname, cartCount }: { pathname: string; cartCount: number }) {
  const mobileLinks = [
    { href: "/buyer/catalog",   label: "Shop",    icon: ShoppingBag },
    { href: "/buyer/orders",    label: "Orders",  icon: ClipboardList },
    { href: "/buyer/cart",      label: "Cart",    icon: ShoppingCart, badge: cartCount },
    { href: "/buyer/favorites", label: "Saved",   icon: Heart },
    { href: "/buyer/profile",   label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {mobileLinks.map((l) => {
          const active = pathname === l.href || (l.href !== "/buyer/catalog" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <l.icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{l.label}</span>
              {l.badge != null && l.badge > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {l.badge > 9 ? "9+" : l.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, userActive, loading, logout } = useAuth();
  const { theme, toggleTheme, setAccent } = useTheme();
  const { count: cartCount } = useCart();

  // Force neutral theme — clear any saved pink accent
  useEffect(() => {
    setAccent("neutral");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);


  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && userRole !== "buyer") router.push("/dashboard");
  }, [loading, user, userRole, router]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== "buyer") return null;

  if (userActive === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full card-luxury p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Account pending activation</h2>
          <p className="text-sm text-muted-foreground">
            Your buyer account must be activated by an admin before you can access the portal.
          </p>
          <Button
            variant="outline"
            onClick={async () => { await logout(); router.push("/login"); }}
            className="mt-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-40">
        <Sidebar pathname={pathname} cartCount={cartCount} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 z-50 md:hidden">
            <Sidebar pathname={pathname} cartCount={cartCount} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="md:pl-64">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 h-14 bg-card/95 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4">
          <Link href="/buyer/catalog" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Boxes className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-wider text-foreground">Invems</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/buyer/cart" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="pb-20 md:pb-0 min-h-screen">{children}</div>

        {/* Mobile bottom nav */}
        <MobileNav pathname={pathname} cartCount={cartCount} />
      </main>
    </div>
  );
}
