"use client";

/**
 * Invite codes — staff only.
 *
 * This screen used to offer three codes: admin, worker and buyer. The buyer one
 * did nothing.
 *
 * `join-org-secure` is the only thing that turns a code into access, and it
 * resolves exactly three cases: `organizations.admin_invite_code` → admin,
 * `organizations.worker_invite_code` → worker, and `storefronts.invite_code` →
 * buyer. It never reads `organizations.invite_code`, which is the column the
 * old Buyer tab wrote to and displayed. Handing that code to a customer would
 * have got them a "code not found", and regenerating it changed nothing.
 *
 * Buyers join a *storefront*, not the organization — that is the whole point of
 * storefronts, since the code decides which slice of stock they can see. So
 * this screen now covers staff, and points at Storefronts for customers.
 *
 * The dead column is left in the database rather than dropped here; removing it
 * is a migration, and nothing reads it.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getOrg, regenerateInviteCode } from "@/lib/dataService";
import { ArrowRight, Copy, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { isSuperadmin } from "@/lib/roles";
import { Panel, Rule, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Segmented } from "@/components/console/controls";

type Kind = "admin" | "worker";

export default function InvitesPage() {
  const { orgId, userPermissions } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState<Kind>("worker");
  const [codes, setCodes] = useState<{ admin?: string; worker?: string }>({});
  const [loading, setLoading] = useState(true);
  const [regenBusy, setRegenBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const org = (await getOrg(orgId)) as {
        adminInviteCode?: string;
        workerInviteCode?: string;
      };
      setCodes({ admin: org.adminInviteCode, worker: org.workerInviteCode });
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
    if (!isSuperadmin(userPermissions)) {
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
        subtitle="For staff joining this organization. Which code they use decides what they can do, so send the right one."
      >
        <div className="space-y-12">
          <Segmented
            value={active}
            onChange={setActive}
            options={[
              { value: "worker", label: "Worker" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <Panel className="reveal p-8" live>
            <ColHead className="block">{labelFor(active)} code</ColHead>

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

          {/* ── Where buyers actually come from ────────────────── */}
          <section className="space-y-5">
            <Rule label="Customers" />
            <Link
              href="/dashboard/storefronts"
              className="panel panel-hover reveal flex items-center justify-between gap-4 p-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">Buyers join a storefront, not the organization</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  A storefront carries its own code and its own filters, so the code you hand a
                  customer also decides which stock they can see. Create one there and share that
                  code instead.
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          </section>

          <div className="reveal d1 space-y-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">How it works.</span> Staff enter their code when
              signing up in the app. Their role comes from the code, not from anything they pick.
            </p>
            <p>
              <span className="text-foreground">Regenerating.</span> The old code stops working
              immediately. People who already joined are unaffected.
            </p>
          </div>
        </div>
      </PageShell>
    </AdminGuard>
  );
}

function labelFor(k: Kind) {
  return k === "admin" ? "Admin" : "Worker";
}

function descFor(k: Kind) {
  if (k === "admin") {
    return "Full control of this organization — stock, people, settings, and the codes on this page. Only send it to someone you would trust with all of it.";
  }
  return "Floor staff. They can scan, receive, count and fulfil, but cannot change how the organization is set up.";
}
