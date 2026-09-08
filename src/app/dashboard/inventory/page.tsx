"use client";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Search, Download, Package, Boxes, ChevronDown, ChevronRight, Upload, Loader2, X, FileSpreadsheet, Save, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@/lib/motion";
import { statusColor } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const STATUS_DOT: Record<string, string> = {
  available: "bg-success",
  reserved: "bg-warning",
  sold: "bg-primary",
};

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const facilityName = (id?: string) => (facilities || []).find((f) => f.id === id)?.name;
  const boxCode = (id?: string) => (id ? String(boxes.find((b) => b.id === id)?.code || "") : "");

  return (
    <AdminGuard><PageShell
      title="Inventory"
      subtitle={`${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="h-10 px-4">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="brand" onClick={() => setShowImport(true)} className="h-10 px-4">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
        </div>
      }
    >
      {/* View toggle */}
      <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
        {(["items", "boxes"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              view === v ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {view === v && (
              <motion.span layoutId="inv-view" transition={spring} className="absolute inset-0 rounded-lg bg-brand-gradient shadow-[0_4px_12px_-4px_var(--brand-1)]" />
            )}
            <span className="relative">{v}</span>
          </button>
        ))}
      </div>

      {/* Filters — wrap, never overflow */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model, barcode, name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground h-full"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>
        {(facilities || []).length > 0 && (
          <div className="relative">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground h-full"
              title="Filter by facility"
            >
              <option value="all">All Facilities</option>
              {(facilities || []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Bulk-action bar (items view, when rows are selected) */}
      {view === "items" && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/25 sticky top-2 z-20 backdrop-blur-xl">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {["available", "reserved", "sold"].map((s) => (
              <button key={s} onClick={() => bulkStatus(s)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary transition capitalize">
                {s}
              </button>
            ))}
            <select
              value={bulkBoxId}
              onChange={(e) => { const v = e.target.value; if (v === "__loose__") bulkMoveToBox(null); else if (v) bulkMoveToBox(v); }}
              className="appearance-none px-3 py-1.5 rounded-lg border text-xs bg-input border-border text-foreground cursor-pointer"
            >
              <option value="">Move to box…</option>
              <option value="__loose__">Loose (remove from box)</option>
              {boxes.map((b) => <option key={String(b.id)} value={String(b.id)}>{String(b.code || "Box")}</option>)}
            </select>
            <Button variant="destructive" size="sm" onClick={bulkDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      {view === "items" ? (
      <Card className="overflow-hidden"><CardContent className="p-0">
        {/* Header (desktop only) */}
        <div className="hidden md:flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <input
            type="checkbox"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((i) => i.id)) : new Set())}
            className="w-4 h-4 shrink-0 accent-[var(--primary)] cursor-pointer"
            title="Select all"
          />
          <div className="flex-1 min-w-0">Item</div>
          <div className="w-28 shrink-0">Status</div>
          <div className="w-14 shrink-0 text-right">Qty</div>
          <div className="w-40 shrink-0">Location</div>
          <div className="w-9 shrink-0" />
        </div>
        {/* Row list — flex, always fits, edit affordance pinned right */}
        <div>
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => openPanel(item)}
              role="button"
              className={`group w-full flex items-center gap-4 px-4 py-3 text-left border-b border-border/60 last:border-0 cursor-pointer transition-colors ${selected.has(item.id) ? "bg-primary/[0.07]" : "hover:bg-primary/[0.05]"}`}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelect(item.id)}
                className="w-4 h-4 shrink-0 accent-[var(--primary)] cursor-pointer"
              />
              {/* Item identity */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{item.displayName || item.modelId}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{item.barcode || item.modelId}</div>
                </div>
              </div>
              {/* Status */}
              <div className="w-28 shrink-0 hidden md:block">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(item.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status] || "bg-gray-400"}`} />
                  {item.status}
                </span>
              </div>
              {/* Qty */}
              <div className="w-14 shrink-0 text-right font-semibold tabular-nums hidden md:block">{item.quantity}</div>
              {/* Location */}
              <div className="w-40 shrink-0 hidden md:block min-w-0">
                <div className="text-xs text-muted-foreground truncate">{facilityName(item.facilityId) || "No facility"}</div>
                <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${item.boxId ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {item.boxId ? `Box ${boxCode(item.boxId)}` : "Loose"}
                </span>
              </div>
              {/* Edit affordance — always visible, pinned right */}
              <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground bg-secondary group-hover:bg-brand-gradient group-hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon={Package} title="No items found" description="Import a CSV or add items from the mobile app to get started." />
          )}
          {histResults.length > 0 && (
            <div className="mt-6 pt-5 border-t border-warning/30">
              <div className="flex items-center gap-2 mb-3 text-warning text-xs font-bold tracking-wide">
                <Clock className="w-3.5 h-3.5" />
                FROM HISTORY · NO LONGER IN INVENTORY ({histResults.length})
              </div>
              <div className="space-y-2">
                {histResults.map((h) => (
                  <div key={String(h.id)} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                    <div className="font-semibold truncate">
                      {String(h.display_name || h.model_id || h.part_number || "Known product")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {String(h.brand || "Unknown brand")}{h.category ? ` · ${String(h.category)}` : ""}
                    </div>
                    <div className="text-xs font-semibold text-warning mt-1 font-mono">UPC {String(h.barcode)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-dashed border-primary/40 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 font-semibold text-primary"><Boxes className="w-4 h-4" /> Loose Inventory</div>
              <p className="text-2xl font-bold mt-2">{boxCounts.loose || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Items not assigned to a box</p>
            </CardContent>
          </Card>
          {boxes.map((b) => (
            <Card key={String(b.id)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{String(b.code || "Box")}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary">{String(b.category || "general")}</span>
                </div>
                <p className="text-2xl font-bold mt-2">{boxCounts[String(b.id)] || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{String(b.label || "No label")}</p>
              </CardContent>
            </Card>
          ))}
          {boxes.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={Boxes} title="No boxes yet" description="Create boxes from the Boxes section, then assign inventory into them." />
            </div>
          )}
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }}>
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto"><CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Import CSV</h3>
              <button onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }}><X className="w-5 h-5" /></button>
            </div>

            {importResult ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-success" />
                </div>
                <h4 className="text-lg font-bold mb-2">Import Complete</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong className="text-success">{importResult.added}</strong> items added</p>
                  <p><strong className="text-primary">{importResult.updated}</strong> items updated</p>
                  {importResult.errors > 0 && <p><strong className="text-danger">{importResult.errors}</strong> errors</p>}
                </div>
                <Button onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }} className="mt-6 px-6 py-2.5">
                  Done
                </Button>
              </div>
            ) : importData.length > 0 ? (
              <>
                <p className="text-sm mb-4 text-muted-foreground">
                  Found <strong>{importData.length}</strong> items to import. Preview:
                </p>
                <div className="max-h-60 overflow-y-auto rounded-xl border mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-xs text-muted-foreground">Model ID</th>
                        <th className="text-left px-3 py-2 text-xs text-muted-foreground">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-3 py-2 font-mono text-xs">{r.modelId}</td>
                          <td className="px-3 py-2">{r.quantity}</td>
                        </tr>
                      ))}
                      {importData.length > 20 && (
                        <tr><td colSpan={2} className="px-3 py-2 text-xs text-muted-foreground">...and {importData.length - 20} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setImportData([])} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:border-primary transition">
                    Cancel
                  </button>
                  <button onClick={runImport} disabled={importing} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? "Importing..." : `Import ${importData.length} Items`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm mb-1 font-medium">Upload a CSV file</p>
                <p className="text-xs mb-4 text-muted-foreground">
                  Must have a &quot;Model ID&quot; column. &quot;Qty&quot; column is optional.
                </p>
                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium cursor-pointer hover:bg-primary-dark transition">
                  <Upload className="w-4 h-4" /> Choose File
                  <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
                </label>
              </div>
            )}
          </CardContent></Card>
        </div>
      )}

      {/* Item editor — right-side drawer. Stays pinned; edits save on change. */}
      <AnimatePresence>
      {editItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePanel}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={spring}
            className="relative w-full max-w-md h-full flex flex-col bg-background border-l border-border shadow-2xl"
          >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="min-w-0">
                  <h3 className="text-lg font-display font-bold truncate">{editItem.displayName || editItem.modelId}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">{editItem.barcode}</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-secondary transition shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Photos - multiple, first is cover */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-muted-foreground">
                    Photos {(editItem.imageUrls || []).length > 0 ? `(${(editItem.imageUrls || []).length})` : ""}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(editItem.imageUrls || []).map((url, i) => (
                      <div key={`${url}-${i}`} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="item" className="w-20 h-20 rounded-lg object-cover border border-border" />
                        {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">COVER</span>}
                        <button onClick={() => removeImage(url)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-primary/10 transition">
                      {uploadingImg ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <><Upload className="w-4 h-4 text-primary" /><span className="text-[10px] text-primary font-medium">Add</span></>}
                      <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" disabled={uploadingImg} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Name</label>
                  <input
                    key={`name-${editItem.id}`}
                    defaultValue={editItem.displayName || ""}
                    onBlur={(e) => saveField("display_name", e.target.value.trim())}
                    placeholder="Product name"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Make / Brand</label>
                    <input
                      key={`brand-${editItem.id}`}
                      defaultValue={editItem.brand || ""}
                      onBlur={(e) => saveField("brand", e.target.value.trim())}
                      placeholder="Brand"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Model</label>
                    <input
                      key={`part-${editItem.id}`}
                      defaultValue={editItem.partNumber || ""}
                      onBlur={(e) => saveField("part_number", e.target.value.trim())}
                      placeholder="Model / part #"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Reorder point</label>
                  <input
                    key={`reorder-${editItem.id}`}
                    type="number"
                    min={0}
                    defaultValue={editItem.reorderPoint ?? ""}
                    onBlur={(e) => saveReorderPoint(e.target.value)}
                    placeholder="Alert when qty drops to this (blank = org default)"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Expiry date</label>
                    <input
                      key={`expiry-${editItem.id}`}
                      type="date"
                      defaultValue={editItem.expiryDate ?? ""}
                      onBlur={(e) => saveTracking("expiry_date", "expiryDate", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Lot / batch</label>
                    <input
                      key={`lot-${editItem.id}`}
                      defaultValue={editItem.lotNumber ?? ""}
                      onBlur={(e) => saveTracking("lot_number", "lotNumber", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Serial #</label>
                    <input
                      key={`serial-${editItem.id}`}
                      defaultValue={editItem.serialNumber ?? ""}
                      onBlur={(e) => saveTracking("serial_number", "serialNumber", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                  </div>
                </div>
                {(editItem.costPrice != null || editItem.sellingPrice != null) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Cost</label>
                      <div className="text-sm">{editItem.costPrice != null ? `$${editItem.costPrice}` : "-"}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Sell Price</label>
                      <div className="text-sm">{editItem.sellingPrice != null ? `$${editItem.sellingPrice}` : "-"}</div>
                    </div>
                  </div>
                )}
                {editItem.description && (
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Description</label>
                    <div className="text-sm">{editItem.description}</div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Quantity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editQty}
                      onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-24 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
                    />
                    {editQty !== editItem.quantity && (
                      <button onClick={saveQuantity} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">
                        <Save className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Facility</label>
                  <div className="relative">
                    <select
                      value={editItem.facilityId || ""}
                      onChange={(e) => moveToFacility(e.target.value || null)}
                      className="w-full appearance-none px-3 py-2 pr-9 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground"
                    >
                      <option value="">No facility</option>
                      {(facilities || []).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Box</label>
                  <div className="relative">
                    <select
                      value={editItem.boxId || ""}
                      onChange={(e) => moveToBox(e.target.value || null)}
                      className="w-full appearance-none px-3 py-2 pr-9 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground"
                    >
                      <option value="">Loose (no box)</option>
                      {boxes
                        .filter((b) => !editItem.facilityId || !b.facility_id || b.facility_id === editItem.facilityId)
                        .map((b) => (
                          <option key={String(b.id)} value={String(b.id)}>
                            {String(b.code || "Box")}{b.label ? ` - ${String(b.label)}` : ""}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Status</label>
                  <div className="flex gap-2">
                    {["available", "reserved", "sold"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(editItem, s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition capitalize ${
                          editItem.status === s ? "bg-brand-gradient text-white border-transparent" : "hover:border-primary"
                        }`}
                        style={editItem.status !== s ? { borderColor: "var(--border)" } : undefined}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${editItem.status === s ? "bg-white" : STATUS_DOT[s] || "bg-gray-400"}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center gap-2 shrink-0">
                {canDelete && (
                  <button
                    onClick={deleteItem}
                    title="Delete item"
                    className="w-11 h-11 shrink-0 rounded-xl border border-destructive/40 text-destructive flex items-center justify-center hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Button variant="brand" onClick={closePanel} className="flex-1 h-11">
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
      )}
      </AnimatePresence>
    </PageShell></AdminGuard>
  );
}
