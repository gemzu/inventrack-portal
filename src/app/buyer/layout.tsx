"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingBag, ClipboardList, Heart, MessageCircle, User, LogOut } from "lucide-react";

const links = [
  { href: "/buyer/catalog", label: "Catalog", icon: ShoppingBag },
  { href: "/buyer/orders", label: "My Orders", icon: ClipboardList },
  { href: "/buyer/favorites", label: "Favorites", icon: Heart },
  { href: "/buyer/messages", label: "Messages", icon: MessageCircle },
  { href: "/buyer/profile", label: "Profile", icon: User },
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, userActive, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && userRole !== "buyer") router.push("/dashboard");
  }, [loading, user, userRole, router]);

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
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
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
      <aside className="hidden md:block w-64 border-r bg-card/40">
        <div className="p-4 border-b font-semibold">INVENTRACK Buyer</div>
        <nav className="p-2 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                pathname === l.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

