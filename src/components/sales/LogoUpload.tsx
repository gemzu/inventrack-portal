"use client";

/**
 * A company's logo, uploaded from this computer (or pasted as a link). Files go to the "company-logos" bucket,
 * into the account's own folder; the database lets only people with Sales and invoices do that. The value is the
 * public link, which is what invoices print. Removing a logo only clears the link: issued invoices keep their own
 * copy of the link, so the file is left in place and old invoices still print.
 */

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Action, Field, Input } from "@/components/console/controls";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX = 2 * 1024 * 1024;

export default function LogoUpload({ value, onChange, name }: { value: string; onChange: (url: string) => void; name?: string }) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(true);
  const link = value.trim();
  const bad = !!link && !/^https:\/\//.test(link);

  const upload = async (file: File | undefined) => {
    if (!file || !orgId) return;
    const ext = TYPES[file.type];
    if (!ext) { toast("Use a PNG, JPG or WebP image", "error"); return; }
    if (file.size > MAX) { toast("That image is over 2 MB. Use a smaller one.", "error"); return; }
    setBusy(true);
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setBusy(false);
    if (error) { toast(`Logo not uploaded: ${error.message}`, "error"); return; }
    setOk(true);
    onChange(supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl);
    toast("Logo uploaded. Save to keep it.", "success");
  };

  return (
    <Field label="Logo on invoices (optional)"
      hint={bad ? "The link must start with https://" : "PNG, JPG or WebP, up to 2 MB. A wide logo on a white or clear background prints best."}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-20 w-44 items-center justify-center rounded-md border border-dashed border-border bg-white p-2">
            {link && !bad && ok
              // eslint-disable-next-line @next/next/no-img-element -- the company's own logo, any host
              ? <img src={link} alt={`${name || "Company"} logo preview`} className="max-h-16 max-w-full object-contain" onError={() => setOk(false)} />
              : <span className="text-center text-[11px] text-neutral-500">{ok ? "No logo" : "Could not load that image"}</span>}
          </div>
          <input ref={pick} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          <Action onClick={() => pick.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload logo
          </Action>
          {link ? <Action onClick={() => { onChange(""); setOk(true); }}>Remove</Action> : null}
        </div>
        <Input value={value} onChange={(e) => { onChange(e.target.value); setOk(true); }} placeholder="or paste a link (https://)" aria-label="Logo link"
          aria-invalid={bad} className={bad ? "border-destructive" : ""} />
      </div>
    </Field>
  );
}
