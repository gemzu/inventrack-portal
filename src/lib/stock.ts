import { supabase } from "@/lib/supabase";

/* Adding units to stock, in one place for every page that does it
   (approvals, receiving a purchase order).

   Each page used to do this its own way, and each got it wrong somewhere:
   - stock is unique per company and barcode (unique_org_barcode), and a
     page that always inserted failed on anything already in stock;
   - matching on barcode alone gave every barcode-less part a new line per
     delivery or approval (one customer had 18 lines of 1 for one part);
   - an insert or update that failed was not checked, so the page said the
     stock was in when it was not.
   Same rules as the app's addInventoryItem. Throws when nothing was saved. */

type AddStock = {
  orgId: string;
  barcode?: string | null;
  modelId?: string | null;
  quantity: number;
  /* Only used when a new line is created. */
  fields?: Record<string, unknown>;
  facilityId?: string | null;
  /* The submission's photos. Approving never carried them over, so once
     a submission was approved its pictures were gone from view. */
  photos?: string[];
};

const escapeLike = (s: string) => s.replace(/[%_\\]/g, (c) => "\\" + c);

async function findLine(orgId: string, barcode: string, model: string, facilityId?: string | null) {
  if (barcode) {
    const { data, error } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("org_id", orgId)
      .eq("barcode", barcode)
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }
  if (!model) return null;
  const { data, error } = await supabase
    .from("inventory")
    .select("id, quantity, barcode, facility_id")
    .eq("org_id", orgId)
    .ilike("model_id", escapeLike(model))
    .is("reserved_by", null)
    .is("sold_to", null)
    .is("box_id", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (
    (data || []).find(
      (r) => !String(r.barcode || "").trim() && (!facilityId || !r.facility_id || r.facility_id === facilityId)
    ) ?? null
  );
}

async function addTo(line: { id: string; quantity: number | null }, quantity: number, photos: string[] = []) {
  const patch: Record<string, unknown> = { quantity: (Number(line.quantity) || 0) + quantity };
  if (photos.length) {
    /* A line with no picture yet takes the submission's. */
    const { data: cur } = await supabase.from("inventory").select("image_url").eq("id", line.id).maybeSingle();
    if (!cur?.image_url) { patch.image_url = photos[0]; patch.image_urls = photos.slice(0, 5); }
  }
  const { data, error } = await supabase
    .from("inventory")
    .update(patch)
    .eq("id", line.id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("That stock line could not be updated (it may have just been deleted).");
}

export async function addStock({ orgId, barcode, modelId, quantity, fields, facilityId, photos = [] }: AddStock): Promise<"restocked" | "added"> {
  const code = String(barcode || "").trim();
  const model = String(modelId || "").trim();
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

  const existing = await findLine(orgId, code, model, facilityId);
  if (existing) {
    await addTo(existing, qty, photos);
    return "restocked";
  }

  const { error } = await supabase.from("inventory").insert({
    ...(fields || {}),
    ...(photos.length ? { image_url: photos[0], image_urls: photos.slice(0, 5) } : {}),
    org_id: orgId,
    barcode: code || null,
    model_id: model || code || null,
    quantity: qty,
    status: "available",
    facility_id: facilityId ?? null,
  });
  if (!error) return "added";

  /* Someone added the same barcode a moment ago: add to theirs. */
  if ((error as { code?: string }).code === "23505" && code) {
    const again = await findLine(orgId, code, model, facilityId);
    if (again) {
      await addTo(again, qty, photos);
      return "restocked";
    }
  }
  throw error;
}
