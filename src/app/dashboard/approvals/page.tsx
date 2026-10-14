"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addStock } from "@/lib/stock";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import EmptyState from "@/components/EmptyState";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { ClipboardCheck } from "lucide-react";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action } from "@/components/console/controls";

interface ApprovalDoc {
  id: string;
  modelId?: string;
  partNumber?: string;
  brand?: string;
  quantity?: number;
  type?: string;
  barcode?: string;
  submittedBy?: string;
  orgId?: string;
  [key: string]: unknown;
}

function mapApproval(row: Record<string, unknown>): ApprovalDoc {
  return {
    id: row.id as string,
    modelId: row.model_id as string | undefined,
    partNumber: row.part_number as string | undefined,
    brand: row.brand as string | undefined,
    quantity: row.quantity as number | undefined,
    type: row.type as string | undefined,
    barcode: row.barcode as string | undefined,
    submittedBy: row.submitted_by as string | undefined,
    orgId: row.org_id as string | undefined,
    kind: row.kind as string | undefined,
    imageUrls: (Array.isArray(row.image_urls) ? row.image_urls : []).filter((u) => typeof u === "string" && (u as string).startsWith("https://")) as string[],
    note: row.note as string | undefined,
  };
}

export default function ApprovalsPage() {
  return (
    <AdminGuard>
      <ApprovalsContent />
    </AdminGuard>
  );
}

function ApprovalsContent() {
  const { orgId, orgData } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoApproveThreshold = orgData?.lowStockThreshold || 2;

  useEffect(() => {
    if (!orgId) return;

    // Initial fetch
    const fetchApprovals = async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "pending");
      if (!error) {
        setApprovals((data || []).map(mapApproval));
      }
      setLoading(false);
    };
    fetchApprovals();

    // Realtime subscription
    const channel = supabase
      .channel("approvals-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approvals",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Re-fetch on any change
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  /* Approve the way the app does (screens/ApprovalsScreen.js):
     1. Claim it: pending -> approved, only if still pending, so a double
        click, auto-approve or a colleague in the app cannot add it twice.
     2. Add the stock. A barcode already in stock is added to that row:
        stock is unique per company and barcode (unique_org_barcode), and
        this page always inserted a new row - so approving anything already
        in stock failed with a duplicate-key error (reported 2026-10-14;
        30 of one customer's pending items were already in stock).
     3. Remove the submission. If the stock could not be added, it goes
        back in the queue. */
  const handleApprove = async (item: ApprovalDoc, quiet = false): Promise<boolean> => {
    if (!orgId) return false;
    if (item.kind === "box") {
      toast("Box submissions are approved in the app for now (Approvals).", "info");
      return false;
    }
    setActionId(item.id);
    let claimed = false;
    try {
      const { data: won, error: claimErr } = await supabase
        .from("approvals")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("id");
      if (claimErr) throw claimErr;
      if (!won?.length) {
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
        if (!quiet) toast("Someone already decided this one", "info");
        return false;
      }
      claimed = true;

      /* src/lib/stock.ts: by barcode, else by model among barcode-less
         lines; checks every write. */
      const how = await addStock({
        orgId,
        barcode: item.barcode ? String(item.barcode) : null,
        modelId: item.modelId || null,
        quantity: Number(item.quantity),
        photos: (item.imageUrls as string[] | undefined) || [],
        fields: {
          category: item.type || null,
          description: item.note ? String(item.note).trim() : null,
        },
      });
      const existing = how === "restocked" ? [true] : null;

      await supabase.from("approvals").delete().eq("id", item.id);
      setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      if (!quiet) toast(existing && existing.length ? "Approved - added to the existing stock" : "Item approved and added to inventory", "success");
      return true;
    } catch (err) {
      console.error("Approve error:", err);
      if (claimed) {
        await supabase.from("approvals").update({ status: "pending" }).eq("id", item.id).eq("status", "approved");
      }
      const why = err instanceof Error ? err.message : String((err as { message?: string })?.message || err);
      toast(`Could not approve: ${why}`, "error");
      return false;
    } finally {
      setActionId(null);
    }
  };

  const runAutoApprove = async () => {
    if (!orgId) return;
    setAutoRunning(true);
    try {
      const eligible = approvals.filter((a) => (a.quantity || 0) > 0 && (a.quantity || 0) <= autoApproveThreshold);
      if (eligible.length === 0) {
        toast("No approvals matched automation rules", "info");
        return;
      }
      let done = 0;
      for (const item of eligible) {
        if (await handleApprove(item, true)) done += 1;
      }
      toast(`Auto-approved ${done} of ${eligible.length} item${eligible.length === 1 ? "" : "s"}`, done ? "success" : "error");
    } catch (err) {
      console.error("Auto-approve error:", err);
      toast("Failed to run automation", "error");
    } finally {
      setAutoRunning(false);
    }
  };

  const handleReject = async (item: ApprovalDoc) => {
    setActionId(item.id);
    try {
      const { error } = await supabase.from("approvals").update({ status: "rejected" }).eq("id", item.id);
      if (error) throw error;
      toast("Item rejected", "info");
    } catch (err) {
      console.error("Reject error:", err);
      toast("Failed to reject item", "error");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <PageShell title="Approvals" subtitle="Reading the queue.">
        <ListSkeleton rows={6} />
      </PageShell>
    );
  }

  const autoEligible = approvals.filter(
    (a) => (a.quantity || 0) > 0 && (a.quantity || 0) <= autoApproveThreshold
  ).length;

  return (
    <PageShell
      title="Approvals"
     
      subtitle="Submissions waiting on a decision before they become stock."
      actions={
        <Action onClick={runAutoApprove} disabled={autoRunning || approvals.length === 0}>
          {autoRunning ? "Running" : `Auto-approve ${autoApproveThreshold} or fewer`}
        </Action>
      }
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure
            label="Waiting"
            value={approvals.length}
            tone={approvals.length ? "brand" : undefined}
          />
          <Figure label="Auto-eligible" value={autoEligible} />
        </div>

        {approvals.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Queue is clear"
            description="Everything submitted has been reviewed. New submissions land here."
          />
        ) : (
          /* One line per submission rather than a card each: the queue is
             something you work down, and a grid of cards makes that harder,
             not easier. */
          <Panel className="reveal">
            <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
              <ColHead className="min-w-0 flex-1">Item</ColHead>
              <ColHead className="w-16 shrink-0 text-right">Qty</ColHead>
              <ColHead className="w-40 shrink-0">Submitted by</ColHead>
              <span className="w-32 shrink-0" />
            </div>

            {approvals.map((item) => {
              const busy = actionId === item.id;
              const detail = [item.brand, item.type].filter(Boolean).join(" · ");
              return (
                <div key={item.id} className="row-line flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.modelId || item.partNumber || "Unnamed item"}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {item.barcode || detail || "No detail given"}
                      {item.barcode && detail ? ` · ${detail}` : ""}
                    </p>
                  </div>

                  <span className="hidden w-16 shrink-0 text-right text-sm font-semibold tabular-nums md:block">
                    {item.quantity ?? "—"}
                  </span>
                  <span className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground lg:block">
                    {item.submittedBy || "unknown"}
                  </span>

                  <div className="flex w-32 shrink-0 items-center justify-end gap-3">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={busy}
                      className="text-[12px] text-success transition-colors duration-300 hover:text-foreground disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={busy}
                      className="text-[12px] text-destructive transition-colors duration-300 hover:text-foreground disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
    </PageShell>
  );
}
