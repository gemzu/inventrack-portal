"use client";

/**
 * Connect to a supplier.
 *
 * The join code is the whole screen, so it is the only thing set large. Look
 * up first, then connect — the preview exists so you can check you are joining
 * the right supplier before you are in their system, which is worth two clicks.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { connectToStorefront, getStorefrontByCode, getMyStorefronts } from "@/lib/dataService";
import { useToast } from "@/components/Toast";
import { ArrowRight } from "lucide-react";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import { Panel, Rule, ColHead } from "@/components/console/surfaces";
import { Action, Field, Input } from "@/components/console/controls";

type Preview = {
  id?: string;
  name?: string;
  description?: string;
  inviteCode?: string;
  filterType?: string;
} | null;

export default function ConnectStorefrontPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Preview>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<Array<{ storefront?: { id?: string; name?: string } }>>([]);

  useEffect(() => {
    if (!user) return;
    getMyStorefronts(user.id)
      .then((sf) => setConnected(sf as Array<{ storefront?: { id?: string; name?: string } }>))
      .catch(() => {});
  }, [user]);

  const lookUp = async () => {
    try {
      setLoading(true);
      const sf = await getStorefrontByCode(code.trim());
      setPreview(sf as Preview);
      if (!sf) toast("No supplier uses that code", "error");
    } catch (e) {
      toast((e as Error).message || "Could not look that up", "error");
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    if (!user || !preview?.id) return;
    try {
      setLoading(true);
      await connectToStorefront(user.id, String(preview.id));
      toast("Connected. Their catalog is open now.", "success");
      router.push("/buyer/catalog");
    } catch (e) {
      toast((e as Error).message || "Could not connect", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title="Suppliers"
        eyebrow="Buying"
        subtitle="A supplier gives you a join code. Enter it and their catalog opens."
      >
        <div className="space-y-12">
          {/* ── Connect ──────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule label="Join a supplier" />
            <div className="reveal space-y-5">
              <Field label="Join code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && lookUp()}
                  placeholder="STORE-XXXX"
                  className="mono text-base tracking-[0.14em]"
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <Action onClick={lookUp} disabled={!code.trim() || loading}>
                  Look it up
                </Action>
                <Action solid onClick={connect} disabled={!preview || loading}>
                  Connect <ArrowRight className="h-3.5 w-3.5" />
                </Action>
              </div>

              {preview ? (
                <Panel live className="p-6">
                  <p className="font-display text-lg font-bold tracking-[-0.02em]">
                    {preview.name || "Storefront"}
                  </p>
                  <p className="mono mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {preview.inviteCode || code}
                    {preview.filterType ? ` · ${preview.filterType} items` : ""}
                  </p>
                  {preview.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {preview.description}
                    </p>
                  )}
                </Panel>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Look a code up before connecting, so you can check it is the supplier you meant.
                </p>
              )}
            </div>
          </section>

          {/* ── Already joined ───────────────────────────────── */}
          {connected.length > 0 && (
            <section className="space-y-5">
              <Rule label="Already joined" />
              <Panel className="reveal">
                {connected.map((sf, i) => (
                  <Link
                    key={sf.storefront?.id || i}
                    href="/buyer/catalog"
                    className="row-line group flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <span className="truncate text-sm font-medium">
                      {sf.storefront?.name || "Storefront"}
                    </span>
                    <div className="flex shrink-0 items-center gap-4">
                      <Status status="active" label="Connected" />
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </Panel>
            </section>
          )}

          <section className="space-y-5">
            <Rule label="Talk to them" />
            <Link
              href="/buyer/messages"
              className="panel panel-hover reveal flex items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">Message a supplier</p>
                <ColHead className="mt-1 block">About an order, or before you place one</ColHead>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          </section>
        </div>
      </PageShell>
    </div>
  );
}
