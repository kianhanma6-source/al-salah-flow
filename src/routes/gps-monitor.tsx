import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DataTable, Panel, SearchBar } from "@/components/ui-kit";
import { useDB } from "@/lib/db";
import { flushQueue, fmtTime, resumeTracking } from "@/lib/attendance";

const LiveMap = lazy(() => import("@/components/LiveMap"));

export const Route = createFileRoute("/gps-monitor")({
  head: () => ({
    meta: [
      { title: "Live Employee GPS Monitoring | AL HAYAH AL SALAH" },
      {
        name: "description",
        content:
          "Live map of on-duty employees with moving markers, travel paths, readable addresses and offline points.",
      },
      { property: "og:title", content: "Live GPS Monitoring | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Track active employees and their travel routes live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell tab="gps">
      <ClientOnly fallback={null}>
        <GpsMonitor />
      </ClientOnly>
    </AppShell>
  ),
});

function GpsMonitor() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState("");

  useEffect(() => {
    resumeTracking();
    void flushQueue();
  }, []);

  const onDuty = useMemo(
    () => db.attendance.filter((a) => !a.timeOut),
    [db.attendance],
  );

  const listed = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return onDuty;
    return onDuty.filter((r) =>
      `${r.name} ${r.empId} ${r.team} ${r.plate}`.toLowerCase().includes(s),
    );
  }, [onDuty, q]);

  const selected = db.attendance.find((a) => a.id === focus);

  return (
    <div className="space-y-5">

      <Panel title="Live Map — Active Employees">
        <Suspense fallback={<div className="h-[420px] rounded-lg border border-border" />}>
          <LiveMap rows={listed} focusId={focus} onSelect={setFocus} />
        </Suspense>
      </Panel>

      <Panel title="Attendance Monitoring — Currently On Duty">
        <SearchBar value={q} set={setQ} />
        <div className="mt-4">
          <DataTable
            columns={["Name", "Team", "Time In", "Current Location", "Latitude", "Longitude", "Status"]}
            empty="No employee is currently on duty."
            rows={listed.map((r) => {
              const last = r.route[r.route.length - 1];
              return [
                <button
                  key="n"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => setFocus(r.id)}
                >
                  {r.name}
                </button>,
                r.team || "—",
                fmtTime(r.timeIn),
                last?.address ?? "Locating…",
                last ? last.lat.toFixed(6) : "—",
                last ? last.lng.toFixed(6) : "—",
                r.status,
              ];
            })}
          />
        </div>
      </Panel>

      {selected && (
        <Panel title={`Travel Path — ${selected.name}`}>
          <div className="flex items-center gap-4">
            {selected.photo && (
              <img
                src={selected.photo}
                alt={selected.name}
                className="size-20 rounded-full border-2 border-primary/60 object-cover"
              />
            )}
            <div className="text-xs text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">{selected.name}</p>
              <p>Time in: {fmtTime(selected.timeIn)}</p>
              <p>{selected.route.length} recorded location points</p>
            </div>
          </div>
          <div className="mt-4">
            <DataTable
              columns={["Time", "Latitude", "Longitude", "Address", "Accuracy", "Sync"]}
              rows={[...selected.route]
                .reverse()
                .map((p) => [
                  fmtTime(p.at),
                  p.lat.toFixed(6),
                  p.lng.toFixed(6),
                  p.address ?? "—",
                  p.acc ? `${p.acc.toFixed(0)} m` : "—",
                  p.synced === false ? "OFFLINE (queued)" : "UPLOADED",
                ])}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
