import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { canAccess, useAuth, type TabKey } from "@/lib/auth";
import { computeStock, useDB } from "@/lib/db";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | AL HAYAH AL SALAH System Management" },
      { name: "description", content: "Live stock, deployment and critical-item overview across all modules." },
      { property: "og:title", content: "Dashboard | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Live stock and deployment overview across all modules." },
    ],
  }),
  component: () => (
    <AppShell tab="dashboard">
      <Dashboard />
    </AppShell>
  ),
});

const MODULES: { key: TabKey; mod: "logistic" | "board" | "installation" | "wm" | "wmreturn"; to: string; label: string }[] = [
  { key: "logistic", mod: "logistic", to: "/logistic", label: "Logistic" },
  { key: "board", mod: "board", to: "/board", label: "Board Parts" },
  { key: "installation", mod: "installation", to: "/installation", label: "Installation" },
  { key: "wm", mod: "wm", to: "/wm-deployment", label: "WM Deployment" },
  { key: "wmreturn", mod: "wmreturn", to: "/wm-returned", label: "WM Returned / Scrap" },
];

function Dashboard() {
  const db = useDB();
  const { user: session } = useAuth();
  const user = db.users.find((u) => u.id === session?.id) ?? session;
  const allowed = MODULES.filter((m) => canAccess(user, m.key));


  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allowed.map((m) => {
        const stock = computeStock(db.modules[m.mod]);
        const critical = stock.filter((s) => s.status === "CRITICAL").length;
        const low = stock.filter((s) => s.status === "LOW STOCK").length;
        return (
          <Link key={m.key} to={m.to} className="panel-3d block p-5 transition-transform hover:-translate-y-1">
            <h2 className="display text-sm font-bold uppercase tracking-widest text-primary">{m.label}</h2>
            <p className="mt-3 text-3xl font-bold">{stock.length}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Item types tracked</p>
            <div className="mt-3 flex gap-3 text-[11px] font-semibold">
              <span className="text-destructive">{critical} critical</span>
              <span className="text-warning">{low} low stock</span>
            </div>
          </Link>
        );
      })}
      {allowed.length === 0 && (
        <div className="panel-3d p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
          No modules are authorized for your role ({user?.role}).
        </div>
      )}
    </div>
  );
}
