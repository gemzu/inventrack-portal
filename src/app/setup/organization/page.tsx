"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createOrganization, assignOwnerToOrganization } from "@/lib/dataService";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import GlassCard from "@/components/glass-card";

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

  return (
    <PageShell title="Create Organization" subtitle="Set up your business workspace to continue">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <GlassCard className="border-primary/20 bg-card/70">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-primary/80 font-medium">Owner Setup</div>
                  <h2 className="text-2xl font-bold leading-tight mt-1">Create your organization</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    This creates your company workspace and makes you the owner with full control.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Organization name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Warehousing"
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Use your legal business name or your operating brand.
                </p>
              </div>

              <Button
                size="lg"
                className="w-full sm:w-auto"
                disabled={!user || !name.trim() || saving}
                onClick={async () => {
                  if (!user || !name.trim()) return;
                  setSaving(true);
                  try {
                    const org = await createOrganization({ name: name.trim(), ownerId: user.id }) as { id: string };
                    await assignOwnerToOrganization(user.id, org.id);
                    await refreshProfile();
                    toast("Organization created", "success");
                    router.replace("/dashboard");
                  } catch (e) {
                    toast((e as Error).message || "Failed to create organization", "error");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating workspace...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          <Card className="border-border/70">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">What happens next</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                  <span>Your organization profile is created in Supabase.</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                  <span>Your account is assigned as <strong>Owner</strong> with full admin rights.</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Building2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>You are redirected to dashboard where you can invite your team and configure facilities.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

