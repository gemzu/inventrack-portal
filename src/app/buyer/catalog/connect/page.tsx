"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { connectToStorefront, getStorefrontByCode } from "@/lib/dataService";
import { useToast } from "@/components/Toast";

export default function ConnectStorefrontPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <PageShell title="Connect Storefront" subtitle="Enter an invite code to connect">
      <Card>
        <CardContent className="p-6 space-y-4">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ORG-XXXX" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setLoading(true);
                  const sf = await getStorefrontByCode(code.trim());
                  setPreview(sf as Record<string, unknown> | null);
                  if (!sf) toast("No active storefront found for that code", "error");
                } catch (e) {
                  toast((e as Error).message || "Failed to preview storefront", "error");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!code.trim() || loading}
            >
              Preview
            </Button>
            <Button
              onClick={async () => {
                if (!user || !preview?.id) return;
                try {
                  setLoading(true);
                  await connectToStorefront(user.id, String(preview.id));
                  toast("Storefront connected", "success");
                  router.push("/buyer/catalog");
                } catch (e) {
                  toast((e as Error).message || "Failed to connect storefront", "error");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!preview || loading}
            >
              Confirm Connect
            </Button>
          </div>
          {preview ? (
            <div className="rounded-lg border p-4 text-sm">
              <div className="font-medium">{String(preview.name || "Storefront")}</div>
              <div className="text-muted-foreground">Code: {String(preview.inviteCode || code)}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}

