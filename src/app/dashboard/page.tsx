"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Package, ShoppingCart, Users as UsersIcon, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#16a34a", "#d97706", "#2563eb", "#dc2626"];

export default function DashboardPage() {
  const { orgId } = useAuth();
  const [stats, setStats] = useState({ items: 0, lowStock: 0, orders: 0, users: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ id: string; barcode: string; action: string; scannedBy: string; createdAt: unknown }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      try {
        const invSnap = await getDocs(query(collection(db, "inventory"), where("orgId", "==", orgId)));
        const items = invSnap.docs;
        const available = items.filter((d) => d.data().status === "available").length;
        const reserved = items.filter((d) => d.data().status === "reserved").length;
        const sold = items.filter((d) => d.data().status === "sold").length;
        const lowStock = items.filter((d) => (d.data().quantity || 0) <= 2 && d.data().status === "available").length;

        const ordSnap = await getDocs(query(collection(db, "orders"), where("orgId", "==", orgId)));
        const usrSnap = await getDocs(query(collection(db, "users"), where("orgId", "==", orgId)));

        setStats({
          items: items.length,
          lowStock,
          orders: ordSnap.size,
          users: usrSnap.size,
        });

        setStatusData([
          { name: "Available", value: available },
          { name: "Reserved", value: reserved },
          { name: "Sold", value: sold },
        ].filter((d) => d.value > 0));

        const logSnap = await getDocs(
          query(collection(db, "scan_logs"), where("orgId", "==", orgId), orderBy("createdAt", "desc"), limit(10))
        );
        setRecentLogs(logSnap.docs.map((d) => ({ id: d.id, ...d.data() } as typeof recentLogs[0])));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId]);

  const kpis = [
    { label: "Total Items", value: stats.items, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-accent", bg: "bg-accent/10" },
    { label: "Users", value: stats.users, icon: UsersIcon, color: "text-success", bg: "bg-success/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Welcome to INVENTRACK</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            You&apos;re not part of an organization yet. Download the mobile app and join or create an organization to get started.
          </p>
          <div className="space-y-3">
            <a
              href="/dashboard/billing"
              className="block py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/25"
            >
              View Subscription
            </a>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Use the INVENTRACK mobile app to create or join an organization
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Overview of your warehouse operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <TrendingUp className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Inventory by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No inventory data yet
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Summary</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kpis.map((k) => ({ name: k.label, value: k.value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--muted)" }} />
              <YAxis fontSize={12} tick={{ fill: "var(--muted)" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        {recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="text-sm font-medium">{log.barcode}</span>
                  <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary">{log.action}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{log.scannedBy}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDateTime(log.createdAt as { seconds: number })}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No recent activity</p>
        )}
      </div>
    </div>
  );
}
