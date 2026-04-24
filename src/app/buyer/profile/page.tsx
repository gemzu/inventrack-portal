"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getMyStorefronts } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/Toast";

export default function BuyerProfilePage() {
  const { user, userName, logout } = useAuth();
  const { toast } = useToast();
  const [storefronts, setStorefronts] = useState<Array<Record<string, unknown>>>([]);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");

  useEffect(() => {
    if (!user) return;
    getMyStorefronts(user.id).then((rows) => setStorefronts(rows as Array<Record<string, unknown>>)).catch(() => setStorefronts([]));
  }, [user]);

  return (
    <PageShell title="Profile" subtitle={userName || user?.email || "Buyer"}>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="text-sm text-muted-foreground">Email: {user?.email}</div>
          <div className="text-sm text-muted-foreground">Connected storefronts: {storefronts.length}</div>
          <Button variant="outline" onClick={async () => { await logout(); window.location.href = "/login"; }}>Logout</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-medium">MFA</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Buyer Device" });
                  if (error) throw error;
                  setFactorId(data.id);
                  setQr(data.totp.qr_code);
                } catch (e) {
                  toast((e as Error).message || "Failed to enroll MFA", "error");
                }
              }}
            >
              Enroll MFA
            </Button>
            <Button
              variant="outline"
              disabled={!factorId}
              onClick={async () => {
                const { data, error } = await supabase.auth.mfa.challenge({ factorId });
                if (error) throw error;
                setChallengeId(data.id);
              }}
            >
              Challenge
            </Button>
          </div>
          {qr ? <img src={qr} alt="MFA QR Code" className="w-48 h-48 rounded border" /> : null}
          <div className="flex gap-2">
            <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button
              disabled={!challengeId || !code}
              onClick={async () => {
                const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
                if (error) throw error;
                toast("MFA verified", "success");
              }}
            >
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

