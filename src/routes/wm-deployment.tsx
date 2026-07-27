import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/wm-deployment")({
  head: () => ({
    meta: [
      { title: "WM Deployment | AL HAYAH AL SALAH" },
      { name: "description", content: "Water meter inventory, deployment and full transaction history." },
      { property: "og:title", content: "WM Deployment" },
      { property: "og:description", content: "Track water meter units, keys and deployment history." },
    ],
  }),
  component: () => (
    <AppShell tab="wm">
      <ModuleView moduleKey="wm" title="WM Deployment" wm prefix="WM" monitorLabel="Deployment History" />
    </AppShell>
  ),
});
