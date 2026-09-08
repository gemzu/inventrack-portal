"use client";

/**
 * Blacklist — codes that must not be scanned in.
 *
 * The list itself is CodeList, shared with the whitelist: the two screens were
 * the same thing with the colours flipped, and keeping them as one component
 * stops them drifting apart again. This file is now just the data.
 */

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import CodeList, { type CodeRow } from "@/components/console/CodeList";

export default function BlacklistPage() {
  const { orgId } = useAuth();
  const [items, setItems] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from("blacklist").select("*").eq("org_id", orgId);
    setItems(
      (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        barcode: (row.barcode as string) || "",
        label: row.label as string | undefined,
        reason: row.reason as string | undefined,
        createdAt: row.created_at,
      }))
    );
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const add = async (v: { barcode: string; label: string; reason: string }) => {
    if (!orgId) return;
    try {
      const { error } = await supabase.from("blacklist").insert({
        barcode: v.barcode, label: v.label, reason: v.reason, org_id: orgId,
      });
      if (error) throw error;
      await load();
      toast("Code blocked", "success");
    } catch {
      toast("Failed to add barcode", "error");
    }
  };

  const remove = async (row: CodeRow) => {
    try {
      const { error } = await supabase.from("blacklist").delete().eq("id", row.id);
      if (error) throw error;
      await load();
      toast("Code unblocked", "success");
    } catch {
      toast("Failed to remove barcode", "error");
    }
  };

  return (
    <AdminGuard>
      <PageShell
        title="Blacklist"
        subtitle="Codes the floor should refuse."
      >
        <CodeList
          rows={items}
          loading={loading}
          icon={Ban}
          figureLabel="Codes blocked"
          note="A blocked code cannot be scanned in or submitted. Use it for recalled stock, counterfeits, and anything that keeps arriving by mistake."
          addTitle="Block a code"
          addSubtitle="It will be refused everywhere"
          emptyTitle="Nothing blocked"
          emptyDescription="Add a code here to stop it being scanned or submitted."
          searchPlaceholder="Barcode or label"
          reasonPlaceholder="Why is this blocked?"
          formatWhen={(v) => formatDate(v as string)}
          onAdd={add}
          onRemove={remove}
        />
      </PageShell>
    </AdminGuard>
  );
}
