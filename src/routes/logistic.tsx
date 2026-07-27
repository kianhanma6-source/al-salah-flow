import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/logistic")({
  head: () => ({
    meta: [
      { title: "Logistic Inventory & Deployment | AL HAYAH AL SALAH" },
      { name: "description", content: "Logistic inventory, deployment and stock monitoring for AL HAYAH AL SALAH Electronics Devices and Rep." },
      { property: "og:title", content: "Logistic Inventory & Deployment" },
      { property: "og:description", content: "Track logistic materials, deployments and critical stock levels." },
    ],
  }),
  component: () => (
    <AppShell tab="logistic">
      <ModuleView moduleKey="logistic" title="Logistic" prefix="LOG" monitorLabel="Monitoring" />
    </AppShell>
  ),
});
