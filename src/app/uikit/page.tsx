"use client";
// TEMP showcase route for visual verification of the Kinetic Ink design system.
// Delete before shipping.
import { Package, ShoppingCart, TrendingUp, ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stagger, StaggerItem, MotionCard, AnimatedNumber } from "@/components/motion/primitives";

export default function UIKit() {
  return (
    <div className="min-h-screen p-10 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-display font-extrabold">Kinetic <span className="text-brand-gradient">Ink</span></h1>
        <p className="text-muted-foreground mt-2">Design system preview — buttons, badges, animated stat tiles.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button variant="brand">Brand action</Button>
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant="brand">Brand</Badge>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Danger</Badge>
      </div>

      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Items", value: 1284, icon: Package, accent: true },
          { label: "Orders", value: 342, icon: ShoppingCart },
          { label: "Fulfillment", value: 96, icon: TrendingUp, suffix: "%" },
        ].map((k) => (
          <StaggerItem key={k.label}>
            <MotionCard className="p-5 group overflow-hidden" glow={k.accent}>
              {k.accent && <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl" />}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-3xl font-display font-bold mt-2"><AnimatedNumber value={k.value} />{k.suffix}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.accent ? "bg-brand-gradient text-white" : "bg-secondary"}`}>
                  <k.icon className="w-5 h-5" />
                </div>
              </div>
            </MotionCard>
          </StaggerItem>
        ))}
      </Stagger>

      <Stagger className="grid sm:grid-cols-2 gap-4">
        <StaggerItem>
          <MotionCard className="p-5 flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-brand-gradient group-hover:text-white transition-all">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Import Inventory</p>
              <p className="text-sm text-muted-foreground">Upload CSV to add items</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
          </MotionCard>
        </StaggerItem>
        <StaggerItem>
          <MotionCard interactive={false} className="p-5">
            <p className="font-semibold mb-2">Glass surface</p>
            <p className="text-sm text-muted-foreground">Backdrop blur + glow on a colored field.</p>
          </MotionCard>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
