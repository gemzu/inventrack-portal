"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "@/components/motion/primitives";

const COLORS: Record<string, string> = {
  Available: "#10b981",
  Reserved: "#f59e0b",
  Sold: "#8b5cf6",
};

export default function InventoryDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-sm text-muted-foreground">
        No inventory yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[160px] h-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name] || "#a1a1aa"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-display font-bold leading-none">
            <AnimatedNumber value={total} />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Items</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3 min-w-0">
        {data.map((d) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[d.name] || "#a1a1aa" }} />
              <span className="text-sm flex-1 min-w-0 truncate">{d.name}</span>
              <span className="text-sm font-semibold tabular-nums">{d.value}</span>
              <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
