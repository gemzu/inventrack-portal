"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Layer from "@/components/Layer";

/* Full-size photos. Every photo on the site was a thumbnail with nothing
   behind it - "when I select the picture does it not maximize" (customer,
   2026-10-15). Click a photo to open it; arrows or the buttons step through
   an item's photos; Esc, the close button or a click outside closes it. */

type Props = { photos: string[]; start?: number; onClose: () => void };

export default function PhotoViewer({ photos, start = 0, onClose }: Props) {
  const [i, setI] = useState(Math.min(Math.max(start, 0), Math.max(photos.length - 1, 0)));
  const many = photos.length > 1;
  const prev = useCallback(() => setI((n) => (n - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setI((n) => (n + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (many && e.key === "ArrowLeft") prev();
      else if (many && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [many, prev, next, onClose]);

  if (!photos.length) return null;

  return (
    <Layer>
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[i]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <button
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {many && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="mono absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-white">
            {i + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
    </Layer>
  );
}
