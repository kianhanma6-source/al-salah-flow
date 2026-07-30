import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, FileText, IdCard, Receipt } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { hrTotals, setDB, uid, useDB, yearsOfService, type HRRequest } from "@/lib/db";

export const Route = createFileRoute("/my-hr")({
  head: () => ({
    meta: [
      { title: "My HR Dashboard | AL HAYAH AL SALAH" },
      {
        name: "description",
        content: "Private employee dashboard: personal records, benefits, deductions and document requests.",
      },
      { property: "og:title", content: "My HR Dashboard | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Private employee records and ID, payslip and COE requests." },
    ],
  }),
  component: () => (
    <AppShell tab="myhr">
      <MyHR />
    </AppShell>
  ),
});

const TYPES: HRRequest["type"][] = ["ID", "PAYSLIP", "COE"];
const ICONS = { ID: IdCard, PAYSLIP: Receipt, COE: FileText } as const;

function MyHR() {
  const db = useDB();
  const { user } = useAuth();
  const [note, setNote] = useState("");

  const emp = useMemo(
    () =>
      db.employees.find((e) => e.userId === user?.id) ??
      db.employees.find((e) => e.fullName.trim().toLowerCase() === (user?.name ?? "").trim().toLowerCase()),
    [db.employees, user],
  );

  const lines = db.hrLines.filter((l) => l.employeeId === emp?.id);
  const totals = hrTotals(db.hrLines, emp?.id ?? "");
  const requests = db.hrRequests.filter((r) => r.employeeId === emp?.id).sort((a, b) => b.at.localeCompare(a.at));

  if (!emp)
    return (
      <Panel title="My HR Dashboard">
        <p className="text-sm text-muted-foreground">
          No employee record is linked to your account yet. Please contact HR Admin.
        </p>
      </Panel>
    );

  const request = (type: HRRequest["type"]) => {
    setDB((d) => ({
      ...d,
      hrRequests: [
        ...d.hrRequests,
        { id: uid(), employeeId: emp.id, type, note, status: "PENDING", at: new Date().toISOString() },
      ],
    }));
    setNote("");
    toast.success(`${type} request submitted.`);
  };

  return (
    <div className="space-y-5">
      <Panel title="My Personal Information (read-only)">
        <div className="flex flex-wrap items-start gap-5">
          {emp.photo && (
            <img src={emp.photo} alt={emp.fullName} className="size-24 rounded-xl object-cover shadow-lg" />
          )}
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="EMP ID"><Input value={emp.empId} readOnly /></Field>
            <Field label="Full Name"><Input value={emp.fullName} readOnly /></Field>
            <Field label="Position"><Input value={emp.position} readOnly /></Field>
            <Field label="Salary"><Input value={emp.salary} readOnly /></Field>
            <Field label="Emirates ID"><Input value={emp.emiratesId} readOnly /></Field>
            <Field label="Emirates ID Expiry"><Input value={emp.emiratesIdExpiry} readOnly /></Field>
            <Field label="Passport"><Input value={emp.passport} readOnly /></Field>
            <Field label="Passport Expiry"><Input value={emp.passportExpiry} readOnly /></Field>
            <Field label="Mobile"><Input value={emp.mobile} readOnly /></Field>
            <Field label="Email"><Input value={emp.email} readOnly /></Field>
            <Field label="Address"><Input value={emp.address} readOnly /></Field>
            <Field label="Date Hired"><Input value={emp.dateHired} readOnly /></Field>
            <Field label="Years of Service"><Input value={yearsOfService(emp.dateHired)} readOnly /></Field>
            <Field label="Status"><Input value={emp.status} readOnly /></Field>
          </div>
        </div>
      </Panel>

      <Panel title="My Benefits & Deductions">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Box label="Total Benefits" value={totals.benefits} tone="text-success" />
          <Box label="Total Deductions" value={totals.deductions} tone="text-destructive" />
          <Box label="Net (Salary + Ben − Ded)" value={(emp.salary || 0) + totals.net} tone="text-primary" />
        </div>
        <DataTable
          columns={["Date", "Type", "Description", "Amount"]}
          rows={lines
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((l) => [l.date, l.kind, l.description, l.amount])}
        />
      </Panel>

      <Panel title="Request ID / Payslip / COE">
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Purpose or remarks" />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const Icon = ICONS[t];
            return (
              <button key={t} className="btn-3d" onClick={() => request(t)}>
                <Icon className="size-4" /> Request {t}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <DataTable
            columns={["Date", "Type", "Note", "Status"]}
            rows={requests.map((r) => [
              new Date(r.at).toLocaleString(),
              r.type,
              r.note || "—",
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="size-4" /> {r.status}
              </span>,
            ])}
          />
        </div>
      </Panel>
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel-3d p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );
}
