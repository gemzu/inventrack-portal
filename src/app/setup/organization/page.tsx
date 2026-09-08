"use client";

/**
 * Creating the organization.
 *
 * The first screen a new owner sees, and it was two glass cards side by side —
 * one with an icon tile and an "OWNER SETUP" eyebrow, one listing what would
 * happen next with a tick beside each line, including that a row would be
 * written to Supabase. Nobody creating a company needs to know which database
 * it lands in.
 *
 * One field, one button, and a short honest note about what it does to your
 * account.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createOrganization, assignOwnerToOrganization } from "@/lib/dataService";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import { Rule } from "@/components/console/surfaces";
import { Action, Field, Input } from "@/components/console/controls";

export default function SetupOrganizationPage() {
  const { user, userRole, orgId, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (orgId) {
      router.replace("/dashboard");
      return;
    }
    if (userRole && userRole !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, userRole, orgId, loading, router]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const org = (await createOrganization({ name: name.trim(), ownerId: user.id })) as {
        id: string;
      };
      await assignOwnerToOrganization(user.id, org.id);
      await refreshProfile();
      toast("Organization created", "success");
      router.replace("/dashboard");
    } catch (e) {
      toast((e as Error).message || "Failed to create organization", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="console mx-auto max-w-2xl px-5 py-14 lg:px-8">
      <PageShell
        title="Your organization"
        eyebrow="Setup"
        subtitle="This is the floor everything else hangs off — stock, people, orders. You will be its owner."
      >
        <div className="space-y-10">
          <div className="reveal space-y-5">
            <Field label="Name" hint="Your legal name or your operating brand. It can be changed later.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Acme Warehousing"
                autoFocus
              />
            </Field>

            <Action solid onClick={create} disabled={!user || !name.trim() || saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Creating" : "Create it"}
            </Action>
          </div>

          <section className="space-y-4">
            <Rule label="What this does" />
            <ul className="reveal d1 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li>Makes you the owner, with full admin rights over everything in it.</li>
              <li>Gives you three invite codes — admin, worker and buyer — to hand out.</li>
              <li>Takes you to the console, where you set up sites and add stock.</li>
            </ul>
          </section>
        </div>
      </PageShell>
    </div>
  );
}
