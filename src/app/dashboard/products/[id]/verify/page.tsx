"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { XCircle, ArrowLeft, Package, Save } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Segmented, Textarea } from "@/components/console/controls";
import Link from "next/link";

interface GlobalProduct {
  id: string;
  modelId: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  specifications: Record<string, string>;
  compatibility: Array<{make: string; model: string; years?: string; notes?: string}>;
  oemReferences: string[];
  images: Array<{url: string; source: string}>;
  primaryImageUrl?: string;
  enrichmentStatus: string;
  verificationStatus: string;
  enrichmentConfidence: number;
  enrichmentSource?: string;
  enrichedAt?: string;
  aiSuggestedFields?: string[];
  enrichmentData?: unknown;
}

export default function ProductVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const { orgId, user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<GlobalProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  // Editable form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    subcategory: "",
    description: "",
    specifications: {} as Record<string, string>,
    compatibility: [] as Array<{make: string; model: string; years?: string; notes?: string}>,
    primaryImageUrl: "",
  });

  const productId = params.id as string;

  const loadProduct = useCallback(async () => {
    if (!orgId || !productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("global_products")
        .select("*")
        .eq("id", productId)
        .eq("org_id", orgId)
        .single();

      if (error) throw error;

      const mapped: GlobalProduct = {
        id: data.id,
        modelId: data.model_id,
        barcode: data.barcode,
        name: data.name,
        brand: data.brand,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        specifications: data.specifications || {},
        compatibility: data.compatibility || [],
        oemReferences: data.oem_references || [],
        images: data.images || [],
        primaryImageUrl: data.primary_image_url,
        enrichmentStatus: data.enrichment_status,
        verificationStatus: data.verification_status,
        enrichmentConfidence: data.enrichment_confidence || 0,
        enrichmentSource: data.enrichment_source,
        enrichedAt: data.enriched_at,
        aiSuggestedFields: data.ai_suggested_fields || [],
        enrichmentData: data.enrichment_data,
      };

      setProduct(mapped);
      setFormData({
        name: mapped.name || "",
        brand: mapped.brand || "",
        category: mapped.category || "",
        subcategory: mapped.subcategory || "",
        description: mapped.description || "",
        specifications: mapped.specifications || {},
        compatibility: mapped.compatibility || [],
        primaryImageUrl: mapped.primaryImageUrl || "",
      });
    } catch (error) {
      console.error("Load error:", error);
      toast("Failed to load product", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, productId, toast]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function handleSave(verify = false) {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (verify) {
        updateData.verification_status = "verified";
        updateData.verified_by = user?.id;
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("global_products")
        .update(updateData)
        .eq("id", productId)
        .eq("org_id", orgId);

      if (error) throw error;

      toast(verify ? "Product verified and saved" : "Changes saved", "success");
      
      if (verify) {
        router.push("/dashboard/enrichment");
      }
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function updateSpec(key: string, value: string) {
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [key]: value }
    }));
  }

  function addCompatibility() {
    setFormData(prev => ({
      ...prev,
      compatibility: [...prev.compatibility, { make: "", model: "" }]
    }));
  }

  function updateCompatibility(index: number, field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      compatibility: prev.compatibility.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      )
    }));
  }

  function removeCompatibility(index: number) {
    setFormData(prev => ({
      ...prev,
      compatibility: prev.compatibility.filter((_, i) => i !== index)
    }));
  }

  if (loading) {
    return (
      <PageShell title="Review" subtitle="Reading the record." eyebrow="Product">
        <ListSkeleton rows={5} />
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell
        title="Not found"
        eyebrow="Product"
        breadcrumb={
          <Link
            href="/dashboard/enrichment"
            className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Enrichment
          </Link>
        }
      >
        <EmptyState
          icon={Package}
          title="No such product"
          description="It may have been merged or removed since the queue was built."
        />
      </PageShell>
    );
  }

  const confidence = Math.round(product.enrichmentConfidence * 100);
  const confidenceTone =
    product.enrichmentConfidence >= 0.8
      ? "text-success"
      : product.enrichmentConfidence >= 0.5
        ? "text-warning"
        : "text-destructive";

  return (
    <PageShell
      title="Review"
      eyebrow="Product"
      subtitle={product.modelId}
      breadcrumb={
        <Link
          href="/dashboard/enrichment"
          className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Enrichment
        </Link>
      }
      actions={
        <>
          <Action onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Action>
          <Action solid onClick={() => handleSave(true)} disabled={saving}>
            Mark checked
          </Action>
        </>
      }
    >
      <div className="space-y-10">
        {/* How much of this was guessed, and how sure the guess was. */}
        <div className="reveal flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className={`figure-value ${confidenceTone}`}>{confidence}%</p>
            <p className="figure-label mt-2">Confidence</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {product.enrichmentSource || "unknown source"}
            </p>
            <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {product.enrichedAt
                ? new Date(product.enrichedAt).toLocaleDateString()
                : "date unknown"}
            </p>
          </div>
        </div>

        {product.aiSuggestedFields && product.aiSuggestedFields.length > 0 && (
          <div className="reveal d1">
            <ColHead className="mb-2 block">Filled in automatically</ColHead>
            <div className="flex flex-wrap gap-2">
              {(product.aiSuggestedFields as string[]).map((field) => (
                <span
                  key={field}
                  className="mono rounded-sm border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "basic", label: "Details" },
            { value: "compatibility", label: "Fits" },
            { value: "specs", label: "Specs" },
          ]}
        />

        {activeTab === "basic" && (
          <div className="reveal space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} />
              </Field>
              <Field label="Brand">
                <Input value={formData.brand} onChange={(e) => updateField("brand", e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category">
                <Input
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                />
              </Field>
              <Field label="Subcategory">
                <Input
                  value={formData.subcategory}
                  onChange={(e) => updateField("subcategory", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
              />
            </Field>
            {formData.primaryImageUrl && (
              <Field label="Photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.primaryImageUrl}
                  alt=""
                  className="h-44 w-44 rounded-md border border-border object-cover"
                />
              </Field>
            )}
          </div>
        )}

        {activeTab === "compatibility" && (
          <div className="reveal space-y-3">
            {formData.compatibility.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing recorded. Add what this part fits.
              </p>
            )}
            {formData.compatibility.map((compat, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Make"
                  aria-label="Make"
                  value={compat.make}
                  onChange={(e) => updateCompatibility(index, "make", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Model"
                  aria-label="Model"
                  value={compat.model}
                  onChange={(e) => updateCompatibility(index, "model", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Years"
                  aria-label="Years"
                  value={compat.years || ""}
                  onChange={(e) => updateCompatibility(index, "years", e.target.value)}
                  className="flex-1"
                />
                <button
                  onClick={() => removeCompatibility(index)}
                  aria-label="Remove this vehicle"
                  className="shrink-0 px-1 text-muted-foreground transition-colors duration-300 hover:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Action onClick={addCompatibility} className="w-full">
              Add a vehicle
            </Action>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="reveal space-y-3">
            {Object.entries(formData.specifications).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[1fr_2fr] items-center gap-4">
                <ColHead className="truncate">{key}</ColHead>
                <Input value={value} onChange={(e) => updateSpec(key, e.target.value)} aria-label={key} />
              </div>
            ))}
            <div className="border-t border-border pt-4">
              <Input
                placeholder="New spec name, then Enter"
                aria-label="Add a specification"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    updateSpec(e.currentTarget.value, "");
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        )}

        {product.enrichmentData != null && (
          <details className="reveal border-t border-border pt-6">
            <summary className="mono cursor-pointer text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-foreground">
              What the model actually returned
            </summary>
            <pre className="mono panel mt-4 max-h-64 overflow-auto p-4 text-[11px] leading-relaxed">
              {JSON.stringify(product.enrichmentData, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </PageShell>
  );
}
