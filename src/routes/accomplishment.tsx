import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, FileSpreadsheet, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ComboBox, DataTable, Field, Input, Panel, PhotoInput } from "@/components/ui-kit";
import { canWrite, useAuth } from "@/lib/auth";
import { setDB, today, uid, useDB, type AccomplishmentRow } from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/accomplishment")({
  head: () => ({
    meta: [
      { title: "Accomplishment Report | AL HAYAH AL SALAH" },
      { name: "description", content: "Daily field accomplishment logging with photos, areas and activity quantities." },
      { property: "og:title", content: "Accomplishment Report" },
      { property: "og:description", content: "Log and export daily field accomplishments." },
    ],
  }),
  component: () => (
    <AppShell tab="accomplishment">
      <AccomplishmentPage />
    </AppShell>
  ),
});

const blank = (): AccomplishmentRow => ({
  id: "",
  date: today(),
  name: "",
  area: "",
  activity: "",
  photo: "",
  qty: 0,
});

function AccomplishmentPage() {
  const db = useDB();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const [form, setForm] = useState(blank());
  const [q, setQ] = useState("");

  const rows = db.accomplishment
    .filter((r) => [r.date, r.name, r.area, r.activity].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!form.name || !form.activity) return toast.error("Name and activity are required.");
    setDB((d) => {
      const list = [...d.accomplishment];
      if (form.id) list[list.findIndex((r) => r.id === form.id)] = { ...form, qty: Number(form.qty) };
      else list.push({ ...form, id: uid(), qty: Number(form.qty) });
      return { ...d, accomplishment: list };
    });
    toast.success(form.id ? "Record updated." : "Record added.");
    setForm(blank());
  };

  const remove = (id: string) => {
    if (!confirm("Delete this accomplishment record?")) return;
    setDB((d) => ({ ...d, accomplishment: d.accomplishment.filter((r) => r.id !== id) }));
    toast.success("Record deleted.");
  };

  return (
    <div className="space-y-5">
      <Panel title="Search All Accomplishment Data">
        <Field label="Search (date, name, area, activity)">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
        </Field>
      </Panel>

      {writable && (
        <Panel
          title="Accomplishment Data Entry"
          actions={
            <>
              <button className="btn-3d" onClick={save}>
                <Save className="size-4" /> {form.id ? "Update" : "Add"}
              </button>
              <button className="btn-ghost-3d" onClick={() => setForm(blank())}>
                <X className="size-4" /> Clear
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Name">
              <ComboBox field="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </Field>
            <Field label="Area">
              <ComboBox field="area" value={form.area} onChange={(v) => setForm({ ...form, area: v })} />
            </Field>
            <Field label="Activity">
              <ComboBox field="activity" value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} />
            </Field>
            <Field label="Photo 6x6 (auto-resize ≤80KB)">
              <PhotoInput value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} />
            </Field>
            <Field label="Qty">
              <Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            </Field>
          </div>
        </Panel>
      )}

      <Panel
        title="Accomplishment Displaylist"
        actions={
          <>
            <button className="btn-ghost-3d" onClick={() => exportExcel("Accomplishment", rows.map((r) => ({ Photo: r.photo, Date: r.date, Name: r.name, Area: r.area, Activity: r.activity, Qty: r.qty })), "accomplishment")}>
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportPDF(
                  "Accomplishment Report",
                  ["Date", "Name", "Area", "Activity", "Qty"],
                  rows.map((r) => [r.date, r.name, r.area, r.activity, r.qty]),
                )
              }
            >
              <FileDown className="size-4" /> PDF
            </button>
          </>
        }
      >
        <DataTable
          columns={["Photo", "Date", "Name", "Area", "Activity", "Qty", "Actions"]}
          rows={rows.map((r) => [
            r.photo ? <img src={r.photo} alt="" className="size-10 rounded object-cover" /> : "—",
            r.date,
            r.name,
            r.area,
            r.activity,
            r.qty,
            writable ? (
              <div className="flex gap-1">
                <button className="btn-ghost-3d px-2" onClick={() => setForm(r)}>
                  <Pencil className="size-3.5" />
                </button>
                <button className="btn-ghost-3d px-2" onClick={() => remove(r.id)}>
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              "—"
            ),
          ])}
        />
      </Panel>
    </div>
  );
}
