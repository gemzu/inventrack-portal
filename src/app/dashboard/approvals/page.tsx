"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  const handleApprove = async (item: ApprovalDoc) => {
    setActionId(item.id);
    try {
      // Insert into inventory
      const { error: insertErr } = await supabase.from("inventory").insert({
        model_id: item.modelId,
        part_number: item.partNumber,
        brand: item.brand,
        quantity: item.quantity,
        type: item.type,
        barcode: item.barcode,
        status: "available",
        org_id: orgId,
      });
      if (insertErr) throw insertErr;

      // Delete from approvals
      const { error: delErr } = await supabase.from("approvals").delete().eq("id", item.id);
      if (delErr) throw delErr;

      toast("Item approved and added to inventory", "success");
    } catch (err) {
      console.error("Approve error:", err);
      toast("Failed to approve item", "error");
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
      for (const item of eligible) {
        await handleApprove(item);
      }
      toast(`Auto-approved ${eligible.length} item${eligible.length === 1 ? "" : "s"}`, "success");
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
      <PageShell title="Approvals" subtitle="Reading the queue." eyebrow="Console">
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
      eyebrow="Console"
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
                    <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {item.barcode || detail || "No detail given"}
                      {item.barcode && detail ? ` · ${detail}` : ""}
                    </p>
                  </div>

                  <span className="mono hidden w-16 shrink-0 text-right text-sm font-semibold tabular-nums md:block">
                    {item.quantity ?? "—"}
                  </span>
                  <span className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground lg:block">
                    {item.submittedBy || "unknown"}
                  </span>

                  <div className="flex w-32 shrink-0 items-center justify-end gap-3">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={busy}
                      className="mono text-[11px] uppercase tracking-[0.16em] text-success transition-colors duration-300 hover:text-foreground disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={busy}
                      className="mono text-[11px] uppercase tracking-[0.16em] text-destructive transition-colors duration-300 hover:text-foreground disabled:opacity-40"
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
