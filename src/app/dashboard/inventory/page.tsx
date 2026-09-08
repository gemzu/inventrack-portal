"use client";
import { itemIdentity } from "@/lib/itemIdentity";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Download, Package, Boxes, ChevronRight, Upload, Loader2, X, FileSpreadsheet, Save, Trash2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import Status from "@/components/Status";
import { Panel, Figure, Rule, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import {
  Action, Chip, Drawer, Field, Input, Modal, SearchInput, Segmented, Select,
} from "@/components/console/controls";

interface Item {
  id: string;
  modelId: string;
  barcode: string;
  displayName?: string;
  brand?: string;
  partNumber?: string;
  manufacturer?: string;
  description?: string;
  quantity: number;
  status: string;
  facilityId?: string;
  boxId?: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number | null;
  expiryDate?: string | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

function mapItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    modelId: row.model_id as string,
    barcode: row.barcode as string,
    displayName: row.display_name as string | undefined,
    brand: row.brand as string | undefined,
    partNumber: row.part_number as string | undefined,
    manufacturer: row.manufacturer as string | undefined,
    description: row.description as string | undefined,
    quantity: row.quantity as number,
    status: row.status as string,
    facilityId: row.facility_id as string | undefined,
    boxId: row.box_id as string | undefined,
    costPrice: row.cost_price as number | undefined,
    sellingPrice: row.selling_price as number | undefined,
    reorderPoint: (row.reorder_point ?? null) as number | null,
    expiryDate: (row.expiry_date ?? null) as string | null,
    lotNumber: (row.lot_number ?? null) as string | null,
    serialNumber: (row.serial_number ?? null) as string | null,
    imageUrl: row.image_url as string | undefined,
    imageUrls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default function InventoryPage() {
  const { orgId, facilities, user, userPermissions, orgData } = useAuth();
  const { toast } = useToast();
  const [myCanDelete, setMyCanDelete] = useState(false);
  const [view, setView] = useState<"items" | "boxes">("items");
  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Array<Record<string, unknown>>>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [histResults, setHistResults] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<{ modelId: string; quantity: number }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBoxId, setBulkBoxId] = useState("");

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!canDelete) { toast("You don't have delete access. Ask your organization owner.", "error"); return; }
    if (!confirm(`Delete ${selected.size} item(s)? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    try {
      const { error } = await supabase.from("inventory").delete().in("id", ids);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      clearSelection();
      toast(`Deleted ${ids.length} item(s)`, "success");
    } catch { toast("Could not delete items", "error"); }
  };

  const bulkMoveToBox = async (boxId: string | null) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const { error } = await supabase.from("inventory").update({ box_id: boxId }).in("id", ids);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (selected.has(i.id) ? { ...i, boxId: boxId || undefined } : i)));
      clearSelection();
      setBulkBoxId("");
      toast(boxId ? `Moved ${ids.length} to box` : `Removed ${ids.length} from box`, "success");
    } catch { toast("Could not move items", "error"); }
  };

  const bulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const { error } = await supabase.from("inventory").update({ status }).in("id", ids);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (selected.has(i.id) ? { ...i, status } : i)));
      clearSelection();
      toast(`Set ${ids.length} to ${status}`, "success");
    } catch { toast("Could not update items", "error"); }
  };

  // Delete-access gating (mirrors the mobile app). Free only for our org; every
  // other org keeps unrestricted delete. Org creator/owner/superadmin always
  // can; other members need the owner-granted can_delete flag.
  const DELETE_ACCESS_ORGS = ["054fd1ca-927b-413f-93a4-c1e4d1f3853a"];
  const isOrgCreator = !!(orgData?.ownerId && user?.id && orgData.ownerId === user.id);
  const isOwner = isOrgCreator || userPermissions === "owner";
  const isSuperAdmin = isOwner || userPermissions === "superadmin";
  const deleteAccessEnabled = orgId ? DELETE_ACCESS_ORGS.includes(orgId) : false;
  const canDelete = deleteAccessEnabled ? (isSuperAdmin || myCanDelete) : true;

  // Load this user's own delete grant so granted staff can delete too.
  useEffect(() => {
    if (!orgId || !user?.id || !deleteAccessEnabled) return;
    supabase
      .from("organization_memberships")
      .select("can_delete")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyCanDelete(data?.can_delete === true));
  }, [orgId, user?.id, deleteAccessEnabled]);

  const deleteItem = async () => {
    if (!editItem) return;
    if (!canDelete) {
      toast("You don't have delete access. Ask your organization owner.", "error");
      return;
    }
    if (!confirm(`Delete "${editItem.displayName || editItem.modelId}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", editItem.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== editItem.id));
      toast("Item deleted", "success");
      closePanel();
    } catch {
      toast("Could not delete item", "error");
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const modelIdx = header.findIndex((h) => h.toLowerCase().includes("model") || h.toLowerCase() === "barcode");
      const qtyIdx = header.findIndex((h) => h.toLowerCase().includes("qty") || h.toLowerCase() === "quantity");
      if (modelIdx === -1) { alert("CSV must have a 'Model ID' or 'Barcode' column"); return; }
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        return {
          modelId: cols[modelIdx] || "",
          quantity: qtyIdx >= 0 ? parseInt(cols[qtyIdx] || "0", 10) || 0 : 0,
        };
      }).filter((r) => r.modelId);
      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!orgId || importData.length === 0) return;
    setImporting(true);
    const result = { added: 0, updated: 0, errors: 0 };
    const existingMap = new Map<string, string>();
    items.forEach((i) => { if (i.barcode) existingMap.set(i.barcode, i.id); if (i.modelId) existingMap.set(i.modelId, i.id); });

    for (const item of importData) {
      const existingId = existingMap.get(item.modelId);
      if (existingId) {
        const { error } = await supabase.from("inventory").update({ quantity: item.quantity }).eq("id", existingId);
        if (error) { result.errors++; } else { result.updated++; }
      } else {
        const { data: newRow, error } = await supabase.from("inventory").insert({
          model_id: item.modelId, barcode: item.modelId, quantity: item.quantity,
          status: "available", reserved_by: null, reserved_at: null, reservation_expiry: null,
          org_id: orgId,
        }).select("id").single();
        if (error) { result.errors++; } else {
          result.added++;
          if (newRow) existingMap.set(item.modelId, newRow.id);
          // Remember in the permanent UPC catalog (fire-and-forget).
          supabase.rpc("catalog_remember", { p_org_id: orgId, p_barcode: item.modelId, p_model_id: item.modelId }).then(() => {}, () => {});
        }
      }
    }

    setImportResult(result);
    setImporting(false);
    toast(`Import complete: ${result.added} added, ${result.updated} updated`, "success");
    // Reload inventory
    const { data } = await supabase.from("inventory").select("*").eq("org_id", orgId);
    const mapped = (data || []).map(mapItem);
    setItems(mapped);
    setFiltered(mapped);
  };

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const [{ data }, { data: bData }] = await Promise.all([
        supabase.from("inventory").select("*").eq("org_id", orgId),
        supabase.from("boxes").select("*").eq("org_id", orgId),
      ]);
      const mapped = (data || []).map(mapItem);
      setItems(mapped);
      setFiltered(mapped);
      setBoxes((bData as Array<Record<string, unknown>>) || []);
      setLoading(false);
    };
    load();
  }, [orgId]);

  useEffect(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.modelId?.toLowerCase().includes(s) ||
          i.barcode?.toLowerCase().includes(s) ||
          i.displayName?.toLowerCase().includes(s) ||
          i.brand?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (facilityFilter !== "all") result = result.filter((i) => i.facilityId === facilityFilter);
    setFiltered(result);
  }, [search, statusFilter, facilityFilter, items]);

  // "From history": products previously entered under this search term whose
  // UPC is no longer in current inventory. Debounced query on product_catalog.
  useEffect(() => {
    const q = search.trim();
    if (!orgId || q.length < 2) { setHistResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      const { data } = await supabase
        .from("product_catalog")
        .select("*")
        .eq("org_id", orgId)
        .or(
          `barcode.ilike.${like},brand.ilike.${like},part_number.ilike.${like},model_id.ilike.${like},display_name.ilike.${like}`
        )
        .order("last_seen_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      const live = new Set(items.map((i) => (i.barcode || "").trim()).filter(Boolean));
      setHistResults(
        ((data as Array<Record<string, unknown>>) || []).filter(
          (h) => h.barcode && !live.has(String(h.barcode).trim())
        )
      );
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, orgId, items]);

  const boxCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const key = it.boxId || "loose";
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [items]);

  const exportCsv = () => {
    const header = "Model ID,Barcode,Name,Brand,Status,Quantity,Cost,Price,Facility,Box,Box ID\n";
    const rows = filtered.map((i) => {
      const fac = (facilities || []).find((f) => f.id === i.facilityId)?.name || "";
      const boxCode = i.boxId ? (String(boxes.find((b) => b.id === i.boxId)?.code || "")) : "Loose";
      const boxId = i.boxId || "";
      return `"${i.modelId}","${i.barcode}","${i.displayName || ""}","${i.brand || ""}","${i.status}",${i.quantity},${i.costPrice || ""},${i.sellingPrice || ""},"${fac}","${boxCode}","${boxId}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
  };

  const updateStatus = async (item: Item, newStatus: string) => {
    try {
      const { error } = await supabase.from("inventory").update({ status: newStatus }).eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
      setEditItem((prev) => prev ? { ...prev, status: newStatus } : null);
      toast(`Status updated to ${newStatus}`, "success");
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const saveQuantity = async () => {
    if (!editItem) return;
    try {
      const { error } = await supabase.from("inventory").update({ quantity: editQty }).eq("id", editItem.id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, quantity: editQty } : i)));
      setEditItem((prev) => prev ? { ...prev, quantity: editQty } : null);
      toast("Quantity updated", "success");
    } catch {
      toast("Failed to update quantity", "error");
    }
  };

  // Reflect a partial item change into both the list and the open panel.
  const applyItemChange = (patch: Partial<Item>) => {
    if (!editItem) return;
    setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, ...patch } : i)));
    setEditItem((prev) => (prev ? { ...prev, ...patch } : null));
  };

  const saveField = async (field: "display_name" | "brand" | "part_number", value: string) => {
    if (!editItem) return;
    const key = field === "display_name" ? "displayName" : field === "part_number" ? "partNumber" : "brand";
    const current = (editItem as unknown as Record<string, unknown>)[key];
    if ((current || "") === value) return; // no change
    try {
      const { error } = await supabase.from("inventory").update({ [field]: value || null }).eq("id", editItem.id);
      if (error) throw error;
      applyItemChange({ [key]: value || undefined } as Partial<Item>);
      // Keep the permanent UPC catalog current with the edited details.
      const bc = (editItem.barcode || editItem.modelId || "").trim();
      if (orgId && bc) {
        const next = { ...(editItem as unknown as Record<string, string>), [key]: value };
        supabase.rpc("catalog_remember", {
          p_org_id: orgId, p_barcode: bc,
          p_model_id: next.modelId || null, p_part_number: next.partNumber || null,
          p_brand: next.brand || null, p_display_name: next.displayName || null,
        }).then(() => {}, () => {});
      }
    } catch { toast("Failed to save", "error"); }
  };

  const saveReorderPoint = async (raw: string) => {
    if (!editItem) return;
    const val = raw.trim() === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    if ((editItem.reorderPoint ?? null) === val) return;
    try {
      const { error } = await supabase.from("inventory").update({ reorder_point: val }).eq("id", editItem.id);
      if (error) throw error;
      applyItemChange({ reorderPoint: val });
    } catch { toast("Failed to save reorder point", "error"); }
  };

  const saveTracking = async (
    field: "expiry_date" | "lot_number" | "serial_number",
    key: "expiryDate" | "lotNumber" | "serialNumber",
    value: string
  ) => {
    if (!editItem) return;
    const val = value.trim() === "" ? null : value.trim();
    if ((editItem[key] ?? null) === val) return;
    try {
      const { error } = await supabase.from("inventory").update({ [field]: val }).eq("id", editItem.id);
      if (error) throw error;
      applyItemChange({ [key]: val } as Partial<Item>);
    } catch { toast("Failed to save", "error"); }
  };

  const moveToFacility = async (facilityId: string | null) => {
    if (!editItem) return;
    try {
      const { error } = await supabase.from("inventory").update({ facility_id: facilityId }).eq("id", editItem.id);
      if (error) throw error;
      applyItemChange({ facilityId: facilityId || undefined });
      toast("Facility updated", "success");
    } catch { toast("Failed to move facility", "error"); }
  };

  const moveToBox = async (boxId: string | null) => {
    if (!editItem) return;
    try {
      const { error } = await supabase.from("inventory").update({ box_id: boxId }).eq("id", editItem.id);
      if (error) throw error;
      applyItemChange({ boxId: boxId || undefined });
      toast(boxId ? "Moved to box" : "Removed from box", "success");
    } catch { toast("Failed to move box", "error"); }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editItem) return;
    setUploadingImg(true);
    try {
      const key = editItem.barcode || editItem.modelId || editItem.id;
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `items/${key}/${Date.now()}.${ext}`;
      let bucketUsed = "product-images";
      let upErr = (await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: true })).error;
      if (upErr) {
        bucketUsed = "chat-images";
        upErr = (await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type, upsert: true })).error;
      }
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucketUsed).getPublicUrl(path);
      const url = pub.publicUrl;
      const nextUrls = [...(editItem.imageUrls || []), url];
      const { error } = await supabase.from("inventory").update({ image_urls: nextUrls, image_url: nextUrls[0] }).eq("id", editItem.id);
      if (error) {
        // image_urls column may not exist yet - at least set the cover.
        await supabase.from("inventory").update({ image_url: nextUrls[0] }).eq("id", editItem.id);
      }
      applyItemChange({ imageUrls: nextUrls, imageUrl: nextUrls[0] });
      toast("Photo added", "success");
    } catch { toast("Upload failed", "error"); }
    finally { setUploadingImg(false); }
  };

  const removeImage = async (url: string) => {
    if (!editItem) return;
    const nextUrls = (editItem.imageUrls || []).filter((u) => u !== url);
    try {
      const { error } = await supabase.from("inventory").update({ image_urls: nextUrls, image_url: nextUrls[0] || null }).eq("id", editItem.id);
      if (error) await supabase.from("inventory").update({ image_url: nextUrls[0] || null }).eq("id", editItem.id);
      applyItemChange({ imageUrls: nextUrls, imageUrl: nextUrls[0] || undefined });
    } catch { toast("Failed to remove photo", "error"); }
  };

  const openPanel = (item: Item) => {
    setEditItem(item);
    setEditQty(item.quantity);
  };

  const closePanel = () => {
    setEditItem(null);
  };

  /* Waiting looks like empty racks, not a spinner in the middle of nothing. */
  if (loading) {
    return (
      <AdminGuard>
        <PageShell title="Inventory" subtitle="Reading the floor.">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />
            ))}
          </div>
        </PageShell>
      </AdminGuard>
    );
  }

  const facilityName = (id?: string) => (facilities || []).find((f) => f.id === id)?.name;
  const boxCode = (id?: string) => (id ? String(boxes.find((b) => b.id === id)?.code || "") : "");

  const shown = filtered.length;
  const units = filtered.reduce((n, i) => n + (i.quantity || 0), 0);
  const allSelected = selected.size === shown && shown > 0;

  return (
    <AdminGuard>
      <PageShell
        title="Inventory"
        subtitle="Every unit on the floor. Open a line to change it; edits save as you leave each field."
        actions={
          <>
            <Action onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Export
            </Action>
            <Action solid onClick={() => setShowImport(true)}>
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </Action>
          </>
        }
      >
        <div className="space-y-8">
          {/* What the filters currently add up to. The count is the headline of
              this screen, so it is set like one rather than hidden in a caption. */}
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Lines shown" value={shown} />
            <Figure label="Units" value={units} />
            {selected.size > 0 && (
              <Figure label="Selected" value={selected.size} tone="brand" />
            )}
          </div>

          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "items", label: "Items" },
              { value: "boxes", label: "Boxes" },
            ]}
          />

          {/* ── Filters ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Model, barcode, or name"
              aria-label="Search inventory"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[12px] text-muted-foreground">
                Status
              </span>
              {["all", "available", "reserved", "sold"].map((s) => (
                <Chip key={s} on={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s === "all" ? "Any" : s}
                </Chip>
              ))}

              {(facilities || []).length > 0 && (
                <>
                  <span className="ml-4 mr-1 text-[12px] text-muted-foreground">
                    Site
                  </span>
                  <Chip on={facilityFilter === "all"} onClick={() => setFacilityFilter("all")}>
                    Any
                  </Chip>
                  {(facilities || []).map((f) => (
                    <Chip
                      key={f.id}
                      on={facilityFilter === f.id}
                      onClick={() => setFacilityFilter(f.id)}
                    >
                      {f.name}
                    </Chip>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Bulk bar ────────────────────────────────────────── */}
          {view === "items" && selected.size > 0 && (
            <div className="panel panel-live sticky top-16 z-20 flex flex-wrap items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur-xl">
              <span className="text-[12px] text-[var(--brand-2)]">
                {selected.size} selected
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {["available", "reserved", "sold"].map((s) => (
                  <Chip key={s} onClick={() => bulkStatus(s)}>
                    Mark {s}
                  </Chip>
                ))}
                <Select
                  value={bulkBoxId}
                  aria-label="Move selection to a box"
                  className="w-auto py-1.5 text-xs"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__loose__") bulkMoveToBox(null);
                    else if (v) bulkMoveToBox(v);
                  }}
                >
                  <option value="">Move to box…</option>
                  <option value="__loose__">Loose (remove from box)</option>
                  {boxes.map((b) => (
                    <option key={String(b.id)} value={String(b.id)}>
                      {String(b.code || "Box")}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={bulkDelete}
                  className="rounded-md border border-destructive/40 px-3 py-1.5 text-[12px] text-destructive transition-colors duration-300 hover:bg-destructive/10"
                >
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2 py-1.5 text-[12px] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {view === "items" ? (
            <Panel className="reveal">
              {/* Column heads. Mono and quiet — the data is the loud part. */}
              <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(filtered.map((i) => i.id)) : new Set())
                  }
                  aria-label="Select every shown line"
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand-2)]"
                />
                <ColHead className="min-w-0 flex-1">Item</ColHead>
                <ColHead className="w-28 shrink-0">Status</ColHead>
                <ColHead className="w-14 shrink-0 text-right">Qty</ColHead>
                <ColHead className="w-40 shrink-0">Location</ColHead>
                <span className="w-4 shrink-0" />
              </div>

              {filtered.map((item) => {
                const id = itemIdentity(item);
                const picked = selected.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => openPanel(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPanel(item);
                      }
                    }}
                    className={`row-line group flex cursor-pointer items-center gap-4 px-5 py-3 text-left ${
                      picked ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={picked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${id.title}`}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand-2)]"
                    />

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        /* No photo is a hairline square, not a grey chip with an
                           icon in it — the row should stay quiet. */
                        <span className="h-9 w-9 shrink-0 rounded-md border border-border" />
                      )}
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                          {id.title}
                        </p>
                        <p className="mono truncate text-[12px] text-muted-foreground">
                          {id.subtitle || "Unnamed"}
                        </p>
                      </div>
                    </div>

                    <div className="hidden w-28 shrink-0 md:block">
                      <Status status={item.status} />
                    </div>
                    <div className="mono hidden w-14 shrink-0 text-right text-sm font-semibold tabular-nums md:block">
                      {item.quantity}
                    </div>
                    <div className="hidden w-40 min-w-0 shrink-0 md:block">
                      <p className="truncate text-sm">{facilityName(item.facilityId) || "No site"}</p>
                      <p className="mono truncate text-[12px] text-muted-foreground">
                        {item.boxId ? `Box ${boxCode(item.boxId)}` : "Loose"}
                      </p>
                    </div>

                    <ChevronRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <EmptyState
                  icon={Package}
                  title="Nothing matches"
                  description="Clear a filter, or import a CSV to put stock on the floor."
                />
              )}
            </Panel>
          ) : (
            <div className="reveal grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-background p-5">
                <p className="text-[12px] text-[var(--brand-2)]">
                  Loose
                </p>
                <p className="font-display mt-2 text-3xl font-bold tabular-nums tracking-[-0.03em]">
                  {boxCounts.loose || 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Not assigned to a box</p>
              </div>
              {boxes.map((b) => (
                <div key={String(b.id)} className="bg-background p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {String(b.code || "Box")}
                    </p>
                    <span className="mono shrink-0 text-[11px] text-muted-foreground">
                      {String(b.category || "general")}
                    </span>
                  </div>
                  <p className="font-display mt-2 text-3xl font-bold tabular-nums tracking-[-0.03em]">
                    {boxCounts[String(b.id)] || 0}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {String(b.label || "No label")}
                  </p>
                </div>
              ))}
              {boxes.length === 0 && (
                <div className="col-span-full bg-background">
                  <EmptyState
                    icon={Boxes}
                    title="No boxes yet"
                    description="Create boxes under Boxes, then assign stock into them."
                  />
                </div>
              )}
            </div>
          )}

          {/* Known products that are no longer in stock. Kept apart from the
              live list so a search result can never be mistaken for stock. */}
          {histResults.length > 0 && (
            <section className="space-y-4">
              <Rule label="Seen before, not in stock" />
              <div className="grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2">
                {histResults.map((h) => (
                  <div key={String(h.id)} className="bg-background p-4">
                    <p className="truncate text-sm font-medium">
                      {String(h.display_name || h.model_id || h.part_number || "Known product")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(h.brand || "Unknown brand")}
                      {h.category ? ` · ${String(h.category)}` : ""}
                    </p>
                    <p className="mt-1.5 text-[12px] text-warning">
                      UPC {String(h.barcode)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Import ─────────────────────────────────────────────── */}
        <Modal
          open={showImport}
          onClose={() => {
            setShowImport(false);
            setImportData([]);
            setImportResult(null);
          }}
          title="Import CSV"
          subtitle="Model ID required · Qty optional"
        >
          {importResult ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <Figure label="Added" value={importResult.added} tone="brand" />
                <Figure label="Updated" value={importResult.updated} />
                <Figure
                  label="Errors"
                  value={importResult.errors}
                  tone={importResult.errors ? "destructive" : undefined}
                />
              </div>
              <Action
                solid
                onClick={() => {
                  setShowImport(false);
                  setImportData([]);
                  setImportResult(null);
                }}
              >
                Done
              </Action>
            </div>
          ) : importData.length > 0 ? (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {importData.length} lines ready. First twenty shown.
              </p>
              <div className="panel max-h-64 overflow-y-auto">
                <div className="flex gap-4 border-b border-border px-4 py-2.5">
                  <ColHead className="flex-1">Model ID</ColHead>
                  <ColHead className="w-16 text-right">Qty</ColHead>
                </div>
                {importData.slice(0, 20).map((r, i) => (
                  <div key={i} className="row-line flex gap-4 px-4 py-2">
                    <span className="mono flex-1 truncate text-xs">{r.modelId}</span>
                    <span className="mono w-16 text-right text-xs tabular-nums">{r.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Action onClick={() => setImportData([])} className="flex-1">
                  Cancel
                </Action>
                <Action solid onClick={runImport} disabled={importing} className="flex-1">
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {importing ? "Importing" : `Import ${importData.length}`}
                </Action>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                A CSV with a Model ID column. Qty is optional and defaults to one.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[12px] text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark">
                <Upload className="h-3.5 w-3.5" /> Choose file
                <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
              </label>
            </div>
          )}
        </Modal>

        {/* ── Line detail ────────────────────────────────────────── */}
        <Drawer
          open={!!editItem}
          onClose={closePanel}
          title={editItem ? itemIdentity(editItem).title : ""}
          subtitle={editItem?.barcode || ""}
          footer={
            editItem ? (
              <>
                {canDelete && (
                  <button
                    onClick={deleteItem}
                    aria-label="Delete this item"
                    className="shrink-0 rounded-md border border-destructive/40 p-2.5 text-destructive transition-colors duration-300 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <Action solid onClick={closePanel} className="flex-1">
                  Done
                </Action>
              </>
            ) : null
          }
        >
          {editItem && (
            <div className="space-y-6">
              <Field label={`Photos${(editItem.imageUrls || []).length ? ` (${(editItem.imageUrls || []).length})` : ""}`}>
                <div className="flex flex-wrap gap-2">
                  {(editItem.imageUrls || []).map((url, i) => (
                    <div key={`${url}-${i}`} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                      {i === 0 && (
                        <span className="mono absolute bottom-1 left-1 rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px]">
                          Cover
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(url)}
                        aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-destructive opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border transition-colors duration-300 hover:border-[var(--brand-2)]">
                    {uploadingImg ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-2)]" />
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="mono text-[11px] text-muted-foreground">
                          Add
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      className="hidden"
                      disabled={uploadingImg}
                    />
                  </label>
                </div>
              </Field>

              <Field label="Name">
                <Input
                  key={`name-${editItem.id}`}
                  defaultValue={editItem.displayName || ""}
                  onBlur={(e) => saveField("display_name", e.target.value.trim())}
                  placeholder="Product name"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Make">
                  <Input
                    key={`brand-${editItem.id}`}
                    defaultValue={editItem.brand || ""}
                    onBlur={(e) => saveField("brand", e.target.value.trim())}
                    placeholder="Brand"
                  />
                </Field>
                <Field label="Model">
                  <Input
                    key={`part-${editItem.id}`}
                    defaultValue={editItem.partNumber || ""}
                    onBlur={(e) => saveField("part_number", e.target.value.trim())}
                    placeholder="Part number"
                  />
                </Field>
              </div>

              <Field label="Reorder point" hint="Blank uses the organisation default.">
                <Input
                  key={`reorder-${editItem.id}`}
                  type="number"
                  min={0}
                  defaultValue={editItem.reorderPoint ?? ""}
                  onBlur={(e) => saveReorderPoint(e.target.value)}
                  placeholder="Alert below this quantity"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Expiry">
                  <Input
                    key={`expiry-${editItem.id}`}
                    type="date"
                    defaultValue={editItem.expiryDate ?? ""}
                    onBlur={(e) => saveTracking("expiry_date", "expiryDate", e.target.value)}
                  />
                </Field>
                <Field label="Lot">
                  <Input
                    key={`lot-${editItem.id}`}
                    defaultValue={editItem.lotNumber ?? ""}
                    onBlur={(e) => saveTracking("lot_number", "lotNumber", e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Serial">
                  <Input
                    key={`serial-${editItem.id}`}
                    defaultValue={editItem.serialNumber ?? ""}
                    onBlur={(e) => saveTracking("serial_number", "serialNumber", e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
              </div>

              {(editItem.costPrice != null || editItem.sellingPrice != null) && (
                <div className="flex gap-10 border-t border-border pt-5">
                  <Figure
                    label="Cost"
                    value={editItem.costPrice != null ? `$${editItem.costPrice}` : "—"}
                    className="[&_.figure-value]:text-2xl"
                  />
                  <Figure
                    label="Sells for"
                    value={editItem.sellingPrice != null ? `$${editItem.sellingPrice}` : "—"}
                    className="[&_.figure-value]:text-2xl"
                  />
                </div>
              )}

              {editItem.description && (
                <Field label="Description">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {editItem.description}
                  </p>
                </Field>
              )}

              <Field label="Quantity">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={editQty}
                    onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                    className="w-28"
                    aria-label="Quantity"
                  />
                  {editQty !== editItem.quantity && (
                    <Action onClick={saveQuantity} className="px-3 py-2">
                      <Save className="h-3.5 w-3.5" /> Save
                    </Action>
                  )}
                </div>
              </Field>

              <Field label="Site">
                <Select
                  value={editItem.facilityId || ""}
                  onChange={(e) => moveToFacility(e.target.value || null)}
                >
                  <option value="">No site</option>
                  {(facilities || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Box">
                <Select
                  value={editItem.boxId || ""}
                  onChange={(e) => moveToBox(e.target.value || null)}
                >
                  <option value="">Loose (no box)</option>
                  {boxes
                    .filter(
                      (b) => !editItem.facilityId || !b.facility_id || b.facility_id === editItem.facilityId
                    )
                    .map((b) => (
                      <option key={String(b.id)} value={String(b.id)}>
                        {String(b.code || "Box")}
                        {b.label ? ` — ${String(b.label)}` : ""}
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Status">
                <div className="flex flex-wrap gap-2">
                  {["available", "reserved", "sold"].map((s) => (
                    <Chip
                      key={s}
                      on={editItem.status === s}
                      onClick={() => updateStatus(editItem, s)}
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Drawer>
      </PageShell>
    </AdminGuard>
  );
}
