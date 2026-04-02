"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import AdminGuard from "@/components/AdminGuard";
import { ClipboardCheck, Check, X } from "lucide-react";

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
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approvals</h1>

      {approvals.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No Pending Approvals"
          description="All submitted items have been reviewed. New submissions from buyers will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvals.map((item) => {
            const busy = actionId === item.id;
            return (
              <div key={item.id} className="glass-card p-5 flex flex-col gap-3">
                <h3 className="font-semibold text-sm truncate">
                  {item.modelId || item.partNumber || "Unnamed Item"}
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {item.brand && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
                      {item.brand}
                    </span>
                  )}
                  {item.quantity != null && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
                      Qty: {item.quantity}
                    </span>
                  )}
                  {item.type && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
                      {item.type}
                    </span>
                  )}
                  {item.barcode && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
                      {item.barcode}
                    </span>
                  )}
                </div>

                {item.submittedBy && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Submitted by {item.submittedBy}
                  </p>
                )}

                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
                    style={{ background: "#16a34a" }}
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
                    style={{ background: "#dc2626" }}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
