import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, SearchBar, Select } from "@/components/ui-kit";
import { canWrite, useAuth } from "@/lib/auth";
import { hrTotals, setDB, today, uid, useDB, type HRLine } from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/hr-benefits")({
  head: () => ({
    meta: [
      { title: "Benefits & Deductions | AL HAYAH AL SALAH HR" },
      {
        name: "description",
        content: "Record employee benefits and deductions with automatic totals and net computation.",
      },
      { property: "og:title", content: "Benefits & Deductions | AL HAYAH AL SALAH HR" },
      { property: "og:description", content: "Employee benefits and deductions with auto-recalculated totals." },
    ],
  }),
  component: () => (
    <AppShell tab="hrbenefits">
      <BenefitsDeductions />
    </AppShell>
  ),
});

function BenefitsDeductions() {
  const db = useDB();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const [q, setQ] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [kind, setKind] = useState<HRLine["kind"]>("BENEFIT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());

  const emp = db.employees.find((e) => e.id === employeeId);
  const totals = hrTotals(db.hrLines, employeeId);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.hrLines
      .map((l) => ({ ...l, employee: db.employees.find((e) => e.id === l.employeeId) }))
      .filter((l) => (employeeId ? l.employeeId === employeeId : true))
      .filter((l) =>
        needle
          ? `${l.description} ${l.amount} ${l.date} ${l.kind} ${l.employee?.fullName ?? ""} ${l.employee?.empId ?? ""}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.hrLines, db.employees, q, employeeId]);

  const add = () => {
    if (!employeeId) return toast.error("Select an employee first.");
    if (!description.trim()) return toast.error("Description is required.");
    setDB((d) => ({
      ...d,
      hrLines: [...d.hrLines, { id: uid(), employeeId, kind, description, amount: Number(amount) || 0, date }],
    }));
    setDescription("");
    setAmount(0);
    toast.success(`${kind === "BENEFIT" ? "Benefit" : "Deduction"} added.`);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setDB((d) => ({ ...d, hrLines: d.hrLines.filter((l) => l.id !== id) }));
  };

  const columns = ["Date", "EMP ID", "Employee", "Position", "Type", "Description", "Amount"];
  const reportRows = rows.map((l) => [
    l.date,
    l.employee?.empId ?? "",
    l.employee?.fullName ?? "",
    l.employee?.position ?? "",
    l.kind,
    l.description,
    l.amount,
  ]);

  return (
    <div className="space-y-5">
      <Panel title="Benefits & Deductions — Data Entry">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— select employee —</option>
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.empId} · {e.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Position (auto)">
            <Input value={emp?.position ?? ""} readOnly />
          </Field>
          <Field label="Salary (auto)">
            <Input value={emp?.salary ?? ""} readOnly />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as HRLine["kind"])}>
              <option value="BENEFIT">BENEFIT</option>
              <option value="DEDUCTION">DEDUCTION</option>
            </Select>
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Amount">
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {writable && (
          <div className="mt-4">
            <button className="btn-3d" onClick={add}>
              <Save className="size-4" /> Add Entry
            </button>
          </div>
        )}

        {emp && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Totals label="Total Benefits" value={totals.benefits} tone="text-success" />
            <Totals label="Total Deductions" value={totals.deductions} tone="text-destructive" />
            <Totals label="Net (Salary + Ben − Ded)" value={(emp.salary || 0) + totals.net} tone="text-primary" />
          </div>
        )}
      </Panel>

      <Panel
        title="Benefits & Deductions Display List"
        actions={
          <>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportExcel(
                  "Benefits-Deductions",
                  rows.map((l) => ({
                    Date: l.date,
                    EmpID: l.employee?.empId ?? "",
                    Employee: l.employee?.fullName ?? "",
                    Position: l.employee?.position ?? "",
                    Type: l.kind,
                    Description: l.description,
                    Amount: l.amount,
                  })),
                  "benefits-deductions",
                )
              }
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() => exportPDF("BENEFITS & DEDUCTIONS", columns, reportRows)}
            >
              <FileDown className="size-4" /> PDF
            </button>
          </>
        }
      >
        <div className="mb-3">
          <SearchBar value={q} set={setQ} />
        </div>
        <DataTable
          columns={[...columns, "Actions"]}
          rows={rows.map((l) => [
            l.date,
            l.employee?.empId ?? "—",
            l.employee?.fullName ?? "—",
            l.employee?.position ?? "—",
            <span className={l.kind === "BENEFIT" ? "text-success" : "text-destructive"}>{l.kind}</span>,
            l.description,
            l.amount,
            writable ? (
              <button className="btn-ghost-3d px-2" onClick={() => remove(l.id)}>
                <Trash2 className="size-4" />
              </button>
            ) : (
              "—"
            ),
          ])}
        />
      </Panel>
    </div>
  );
}

function Totals({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel-3d p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );
}
