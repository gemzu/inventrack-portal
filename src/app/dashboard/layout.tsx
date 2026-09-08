"use client";

/**
 * The console shell.
 *
 * Rebuilt on the public site's language rather than on the admin-template
 * shape it had: a numbered rail instead of pill navigation, a header that
 * carries a live readout and one INDEX toggle instead of a row of icon
 * buttons, and the site's own bay door for finding anything.
 *
 * The header is deliberately the same object as the marketing header — same
 * height, same hairline, same toggle with its two stacked labels and its plus
 * rotating into a cross — because signing in should feel like walking further
 * into the same building, not like arriving at a different one.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Mark from "@/components/Mark";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/components/Toast";
import PageLoader from "@/components/PageLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getNotifications, getUnreadNotificationCount } from "@/lib/dataService";
import ConsoleRail from "@/components/console/ConsoleRail";
import ConsoleIndex from "@/components/console/ConsoleIndex";
import { activeHref, flatten, visibleSections } from "@/components/console/nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user, userName, userRole, userActive, userPermissions, orgId, orgData, loading, logout,
  } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPreview, setNotifPreview] = useState<Array<Record<string, unknown>>>([]);

  const sections = useMemo(
    () => visibleSections(userRole, userPermissions),
    [userRole, userPermissions]
  );
  const dests = useMemo(() => flatten(sections), [sections]);
  const here = useMemo(() => {
    const href = activeHref(pathname, dests);
    return dests.find((d) => d.href === href) || null;
  }, [pathname, dests]);

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

  /* The index answers the shortcut people already try for search. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIndexOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeIndex = useCallback(() => setIndexOpen(false), []);

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

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) return <PageLoader />;
  if (!user) return null;

  /* A buyer whose account has not been switched on yet. Kept as a plain
     hairline panel rather than a card with an icon in a coloured square. */
  if (userRole === "buyer" && userActive === false) {
    return (
      <div className="console flex min-h-screen items-center justify-center px-6">
        <div className="panel panel-live max-w-md p-8 text-center">
          <Mark className="mx-auto h-9 w-9 text-[var(--brand-2)]" />
          <h2 className="font-display mt-5 text-lg font-bold uppercase tracking-[-0.01em]">
            Account pending
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is waiting on activation. Your admin can switch it on.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 rounded-md border border-border px-4 py-2 text-[12px] transition-colors duration-300 hover:border-[var(--brand-2)]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const orgName = (orgData as { name?: string } | null)?.name ?? null;

  return (
    <div className="console flex min-h-screen bg-background text-foreground">

      <aside className="sticky top-0 hidden h-screen w-[16.5rem] shrink-0 lg:block">
        <ConsoleRail
          sections={sections}
          pathname={pathname}
          userName={userName}
          userRole={userRole}
          orgName={orgName}
          onLogout={handleLogout}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Header. The site's header, with a live readout in it. ── */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-6 px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger className="rounded-md p-1.5 transition-colors duration-300 hover:text-[var(--brand-2)] lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open navigation</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-r border-border p-0">
                  <ConsoleRail
                    sections={sections}
                    pathname={pathname}
                    userName={userName}
                    userRole={userRole}
                    orgName={orgName}
                    onNavigate={() => setSheetOpen(false)}
                    onLogout={handleLogout}
                  />
                </SheetContent>
              </Sheet>

              {/* Where you are, and what that place is for. The readout is
                  keyed on the route so it re-enters on every navigation. */}
              <div className="feed-window min-w-0">
                <p key={pathname} className="feed-line flex min-w-0 items-baseline gap-3">
                  <span className="font-display shrink-0 text-[13px] font-bold uppercase tracking-[0.06em]">
                    {here?.label || "Console"}
                  </span>
                  <span className="hidden truncate text-[12px] text-muted-foreground sm:inline">
                    {here?.meta || "Signed in"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="rounded-md p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>

              <div className="relative">
                <button
                  onClick={openNotifications}
                  aria-label="Notifications"
                  className="relative rounded-md p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {unreadCount > 0 ? (
                    <span className="pulse-dot absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-3)]" />
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="panel panel-live absolute right-0 z-40 mt-2 w-80 bg-popover backdrop-blur-xl">
                    <p className="mono border-b border-border px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Notifications
                    </p>
                    <div className="max-h-80 overflow-y-auto">
                      {notifPreview.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted-foreground">Nothing recent.</p>
                      ) : (
                        notifPreview.map((n, i) => (
                          <Link
                            key={`${n.id || i}`}
                            href="/dashboard/notifications"
                            onClick={() => setNotifOpen(false)}
                            className="row-line block px-4 py-3"
                          >
                            <p className="truncate text-sm font-medium">
                              {String(n.title || n.type || "Notification")}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {String(n.body || n.message || "")}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* The site's own toggle, unchanged in gesture. */}
              <button
                type="button"
                onClick={() => setIndexOpen((v) => !v)}
                aria-expanded={indexOpen}
                aria-controls="console-index"
                className="index-toggle group ml-1 flex items-center gap-3"
              >
                <span className="relative block h-4 w-14 overflow-hidden">
                  <span className="index-toggle__labels block" data-open={indexOpen}>
                    <span className="block h-4 text-[13px] font-bold">
                      Index
                    </span>
                    <span className="block h-4 text-[13px] font-bold">
                      Close
                    </span>
                  </span>
                </span>
                <span
                  className="index-toggle__glyph flex h-8 w-8 items-center justify-center rounded-md border border-border"
                  data-open={indexOpen}
                >
                  <span className="block h-px w-3.5 bg-foreground" />
                  <span className="absolute block h-px w-3.5 bg-foreground" />
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <ConsoleIndex
        open={indexOpen}
        onClose={closeIndex}
        role={userRole}
        permissions={userPermissions}
        orgId={orgId}
      />
    </div>
  );
}
