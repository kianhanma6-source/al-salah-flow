import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Database, Download, FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui-kit";
import { getDB, useDB } from "@/lib/db";
import { backupJson, exportAllExcel, exportAllPDF, importAllExcel, restoreJson } from "@/lib/reports";
import { exportAllExcelWithImages, importAllExcelWithImages } from "@/lib/excel-images";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Data Center | AL HAYAH AL SALAH" },
      { name: "description", content: "Auto-backup, JSON restore, full Excel export/import and PDF export of all system data." },
      { property: "og:title", content: "Backup & Data Center" },
      { property: "og:description", content: "Protect and move all system data safely." },
    ],
  }),
  component: () => (
    <AppShell tab="backup">
      <BackupPage />
    </AppShell>
  ),
});

const AUTO_KEY = "ahas_autobackup_day";

function BackupPage() {
  const db = useDB();
  const jsonRef = useRef<HTMLInputElement>(null);
  const xlsRef = useRef<HTMLInputElement>(null);
  const imgXlsRef = useRef<HTMLInputElement>(null);

  // Auto-backup once per calendar day.
  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(AUTO_KEY) !== day) {
      localStorage.setItem(AUTO_KEY, day);
      backupJson(getDB());
      toast.success(`Auto-backup created: db_${day.replace(/-/g, "")}.json`);
    }
  }, []);

  const counts = Object.entries(db.modules).map(([k, m]) => ({
    key: k,
    inv: m.inventory.length,
    dep: m.deployment.length,
  }));

  return (
    <div className="space-y-5">
      <Panel title="Data Center">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button className="btn-3d" onClick={() => backupJson(getDB())}>
            <Database className="size-4" /> Backup db_date.json
          </button>
          <button className="btn-3d" onClick={() => jsonRef.current?.click()}>
            <Upload className="size-4" /> Restore all data
          </button>
          <button className="btn-3d" onClick={() => exportAllExcel(getDB())}>
            <FileSpreadsheet className="size-4" /> Export all Excel
          </button>
          <button className="btn-3d" onClick={() => xlsRef.current?.click()}>
            <Download className="size-4" /> Import all Excel
          </button>
          <button className="btn-3d" onClick={() => exportAllPDF(getDB())}>
            <FileDown className="size-4" /> PDF all data
          </button>
          <button
            className="btn-3d"
            onClick={async () => {
              await exportAllExcelWithImages(getDB());
              toast.success("Excel exported with photos.");
            }}
          >
            <FileSpreadsheet className="size-4" /> Export Excel + photos
          </button>
          <button className="btn-3d" onClick={() => imgXlsRef.current?.click()}>
            <Upload className="size-4" /> Import Excel + photos
          </button>
        </div>
        <input
          ref={jsonRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            await restoreJson(f);
            toast.success("All data restored.");
          }}
        />
        <input
          ref={xlsRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            await importAllExcel(f);
            toast.success("Excel data imported.");
          }}
        />
        <input
          ref={imgXlsRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await importAllExcelWithImages(f);
              toast.success("Data and photos restored from Excel.");
            } catch {
              toast.error("Could not read that workbook.");
            }
          }}
        />
      </Panel>

      <Panel title="Current Records">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((c) => (
            <div key={c.key} className="rounded-lg border border-border bg-black/20 p-4">
              <p className="display text-xs font-bold uppercase tracking-widest text-primary">{c.key}</p>
              <p className="mt-2 text-sm">
                {c.inv} inventory · {c.dep} deployment
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-border bg-black/20 p-4">
            <p className="display text-xs font-bold uppercase tracking-widest text-primary">accomplishment</p>
            <p className="mt-2 text-sm">{db.accomplishment.length} records</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
