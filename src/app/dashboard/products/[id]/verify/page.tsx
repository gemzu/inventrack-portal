"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  XCircle, ArrowLeft, 
  Package, Tag, Car, Save,
  BrainCircuit, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
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

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.8) return "bg-green-100 text-green-700 border-green-200";
    if (confidence >= 0.5) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Link href="/dashboard/enrichment" className="text-primary hover:underline mt-2 inline-block">
          Back to Enrichment
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-page-enter space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/enrichment"
            className="p-2 rounded-lg hover:bg-accent transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Review Product</h1>
            <p className="text-sm text-muted-foreground">{product.modelId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleSave(false)} 
            variant="outline"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button 
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Shield className="w-4 h-4 mr-2" /> Verify & Save
          </Button>
        </div>
      </div>

      <Card className={`border-l-4 ${getConfidenceColor(product.enrichmentConfidence)}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrainCircuit className="w-5 h-5" />
              <div>
                <p className="font-medium">AI Enrichment Confidence</p>
                <p className="text-sm opacity-80">
                  {product.enrichmentSource} • {product.enrichedAt ? new Date(product.enrichedAt).toLocaleDateString() : "Unknown date"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">
                {Math.round(product.enrichmentConfidence * 100)}%
              </span>
            </div>
          </div>
          {product.aiSuggestedFields && product.aiSuggestedFields.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm opacity-70">AI detected:</span>
              {(product.aiSuggestedFields as string[]).map((field: string) => (
                <span 
                  key={field} 
                  className="text-xs px-2 py-0.5 rounded-full bg-black/10"
                >
                  {field}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {[
          { id: "basic", label: "Basic Info", Icon: Package },
          { id: "compatibility", label: "Compatibility", Icon: Car },
          { id: "specs", label: "Specifications", Icon: Tag },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === "basic" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => updateField("subcategory", e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                />
              </div>
              {formData.primaryImageUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Product Image</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.primaryImageUrl}
                    alt="Product"
                    className="w-48 h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "compatibility" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" /> Vehicle Compatibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.compatibility.map((compat, index) => (
                <div key={index} className="flex gap-2 items-start p-3 rounded-lg border bg-card">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Make (e.g., Toyota)"
                      value={compat.make}
                      onChange={(e) => updateCompatibility(index, "make", e.target.value)}
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Model (e.g., Camry)"
                      value={compat.model}
                      onChange={(e) => updateCompatibility(index, "model", e.target.value)}
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Years (e.g., 2018-2024)"
                      value={compat.years || ""}
                      onChange={(e) => updateCompatibility(index, "years", e.target.value)}
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeCompatibility(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button onClick={addCompatibility} variant="outline" className="w-full">
                + Add Vehicle
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "specs" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" /> Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4">
                  <div className="px-3 py-2 rounded-md border bg-muted text-sm font-medium capitalize">
                    {key}
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateSpec(key, e.target.value)}
                    className="px-3 py-2 rounded-md border bg-background text-sm"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <input
                  type="text"
                  placeholder="New spec name (e.g., Material)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      updateSpec(e.currentTarget.value, "");
                      e.currentTarget.value = "";
                    }
                  }}
                  className="px-3 py-2 rounded-md border bg-background text-sm"
                />
                <span className="text-sm text-muted-foreground py-2">
                  Press Enter to add new spec
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {product.enrichmentData != null && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                View Raw AI Data
              </summary>
              <pre className="mt-3 text-xs overflow-auto max-h-64 p-3 rounded bg-black text-green-400 font-mono">
                {JSON.stringify(product.enrichmentData, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
