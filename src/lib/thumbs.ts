/* Small copies of photos for lists: every photo has a 320 px copy at thumbs/<same path> in its bucket (made by the
   phone app at upload, older ones by the app repo's scripts/make-thumbs.mjs). ~20 KB instead of ~1 MB. If a small
   copy is missing, onThumbError switches the picture to the full photo. */
import type { SyntheticEvent } from "react";

const PUBLIC = /\/storage\/v1\/object\/public\/(chat-images|product-images)\//;

export function thumbUrl(url: string | null | undefined): string {
  if (!url || !PUBLIC.test(url) || url.includes("/thumbs/")) return url || "";
  return url.replace(PUBLIC, (m) => `${m}thumbs/`).split("?")[0];
}

export function onThumbError(full: string | null | undefined) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (full && img.src !== full) img.src = full;
  };
}
