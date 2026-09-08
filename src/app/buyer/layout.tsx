"use client";

/**
 * The buyer shell.
 *
 * Same rebuild as the console, on the same reasoning: it was a violet pill
 * sliding between six icon rows, with a glass bottom bar on mobile. Buyers see
 * the marketing site first and this second, so the two should be the same
 * building.
 *
 * The rail is the site's index, minus the ordinals. Counts that matter — unread messages, what
 * is in the cart — are printed as figures beside the destination rather than
 * as red discs, because a number you can read is more use than a dot you have
 * to open something to understand.
 */

import Mark from "@/components/Mark";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import {
  ShoppingBag, ClipboardList, Heart, MessageCircle, User, LogOut, Sun, Moon, ShoppingCart,
} from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/dataService";
import PageLoader from "@/components/PageLoader";

const LINKS = [
  { href: "/buyer/catalog", label: "Catalog", icon: ShoppingBag, meta: "What is available to order" },
  { href: "/buyer/cart", label: "Cart", icon: ShoppingCart, meta: "Ready to send" },
  { href: "/buyer/orders", label: "Orders", icon: ClipboardList, meta: "What you have placed" },
  { href: "/buyer/favorites", label: "Saved", icon: Heart, meta: "Kept for later" },
  { href: "/buyer/messages", label: "Messages", icon: MessageCircle, meta: "Talk to the supplier" },
  { href: "/buyer/profile", label: "Profile", icon: User, meta: "Your details" },
];

function countFor(href: string, unread: number, cart: number) {
  if (href === "/buyer/messages") return unread;
  if (href === "/buyer/cart") return cart;
  return 0;
}

function Rail({
  pathname, unread, cartCount, onNavigate, onLogout,
}: {
  pathname: string;
  unread: number;
  cartCount: number;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const { toggleTheme, theme } = useTheme();
  return (
    <div className="flex h-full flex-col border-r border-border bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <Link href="/buyer/catalog" onClick={onNavigate} className="group flex items-center gap-2.5">
          <Mark className="h-6 w-6 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.02em]">
            Invems
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6">
        <p className="rail-group__label mb-2.5">Buying</p>
        <ul>
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const count = countFor(l.href, unread, cartCount);
            return (
              <li key={l.href} className="reveal-line">
                <span className="reveal-line__inner block">
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    className="rail-link"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <l.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-[13.5px] font-medium">{l.label}</span>
                    </span>
                    {count > 0 && (
                      <span className="mono shrink-0 text-[11px] tabular-nums text-[var(--brand-2)]">
                        {count}
                      </span>
                    )}
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
        <button
          onClick={toggleTheme}
          className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          onClick={onLogout}
          className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-destructive"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </div>
  );
}

/* Mobile keeps a bottom bar, because reaching a rail one-handed on a phone is
   worse than any amount of consistency is worth. It carries the same lit
   hairline as the rail rather than a filled tab. */
function BottomBar({
  pathname, unread, cartCount,
}: {
  pathname: string;
  unread: number;
  cartCount: number;
}) {
  const items = LINKS.filter((l) => l.href !== "/buyer/profile");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
      <div className="flex items-stretch justify-around">
        {items.map((l) => {
          const active = pathname === l.href;
          const count = countFor(l.href, unread, cartCount);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors duration-300 ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className={`absolute inset-x-4 top-0 h-px origin-center bg-[linear-gradient(to_right,var(--brand-1),var(--brand-3))] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.30,1)] ${
                  active ? "scale-x-100" : "scale-x-0"
                }`}
              />
              <span className="relative">
                <l.icon className="h-4 w-4" />
                {count > 0 && (
                  <span className="mono absolute -right-2.5 -top-1.5 text-[9px] tabular-nums text-[var(--brand-2)]">
                    {count}
                  </span>
                )}
              </span>
              <span className="mono text-[9px] uppercase tracking-[0.14em]">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) return <PageLoader />;
  if (!user || userRole !== "buyer") return null;

  if (userActive === false) {
    return (
      <div className="console flex min-h-screen items-center justify-center px-6">
        <div className="panel panel-live max-w-md p-8 text-center">
          <Mark className="mx-auto h-9 w-9 text-[var(--brand-2)]" />
          <h2 className="font-display mt-5 text-lg font-bold uppercase tracking-[-0.01em]">
            Account pending
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A supplier admin has to switch your account on before you can order.
          </p>
          <button
            onClick={handleLogout}
            className="mono mt-6 rounded-md border border-border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[var(--brand-2)]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const here = LINKS.find((l) => pathname === l.href || pathname.startsWith(l.href + "/"));

  return (
    <div className="console flex min-h-screen bg-background text-foreground">

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] md:block">
        <Rail
          pathname={pathname}
          unread={unreadCount}
          cartCount={cartCount}
          onLogout={handleLogout}
        />
      </aside>

      <main className="w-full min-w-0 flex-1 md:pl-[16.5rem]">
        {/* Mobile header, matching the site's bar. */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur-xl md:hidden">
          <Link href="/buyer/catalog" className="flex items-center gap-2.5">
            <Mark className="h-5 w-5" />
            <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.02em]">
              Invems
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/buyer/profile"
              aria-label="Profile"
              className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              <User className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        {/* Desktop readout bar: where you are, and what it is for. */}
        <header className="sticky top-0 z-30 hidden h-14 items-center border-b border-border bg-background/80 px-8 backdrop-blur-xl md:flex">
          <p key={pathname} className="feed-line flex items-baseline gap-3">
            <span className="font-display text-[13px] font-bold uppercase tracking-[0.06em]">
              {here?.label || "Buying"}
            </span>
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {here?.meta || "Signed in"}
            </span>
          </p>
        </header>

        <div className="relative pb-24 pt-14 md:pb-10 md:pt-0">
          <span className="bay-wipe" aria-hidden key={`wipe-${pathname}`} />
          <div className="bay-in" key={pathname}>
            {children}
          </div>
        </div>

        <BottomBar pathname={pathname} unread={unreadCount} cartCount={cartCount} />
      </main>
    </div>
  );
}
