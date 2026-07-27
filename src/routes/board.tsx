import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Board Parts Inventory | AL HAYAH AL SALAH" },
      { name: "description", content: "Board parts inventory, deployment and stock monitoring module." },
      { property: "og:title", content: "Board Parts Inventory" },
      { property: "og:description", content: "Manage board parts stock, deployments and critical levels." },
    ],
  }),
  component: () => (
    <AppShell tab="board">
      <ModuleView moduleKey="board" title="Board Parts" prefix="BRD" monitorLabel="Monitoring" />
    </AppShell>
  ),
});
