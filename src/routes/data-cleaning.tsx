import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Eraser, List, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, Select } from "@/components/ui-kit";
import { setDB, useDB, type DB, type ModuleKey } from "@/lib/db";

export const Route = createFileRoute("/data-cleaning")({
  head: () => ({
    meta: [
      { title: "Data Cleaning | AL HAYAH AL SALAH" },
      { name: "description", content: "Restricted record-cleaning console for deleting single records, date ranges or whole modules." },
      { property: "og:title", content: "Data Cleaning" },
      { property: "og:description", content: "Safely purge transaction records without touching accounts or branding." },
    ],
  }),
  component: () => (
    <AppShell tab="cleaning">
      <DataCleaningPage />
    </AppShell>
  ),
});

interface CleanRow {
  id: string;
  date: string;
  ref: string;
  detail: string;
}

const MODULE_LABELS: Record<ModuleKey, string> = {
  logistic: "Logistic",
  board: "Board Parts",
  installation: "Installation",
  wm: "WM Deployment",
  wmreturn: "WM Returned / Scrap",
};

type TargetKey = string;

const TARGETS: { key: TargetKey; label: string }[] = [
  ...(Object.keys(MODULE_LABELS) as ModuleKey[]).flatMap((m) => [
    { key: `${m}:inventory`, label: `${MODULE_LABELS[m]} / Inventory` },
    { key: `${m}:deployment`, label: `${MODULE_LABELS[m]} / Deployment` },
  ]),
  { key: "accomplishment:accomplishment", label: "Accomplishment / Records" },
];

function readRows(db: DB, target: TargetKey): CleanRow[] {
  const [mod, kind] = target.split(":");
  if (mod === "accomplishment")
    return db.accomplishment.map((a) => ({
      id: a.id,
      date: a.date,
      ref: a.activity || "—",
      detail: `${a.name} · ${a.area} · qty ${a.qty}`,
    }));
  const m = db.modules[mod as ModuleKey];
  if (kind === "inventory")
    return m.inventory.map((i) => ({
      id: i.id,
      date: i.date,
      ref: i.transNo,
      detail: `${i.materialName} · ${i.model} · ${i.qty} ${i.unit}`,
    }));
  return m.deployment.map((d) => ({
    id: d.id,
    date: d.date,
    ref: d.transNo,
    detail: `${d.name} · ${d.area} · ${d.lines.length} line(s)`,
  }));
}

function writeFiltered(target: TargetKey, keep: (id: string) => boolean) {
  const [mod, kind] = target.split(":");
  setDB((db) => {
    if (mod === "accomplishment")
      return { ...db, accomplishment: db.accomplishment.filter((r) => keep(r.id)) };
    const k = mod as ModuleKey;
    const m = db.modules[k];
    const next =
      kind === "inventory"
        ? { ...m, inventory: m.inventory.filter((r) => keep(r.id)) }
        : { ...m, deployment: m.deployment.filter((r) => keep(r.id)) };
    return { ...db, modules: { ...db.modules, [k]: next } };
  });
}

function DataCleaningPage() {
  const db = useDB();
  const [target, setTarget] = useState<TargetKey>(TARGETS[0].key);
  const [showList, setShowList] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<CleanRow[] | null>(null);

  const rows = readRows(db, target);
  const label = TARGETS.find((t) => t.key === target)?.label ?? target;

  const inRange = (r: CleanRow) => (!from || r.date >= from) && (!to || r.date <= to);

  const delOne = (r: CleanRow) => {
    if (!confirm(`Delete this record?\n\n${r.ref} — ${r.detail}`)) return;
    writeFiltered(target, (id) => id !== r.id);
    setPreview(null);
    toast.success("Record deleted.");
  };

  const delRange = () => {
    const hits = rows.filter(inRange);
    if (!hits.length) return toast.error("No records in this range.");
    if (!confirm(`Delete ${hits.length} record(s) from ${from || "start"} to ${to || "today"}?`)) return;
    const ids = new Set(hits.map((h) => h.id));
    writeFiltered(target, (id) => !ids.has(id));
    setPreview(null);
    toast.success(`${hits.length} record(s) deleted.`);
  };

  const delAll = () => {
    if (!rows.length) return toast.error("This module has no records.");
    if (
      !confirm(
        `YOU ARE ABOUT TO DELETE EVERY RECORD IN THIS MODULE (${label}). THIS CANNOT BE UNDONE.`,
      )
    )
      return;
    writeFiltered(target, () => false);
    setPreview(null);
    toast.success("All records in this module were deleted.");
  };

  return (
    <div className="space-y-5">
      <Panel title="Step 1 · Select what to delete">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Module / Record type">
            <Select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setShowList(false);
                setPreview(null);
              }}
            >
              {TARGETS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="self-end text-xs text-muted-foreground">
            {rows.length} record(s) currently stored in <b>{label}</b>.
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-[11px] uppercase tracking-wider text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          Fully protected — system settings, user accounts and re-branding are never deleted here.
        </p>
      </Panel>

      <Panel
        title="Option 1 · Delete single record"
        actions={
          <button className="btn-ghost-3d" onClick={() => setShowList((v) => !v)}>
            <List className="size-4" /> {showList ? "Hide records" : "Show records"}
          </button>
        }
      >
        {showList ? (
          <DataTable
            columns={["Ref / Trans No", "Date", "Details", "Action"]}
            rows={rows.map((r) => [
              r.ref,
              r.date,
              r.detail,
              <button className="btn-ghost-3d px-2" onClick={() => delOne(r)}>
                <Trash2 className="size-3.5" />
              </button>,
            ])}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Click “Show records” to list every record in this module.</p>
        )}
      </Panel>

      <Panel
        title="Option 2 · Delete by date range"
        actions={
          <>
            <button className="btn-ghost-3d" onClick={() => setPreview(rows.filter(inRange))}>
              <List className="size-4" /> Preview records
            </button>
            <button className="btn-3d" onClick={delRange}>
              <Eraser className="size-4" /> Delete all in this range
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="End date">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {preview && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              Total found: {preview.length}
            </p>
            <DataTable
              columns={["Ref / Trans No", "Date", "Details"]}
              rows={preview.map((r) => [r.ref, r.date, r.detail])}
            />
          </div>
        )}
      </Panel>

      <Panel title="Option 3 · Delete all records in module">
        <p className="text-xs text-muted-foreground">
          Removes every record inside <b>{label}</b>. This cannot be undone.
        </p>
        <button className="btn-3d mt-3" onClick={delAll}>
          <Trash2 className="size-4" /> Delete all records in this module
        </button>
      </Panel>
    </div>
  );
}
