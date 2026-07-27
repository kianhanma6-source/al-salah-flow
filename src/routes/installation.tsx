import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/installation")({
  head: () => ({
    meta: [
      { title: "Installation Inventory | AL HAYAH AL SALAH" },
      { name: "description", content: "Installation materials inventory, deployment and monitoring module." },
      { property: "og:title", content: "Installation Inventory" },
      { property: "og:description", content: "Manage installation stock, deployments and critical levels." },
    ],
  }),
  component: () => (
    <AppShell tab="installation">
      <ModuleView moduleKey="installation" title="Installation" prefix="INS" monitorLabel="Monitoring" />
    </AppShell>
  ),
});
