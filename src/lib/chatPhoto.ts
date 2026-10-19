import { supabase } from "@/lib/supabase";

/* A photo for a message, stored where the phone app stores them
   (chat-images/<org>/<user>_<time>_<random>.<ext>). The link is public, so the
   name is unguessable rather than just a timestamp. */

export const MAX_CHAT_PHOTO_BYTES = 10 * 1024 * 1024;

function randomName(n = 12) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => a[b % a.length]).join("");
}

/** Why a picked file cannot be sent, or null if it can. */
export function chatPhotoProblem(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That is not a photo";
  if (file.size > MAX_CHAT_PHOTO_BYTES) return "Photo is over 10 MB";
  return null;
}

export async function uploadChatPhoto(orgId: string, userId: string, file: File): Promise<string> {
  const raw = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = /^[a-z0-9]{2,5}$/.test(raw) ? raw : "jpg";
  const path = `${orgId}/${userId}_${Date.now()}_${randomName()}.${ext}`;
  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
}
