"use client";

/**
 * Invite codes.
 *
 * The code is the entire point of this screen, so it is set at display size —
 * the way a figure is set everywhere else in the console — instead of sitting
 * in a grey inset box beside an icon in a tinted tile.
 *
 * Which code you are looking at is the segmented control, not three buttons
 * where one happens to be filled.
 */

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getOrg, regenerateInviteCode } from "@/lib/dataService";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { isSuperadmin } from "@/lib/roles";
import { Panel, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Segmented } from "@/components/console/controls";

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
      const org = (await getOrg(orgId)) as {
        adminInviteCode?: string; workerInviteCode?: string; inviteCode?: string;
      };
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

  const currentCode = codes[active];

  const handleCopy = async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      toast("Copied to clipboard", "success");
    } catch {
      toast("Copy failed", "error");
    }
  };

  const handleShare = async () => {
    if (!currentCode) return;
    const text = `Join our Invems organization with code: ${currentCode}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: { text: string }) => Promise<void> }).share({ text });
      } catch {
        /* the person cancelled the share sheet */
      }
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
        title="Invite codes"
        eyebrow="Console"
        subtitle="New members enter one of these when they sign up. Which code they used sets what they can do."
      >
        <div className="space-y-8">
          <Segmented
            value={active}
            onChange={setActive}
            options={[
              { value: "admin", label: "Admin" },
              { value: "worker", label: "Worker" },
              { value: "buyer", label: "Buyer" },
            ]}
          />

          <Panel className="reveal p-8" live>
            <p className="mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {labelFor(active)} code
            </p>

            {loading ? (
              <CrateSkeleton className="mt-4 h-12 w-72 border-0" />
            ) : (
              <p className="font-display mt-3 break-all text-[1.8rem] font-bold uppercase leading-none tracking-[0.06em] sm:text-[2.6rem]">
                {currentCode || "Not set"}
              </p>
            )}

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {descFor(active)}
            </p>

            <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
              <Action onClick={handleCopy} disabled={!currentCode}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Action>
              <Action onClick={handleShare} disabled={!currentCode}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Action>
              <Action onClick={handleRegenerate} disabled={regenBusy} className="ml-auto">
                <RefreshCw className={`h-3.5 w-3.5 ${regenBusy ? "animate-spin" : ""}`} />
                {regenBusy ? "Regenerating" : "Regenerate"}
              </Action>
            </div>
          </Panel>

          <div className="reveal d1 space-y-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">How it works.</span> New members enter their code
              when signing up, in the app or on the portal. Their role is set from the code they
              used, so send the right one.
            </p>
            <p>
              <span className="text-foreground">Regenerating.</span> The previous code stops working
              immediately. People who already joined are unaffected.
            </p>
          </div>
        </div>
      </PageShell>
    </AdminGuard>
  );
}

function labelFor(k: Kind) {
  return k === "admin" ? "Admin" : k === "worker" ? "Worker" : "Buyer";
}

function descFor(k: Kind) {
  if (k === "admin") return "Full admin access to this organization. Share only with people you trust with everything.";
  if (k === "worker") return "Floor staff: they can scan, submit, and fulfil, but not change how the organization is set up.";
  return "Customers who order through your connected storefronts.";
}
