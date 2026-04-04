"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  orders: "Orders",
  users: "Users",
  facilities: "Facilities",
  blacklist: "Blacklist",
  activity: "Activity",
  settings: "Settings",
  billing: "Billing",
  approvals: "Approvals",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const label = labelMap[seg] || seg;
        const isLast = i === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {isLast ? (
              <span className="font-semibold text-foreground">
                {label}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
