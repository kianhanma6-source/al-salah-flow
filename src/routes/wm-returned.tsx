import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/wm-returned")({
  head: () => ({
    meta: [
      { title: "WM Returned / Scrap | AL HAYAH AL SALAH" },
      { name: "description", content: "Returned and scrapped water meter inventory with full transaction history." },
      { property: "og:title", content: "WM Returned / Scrap" },
      { property: "og:description", content: "Record returned and scrapped water meters and their history." },
    ],
  }),
  component: () => (
    <AppShell tab="wmreturn">
      <ModuleView moduleKey="wmreturn" title="WM Returned / Scrap" wm prefix="WMR" monitorLabel="Returned / Scrap History" />
    </AppShell>
  ),
});
