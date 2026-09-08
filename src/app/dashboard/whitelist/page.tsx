"use client";

/**
 * Whitelist — codes that are always allowed through.
 *
 * Shares CodeList with the blacklist; see the note there. This file is the
 * data and the wording.
 */

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getWhitelist, addToWhitelist, removeFromWhitelist } from "@/lib/dataService";
import { ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import CodeList, { type CodeRow } from "@/components/console/CodeList";

export default function WhitelistPage() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getWhitelist(orgId);
      setItems(data as unknown as CodeRow[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load whitelist", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (v: { barcode: string; label: string; reason: string }) => {
    if (!orgId) return;
    try {
      await addToWhitelist(orgId, {
        barcode: v.barcode,
        label: v.label || undefined,
        reason: v.reason || undefined,
      });
      toast("Code trusted", "success");
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to add", "error");
    }
  };

  const remove = async (row: CodeRow) => {
    try {
      await removeFromWhitelist(row.id);
      load();
      toast("Removed", "success");
    } catch (e) {
      toast((e as Error).message || "Failed to remove", "error");
    }
  };

  return (
    <AdminGuard>
      <PageShell
        title="Whitelist"
        subtitle="Codes the floor should always accept."
      >
        <CodeList
          rows={items}
          loading={loading}
          icon={ShieldCheck}
          figureLabel="Codes trusted"
          note="A trusted code skips the blacklist and the scanning warnings. Use it sparingly — it is an override, and overrides are how bad stock gets in."
          addTitle="Trust a code"
          addSubtitle="It will skip every check"
          emptyTitle="Nothing trusted"
          emptyDescription="Codes added here bypass the blacklist and scanning warnings."
          searchPlaceholder="Barcode or label"
          reasonPlaceholder="Why does this need an override?"
          formatWhen={(v) => formatDate(v as string)}
          onAdd={add}
          onRemove={remove}
        />
      </PageShell>
    </AdminGuard>
  );
}
