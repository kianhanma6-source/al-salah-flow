import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { REPORT_KEYS, useDB, type DB } from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports | AL HAYAH AL SALAH System Management" },
      {
        name: "description",
        content: "Assigned company reports with a single search box across every authorized record.",
      },
      { property: "og:title", content: "Reports | AL HAYAH AL SALAH" },
      { property: "og:description", content: "View and export the reports assigned to your account." },
    ],
  }),
  component: () => (
    <AppShell tab="reports">
      <ReportsPage />
    </AppShell>
  ),
});

type Report = { key: string; label: string; columns: string[]; rows: (string | number)[][] };

function buildReports(db: DB): Report[] {
  const out: Report[] = [];
  const modCols = ["Type", "Trans No", "Date", "Name / Material", "Model", "Unit", "Qty"];

  (["logistic", "board", "installation", "wm", "wmreturn"] as const).forEach((k) => {
    const rows: (string | number)[][] = [];
    db.modules[k].inventory.forEach((i) =>
      rows.push(["INVENTORY", i.transNo, i.date, i.materialName, i.model, i.unit, i.qty]),
    );
    db.modules[k].deployment.forEach((d) =>
      d.lines.forEach((l) =>
        rows.push(["DEPLOYMENT", d.transNo, d.date, l.materialName, l.model, l.unit, l.qty]),
      ),
    );
    out.push({
      key: k,
      label: REPORT_KEYS.find((r) => r.key === k)?.label ?? k,
      columns: modCols,
      rows: rows.sort((a, b) => String(b[1]).localeCompare(String(a[1]))),
    });
  });

  out.push({
    key: "accomplishment",
    label: "Accomplishment Report",
    columns: ["Date", "Name", "Area", "Activity", "Qty"],
    rows: db.accomplishment.map((a) => [a.date, a.name, a.area, a.activity, a.qty]),
  });

  out.push({
    key: "attendance",
    label: "Attendance Report",
    columns: ["Date", "Emp ID", "Name", "Shift", "Time In", "Time Out", "Status"],
    rows: db.attendance.map((a) => [a.date, a.empId, a.name, a.shift, a.timeIn, a.timeOut, a.status]),
  });

  out.push({
    key: "payroll",
    label: "Payroll Report",
    columns: ["Period", "Status", "Employees"],
    rows: db.payroll.map((p) => [
      String((p as unknown as { period?: string }).period ?? ""),
      String((p as unknown as { status?: string }).status ?? ""),
      String((p as unknown as { lines?: unknown[] }).lines?.length ?? 0),
    ]),
  });

  out.push({
    key: "employees",
    label: "Employee Masterlist",
    columns: ["Emp ID", "Full Name", "Position", "Department", "Date Hired", "Status"],
    rows: db.employees.map((e) => [
      e.empId,
      e.fullName,
      e.position,
      e.department ?? "—",
      e.dateHired,
      e.status,
    ]),
  });

  return out;
}

function ReportsPage() {
  const db = useDB();
  const { user: session } = useAuth();
  const me = db.users.find((u) => u.id === session?.id) ?? session ?? null;
  const [q, setQ] = useState("");

  const assigned = useMemo(() => {
    const all = buildReports(db);
    const keys = me?.reportPerms;
    // Viewers only see reports assigned by NAD ITALLO; every other role sees all.
    if (me?.role === "Viewer" || me?.role === "VISITOR" || me?.role === "Client")
      return all.filter((r) => (keys ?? []).includes(r.key));
    return all;
  }, [db, me]);

  const needle = q.trim().toLowerCase();
  const filtered = assigned.map((r) => ({
    ...r,
    rows: needle ? r.rows.filter((row) => row.join(" ").toLowerCase().includes(needle)) : r.rows,
  }));

  return (
    <div className="space-y-5">
      <Panel title="Search All Assigned Reports">
        <Field label="Search (any word, number, date or name)">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
        </Field>
      </Panel>

      {filtered.length === 0 && (
        <Panel title="Reports">
          <p className="text-sm text-muted-foreground">
            No reports have been assigned to your account yet. Please contact NAD ITALLO.
          </p>
        </Panel>
      )}

      {filtered.map((r) => (
        <Panel
          key={r.key}
          title={r.label}
          actions={
            <>
              <button
                className="btn-ghost-3d"
                onClick={() =>
                  exportExcel(
                    r.label,
                    r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))),
                    r.key,
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> Excel
              </button>
              <button className="btn-ghost-3d" onClick={() => exportPDF(r.label, r.columns, r.rows)}>
                <FileDown className="size-4" /> PDF
              </button>
            </>
          }
        >
          <DataTable columns={r.columns} rows={r.rows} />
        </Panel>
      ))}
    </div>
  );
}
