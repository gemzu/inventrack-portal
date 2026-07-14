"use client";
import AdminGuard from "@/components/AdminGuard";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrg, regenerateInviteCode } from "@/lib/dataService";
import { Copy, RefreshCw, Share2, Ticket } from "lucide-react";
import PageShell from "@/components/page-shell";
import GlassCard from "@/components/glass-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import { isSuperadmin } from "@/lib/roles";

type Kind = "admin" | "worker" | "buyer";

export default function InvitesPage() {
  const { orgId, userPermissions } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState<Kind>("admin");
  const [codes, setCodes] = useState<{ admin?: string; worker?: string; buyer?: string }>({});
  const [loading, setLoading] = useState(true);
  const [regenBusy, setRegenBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const org = await getOrg(orgId) as { adminInviteCode?: string; workerInviteCode?: string; inviteCode?: string };
      setCodes({
        admin: org.adminInviteCode,
        worker: org.workerInviteCode,
        buyer: org.inviteCode,
      });
    } catch (e) {
      toast((e as Error).message || "Failed to load codes", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const currentCode = codes[active] || "— not set —";

  const handleCopy = async () => {
    if (!codes[active]) return;
    try {
      await navigator.clipboard.writeText(codes[active]!);
      toast("Copied to clipboard", "success");
    } catch {
      toast("Copy failed", "error");
    }
  };

  const handleShare = async () => {
    const code = codes[active];
    if (!code) return;
    const text = `Join our Invems organization with code: ${code}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: { text: string }) => Promise<void> }).share({ text });
      } catch { /* user cancelled */ }
    } else {
      const nav = globalThis.navigator as Navigator;
      await nav.clipboard.writeText(text);
      toast("Share text copied", "success");
    }
  };

  const handleRegenerate = async () => {
    if (!orgId) return;
    if (active !== "buyer" && !isSuperadmin(userPermissions)) {
      toast("Only super admins can regenerate staff codes", "error");
      return;
    }
    setRegenBusy(true);
    try {
      const { code } = await regenerateInviteCode(orgId, active);
      setCodes((prev) => ({ ...prev, [active]: code }));
      toast(`${labelFor(active)} code regenerated`, "success");
    } catch (e) {
      toast((e as Error).message || "Failed to regenerate", "error");
    } finally {
      setRegenBusy(false);
    }
  };

  return (
    <AdminGuard>
      <PageShell
        title="Invite Codes"
        subtitle="Share these codes with new members so they join this organization."
      >
        <div className="flex gap-2 flex-wrap">
          {(["admin", "worker", "buyer"] as Kind[]).map((k) => (
            <Button
              key={k}
              variant={active === k ? "default" : "outline"}
              onClick={() => setActive(k)}
            >
              {labelFor(k)}
            </Button>
          ))}
        </div>

        <GlassCard>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{labelFor(active)} invite code</h3>
                <Badge variant="secondary">{active}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {descFor(active)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 flex items-center justify-between gap-3">
            <code className="font-mono text-xl sm:text-2xl tracking-wider truncate">
              {loading ? "…" : currentCode}
            </code>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy">
                <Copy />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleShare} aria-label="Share">
                <Share2 />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={handleRegenerate} disabled={regenBusy}>
              <RefreshCw /> {regenBusy ? "Regenerating..." : "Regenerate code"}
            </Button>
          </div>
        </GlassCard>

        <Card><CardContent className="p-6 space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">How it works:</strong> new members enter their code on signup in the mobile app or on the web portal signup page. Their role is set automatically based on which code they used.</p>
          <p><strong className="text-foreground">Regenerating a code</strong> invalidates the previous one. Existing members are not affected.</p>
        </CardContent></Card>
      </PageShell>
    </AdminGuard>
  );
}

function labelFor(k: Kind) {
  return k === "admin" ? "Admin" : k === "worker" ? "Worker" : "Buyer";
}
function descFor(k: Kind) {
  if (k === "admin") return "Gives the new member full admin access. Share only with trusted staff.";
  if (k === "worker") return "Warehouse / floor staff who can scan, submit, and fulfil.";
  return "Customers who shop through your connected storefronts.";
}
