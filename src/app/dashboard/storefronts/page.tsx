"use client";
import AdminGuard from "@/components/AdminGuard";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  ShoppingBag, Plus, Pencil, Trash2, 
  Tag, MapPin, Globe, Copy, Share2, X,
  ExternalLink
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";

interface Storefront {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  filterType: "all" | "category" | "facility";
  filterConfig: any;
  createdAt: string;
}

export default function StorefrontsPage() {
  const { orgId } = useAuth();
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Storefront | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    filterType: "all" as const
  });
  
  const { toast } = useToast();

  const loadStorefronts = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("storefronts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
      
    if (error) {
      toast("Failed to load storefronts", "error");
    } else {
      setStorefronts((data || []).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description || "",
        inviteCode: d.invite_code,
        filterType: d.filter_type || "all",
        filterConfig: d.filter_config || {},
        createdAt: d.created_at
      })));
    }
    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => { loadStorefronts(); }, [loadStorefronts]);

  const handleSave = async () => {
    if (!orgId || !form.name) return;
    try {
      if (editing) {
        const { error } = await supabase.from("storefronts").update({
          name: form.name,
          description: form.description,
          filter_type: form.filterType
        }).eq("id", editing.id);
        if (error) throw error;
        toast("Storefront updated", "success");
      } else {
        const { error } = await supabase.from("storefronts").insert({
          name: form.name,
          description: form.description,
          filter_type: form.filterType,
          org_id: orgId
        });
        if (error) throw error;
        toast("Storefront created", "success");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", description: "", filterType: "all" });
      await loadStorefronts();
    } catch (e) {
      toast("Failed to save storefront", "error");
    }
  };

  const handleDelete = async (sf: Storefront) => {
    if (!confirm(`Are you sure you want to delete "${sf.name}"? buyers will lose access.`)) return;
    try {
      const { error } = await supabase.from("storefronts").delete().eq("id", sf.id);
      if (error) throw error;
      setStorefronts(prev => prev.filter(s => s.id !== sf.id));
      toast("Storefront deleted", "success");
    } catch {
      toast("Failed to delete storefront", "error");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast("Invite code copied!", "success");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="animate-page-enter space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Storefronts</h1>
            <p className="text-sm text-muted-foreground">Manage curated views for your buyers</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", description: "", filterType: "all" }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> Create Storefront
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storefronts.map((sf) => (
            <Card key={sf.id} className="relative overflow-hidden group border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditing(sf); setForm({ name: sf.name, description: sf.description, filterType: sf.filterType }); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(sf)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1">{sf.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] mb-4">
                  {sf.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 mb-4 font-mono text-xs">
                  <span className="text-zinc-500">ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-500">{sf.inviteCode}</span>
                    <button onClick={() => copyCode(sf.inviteCode)} className="p-1 hover:text-indigo-400">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                    {sf.filterType === "all" ? <Globe className="w-3 h-3" /> : sf.filterType === "category" ? <Tag className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {sf.filterType}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500">
                    Active
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {storefronts.length === 0 && (
            <div className="col-span-full">
              <EmptyState 
                icon={ShoppingBag} 
                title="No Storefronts" 
                description="Storefronts allow you to share specific parts of your inventory with different buyers using unique codes." 
              />
            </div>
          )}
        </div>

        {/* Modal Overlay */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">{editing ? "Edit Storefront" : "Create Storefront"}</h3>
                  <button onClick={() => setShowForm(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Storefront Name</label>
                    <input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      placeholder="e.g. Premium Hub"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition min-h-[100px]"
                      placeholder="Who is this for?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Inventory Access</label>
                    <div className="grid grid-cols-1 gap-2">
                       <button 
                         onClick={() => setForm({...form, filterType: 'all'})}
                         className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${form.filterType === 'all' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                       >
                         <Globe className="w-4 h-4" />
                         <div className="text-left">
                           <div className="font-bold">Full Catalog</div>
                           <div className="text-[10px] opacity-70">Show all available inventory</div>
                         </div>
                       </button>

                       <button 
                         onClick={() => setForm({...form, filterType: 'category'})}
                         className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${form.filterType === 'category' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                       >
                         <Tag className="w-4 h-4" />
                         <div className="text-left">
                           <div className="font-bold">By Category</div>
                           <div className="text-[10px] opacity-70">Filter items by specific categories</div>
                         </div>
                       </button>

                       <button 
                         onClick={() => setForm({...form, filterType: 'facility'})}
                         className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${form.filterType === 'facility' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                       >
                         <MapPin className="w-4 h-4" />
                         <div className="text-left">
                           <div className="font-bold">By Facility</div>
                           <div className="text-[10px] opacity-70">Only show items from specific warehouses</div>
                         </div>
                       </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleSave}
                      className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/25"
                    >
                      {editing ? "Save Changes" : "Create Storefront"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
