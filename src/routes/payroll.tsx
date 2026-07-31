import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, FileDown, FileSpreadsheet, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, SearchBar, Select } from "@/components/ui-kit";
import {
  MONTHS,
  computeNet,
  dailyRate,
  hrTotals,
  isSalesExempt,
  setDB,
  uid,
  useDB,
  workingDaysInMonth,
  type PayrollRow,
  type PayrollRun,
} from "@/lib/db";
import { payslipPDF } from "@/lib/hr-docs";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll | AL HAYAH AL SALAH HR" },
      {
        name: "description",
        content:
          "Monthly payroll with automatic daily rate, absence deductions, benefits and net salary computation.",
      },
      { property: "og:title", content: "Payroll | AL HAYAH AL SALAH HR" },
      { property: "og:description", content: "Generate, approve and lock monthly payroll and payslips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell tab="payroll">
      <Payroll />
    </AppShell>
  ),
});

const money = (n: number) => (Number(n) || 0).toFixed(2);

function Payroll() {
  const db = useDB();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [q, setQ] = useState("");

  const run = db.payroll.find((p) => p.month === month && p.year === year);
  const locked = run?.status === "LOCKED";
  const workDays = workingDaysInMonth(year, month);

  const rows = useMemo(() => {
    const list = run?.rows ?? [];
    const t = q.trim().toLowerCase();
    return t
      ? list.filter((r) => `${r.empId} ${r.name} ${r.position}`.toLowerCase().includes(t))
      : list;
  }, [run, q]);

  const save = (next: PayrollRun) =>
    setDB((d) => ({
      ...d,
      payroll: d.payroll.some((p) => p.id === next.id)
        ? d.payroll.map((p) => (p.id === next.id ? next : p))
        : [...d.payroll, next],
    }));

  const generate = () => {
    const actives = db.employees.filter((e) => e.status === "ACTIVE");
    if (!actives.length) return toast.error("No active employees found.");
    const built: PayrollRow[] = actives.map((e) => {
      const totals = hrTotals(db.hrLines, e.id);
      const row: PayrollRow = {
        id: uid(),
        employeeId: e.id,
        empId: e.empId,
        name: e.fullName,
        position: e.position,
        basic: Number(e.salary) || 0,
        benefits: totals.benefits,
        bonus: 0,
        incentive: 0,
        workingDays: workDays,
        absentDays: 0,
        absentDeduction: 0,
        otherDeduction: totals.deductions,
        net: 0,
      };
      row.net = computeNet(row);
      return row;
    });
    save({
      id: run?.id ?? uid(),
      month,
      year,
      status: "DRAFT",
      rows: built,
      createdAt: new Date().toISOString(),
    });
    toast.success(`Payroll generated for ${actives.length} active employee(s).`);
  };

  const edit = (id: string, patch: Partial<PayrollRow>) => {
    if (!run || locked) return;
    save({
      ...run,
      rows: run.rows.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        const exempt = isSalesExempt(merged.position);
        merged.absentDeduction = exempt
          ? 0
          : Number((merged.absentDays * dailyRate(merged.basic, merged.workingDays)).toFixed(2));
        merged.net = computeNet(merged);
        return merged;
      }),
    });
  };

  const setStatus = (status: PayrollRun["status"]) => {
    if (!run) return;
    save({ ...run, status });
    toast.success(`Payroll ${status.toLowerCase()}.`);
    if (status === "APPROVED") toast.info("Payslips are ready to print for every employee.");
  };

  const num = (v: number, on: (n: number) => void) => (
    <Input
      type="number"
      value={v}
      disabled={locked}
      onChange={(e) => on(Number(e.target.value) || 0)}
      className="w-24 text-xs"
    />
  );

  const reportRows = rows.map((r) => [
    r.empId,
    r.name,
    r.position,
    money(r.basic),
    money(r.benefits),
    r.workingDays,
    r.absentDays,
    money(r.absentDeduction),
    money(r.otherDeduction),
    money(r.net),
  ]);
  const cols = [
    "EMP ID",
    "Name",
    "Position",
    "Basic",
    "Benefits",
    "Working Days",
    "Absent Days",
    "Absent Deduction",
    "Other Deduction",
    "Net Salary",
  ];

  return (
    <div className="space-y-5">
      <Panel
        title="Payroll Period"
        actions={
          <>
            <button className="btn-3d" onClick={generate} disabled={locked}>
              <RefreshCw className="size-4" /> Bulk Generate
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportPDF(`Payroll ${MONTHS[month - 1]} ${year}`, cols, reportRows)
              }
            >
              <FileDown className="size-4" /> PDF
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportExcel(
                  "Payroll",
                  rows.map((r) => ({
                    "EMP ID": r.empId,
                    Name: r.name,
                    Position: r.position,
                    Basic: r.basic,
                    Benefits: r.benefits,
                    Bonus: r.bonus,
                    Incentive: r.incentive,
                    "Working Days": r.workingDays,
                    "Absent Days": r.absentDays,
                    "Absent Deduction": r.absentDeduction,
                    "Other Deduction": r.otherDeduction,
                    "Net Salary": r.net,
                  })),
                  `Payroll_${MONTHS[month - 1]}_${year}`,
                )
              }
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Month">
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Year">
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </Field>
          <Field label="Working Days in Month">
            <Input value={workDays} readOnly />
          </Field>
          <Field label="Status">
            <Input value={run?.status ?? "NOT GENERATED"} readOnly />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-3d"
            disabled={!run || run.status !== "DRAFT"}
            onClick={() => setStatus("APPROVED")}
          >
            <CheckCircle2 className="size-4" /> Approve
          </button>
          <button
            className="btn-ghost-3d"
            disabled={!run || run.status !== "APPROVED"}
            onClick={() => setStatus("LOCKED")}
          >
            <Lock className="size-4" /> Lock
          </button>
          <button
            className="btn-ghost-3d"
            disabled={!run || run.status === "DRAFT"}
            onClick={() => setStatus("DRAFT")}
          >
            Re-open as Draft
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Daily Rate = Monthly Salary ÷ Working Days. Vacation and sick leave are fully paid. Absent days
          are auto-deducted. Sales personnel are exempt and always receive full salary.
        </p>
      </Panel>

      <Panel title={`Payroll Table — ${MONTHS[month - 1]} ${year}`}>
        <SearchBar value={q} set={setQ} />
        <div className="mt-3">
          <DataTable
            columns={[...cols, "Payslip", ""]}
            empty="No payroll generated for this period yet."
            rows={rows.map((r) => [
              r.empId,
              r.name,
              r.position,
              num(r.basic, (n) => edit(r.id, { basic: n })),
              num(r.benefits, (n) => edit(r.id, { benefits: n })),
              num(r.workingDays, (n) => edit(r.id, { workingDays: n || 1 })),
              num(r.absentDays, (n) => edit(r.id, { absentDays: n })),
              money(r.absentDeduction),
              num(r.otherDeduction, (n) => edit(r.id, { otherDeduction: n })),
              <span key="net" className="font-bold text-primary">
                {money(r.net)}
              </span>,
              <button
                key="slip"
                className="btn-ghost-3d"
                disabled={!run || run.status === "DRAFT"}
                onClick={() => payslipPDF(r, month, year)}
              >
                <FileDown className="size-4" /> Payslip
              </button>,
              <button
                key="del"
                className="btn-ghost-3d"
                disabled={locked}
                onClick={() =>
                  run && save({ ...run, rows: run.rows.filter((x) => x.id !== r.id) })
                }
              >
                <Trash2 className="size-4" />
              </button>,
            ])}
          />
        </div>
        {run && run.status === "DRAFT" && (
          <p className="mt-3 text-[11px] text-warning">
            Approve the payroll to enable payslip printing.
          </p>
        )}
      </Panel>
    </div>
  );
}
