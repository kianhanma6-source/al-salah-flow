import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, FileDown, FileSpreadsheet, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ComboBox, DataTable, Field, Input, Panel, PhotoInput, SearchBar, Select } from "@/components/ui-kit";
import { canWrite, useAuth } from "@/lib/auth";
import {
  daysUntil,
  expiryAlerts,
  nextEmpId,
  setDB,
  today,
  uid,
  useDB,
  yearsOfService,
  type Employee,
} from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";
import { toLogoBase64 } from "@/lib/imaging";

export const Route = createFileRoute("/hr-employees")({
  head: () => ({
    meta: [
      { title: "Employee Information | AL HAYAH AL SALAH HR" },
      {
        name: "description",
        content:
          "HR employee master file: personal data, documents, expiry alerts and years of service.",
      },
      { property: "og:title", content: "Employee Information | AL HAYAH AL SALAH HR" },
      { property: "og:description", content: "HR employee master file and document expiry monitoring." },
    ],
  }),
  component: () => (
    <AppShell tab="hr">
      <EmployeeInformation />
    </AppShell>
  ),
});

const blank = (empId: string): Employee => ({
  id: "",
  empId,
  dateEncoded: today(),
  photo: "",
  fullName: "",
  position: "",
  salary: 0,
  emiratesId: "",
  emiratesIdExpiry: "",
  passport: "",
  passportExpiry: "",
  mobile: "",
  email: "",
  address: "",
  dateHired: today(),
  department: "",
  gender: "",
  birthday: "",
  signatureImage: "",
  status: "ACTIVE",
});

function EmployeeInformation() {
  const db = useDB();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const canSignature = user?.role === "PROGRAMMER-IV" || user?.role === "PROGRAMMER" || user?.role === "HR Admin";
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Employee>(() => blank(nextEmpId(db.employees)));

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const alerts = useMemo(() => expiryAlerts(db.employees), [db.employees]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...db.employees]
      .filter((e) => (needle ? JSON.stringify(e).toLowerCase().includes(needle) : true))
      .sort((a, b) => b.empId.localeCompare(a.empId));
  }, [db.employees, q]);

  const save = () => {
    if (!form.fullName.trim()) return toast.error("Full name is required.");
    setDB((d) => {
      if (form.id)
        return { ...d, employees: d.employees.map((e) => (e.id === form.id ? form : e)) };
      return { ...d, employees: [...d.employees, { ...form, id: uid() }] };
    });
    toast.success(form.id ? "Employee updated." : "Employee added.");
    setForm(blank(nextEmpId([...db.employees, form])));
  };

  const remove = (id: string) => {
    if (!confirm("Delete this employee record?")) return;
    setDB((d) => ({
      ...d,
      employees: d.employees.filter((e) => e.id !== id),
      hrLines: d.hrLines.filter((l) => l.employeeId !== id),
    }));
    toast.success("Employee deleted.");
  };

  const reportRows = rows.map((e) => [
    e.empId,
    e.fullName,
    e.position,
    e.salary,
    e.emiratesId,
    e.emiratesIdExpiry,
    e.passport,
    e.passportExpiry,
    e.mobile,
    e.dateHired,
    yearsOfService(e.dateHired),
    e.status,
  ]);
  const columns = [
    "EMP ID",
    "Full Name",
    "Position",
    "Salary",
    "Emirates ID",
    "EID Expiry",
    "Passport",
    "PP Expiry",
    "Mobile",
    "Date Hired",
    "Service",
    "Status",
  ];

  return (
    <div className="space-y-5">
      {alerts.length > 0 && (
        <Panel title="Document Expiry Warnings (30 days)">
          <ul className="space-y-1 text-xs">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <span className="font-semibold">{a.employee.fullName}</span>
                <span className="text-muted-foreground">
                  {a.doc} {a.days < 0 ? `expired ${Math.abs(a.days)} day(s) ago` : `expires in ${a.days} day(s)`} ({a.date})
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Employee Information — Data Entry">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="EMP ID">
            <Input value={form.empId} onChange={(e) => set("empId", e.target.value)} />
          </Field>
          <Field label="Date Encoded">
            <Input type="date" value={form.dateEncoded} onChange={(e) => set("dateEncoded", e.target.value)} />
          </Field>
          <Field label="Photo (7x7)">
            <PhotoInput value={form.photo} onChange={(v) => set("photo", v)} />
          </Field>
          <Field label="Full Name">
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Position">
            <ComboBox field="position" value={form.position} onChange={(v) => set("position", v)} />
          </Field>
          <Field label="Salary">
            <Input type="number" value={form.salary} onChange={(e) => set("salary", Number(e.target.value))} />
          </Field>
          <Field label="Emirates ID">
            <Input value={form.emiratesId} onChange={(e) => set("emiratesId", e.target.value)} />
          </Field>
          <Field label="Emirates ID Expiry">
            <Input type="date" value={form.emiratesIdExpiry} onChange={(e) => set("emiratesIdExpiry", e.target.value)} />
          </Field>
          <Field label="Passport No.">
            <Input value={form.passport} onChange={(e) => set("passport", e.target.value)} />
          </Field>
          <Field label="Passport Expiry">
            <Input type="date" value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} />
          </Field>
          <Field label="Mobile">
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Department">
            <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select
              value={form.gender ?? ""}
              onChange={(e) => set("gender", e.target.value as Employee["gender"])}
            >
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </Field>
          <Field label="Birthday">
            <Input type="date" value={form.birthday ?? ""} onChange={(e) => set("birthday", e.target.value)} />
          </Field>
          <Field label="Date Hired">
            <Input type="date" value={form.dateHired} onChange={(e) => set("dateHired", e.target.value)} />
          </Field>
          <Field label="Years of Service (auto)">
            <Input value={yearsOfService(form.dateHired)} readOnly />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as Employee["status"])}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="IN-ACTIVE">IN-ACTIVE</option>
            </Select>
          </Field>
          <Field label="Employee Signature (HR Admin / NAD ITALLO)">
            {canSignature ? (
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  className="text-[11px]"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    set("signatureImage", await toLogoBase64(f, 600));
                    toast.success("Signature attached — it will auto-print on this employee's documents.");
                  }}
                />
                {form.signatureImage && (
                  <img src={form.signatureImage} alt="Employee signature" className="h-10 w-auto bg-white/90 p-1" />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Restricted to HR Admin and NAD ITALLO.</p>
            )}
          </Field>
          <Field label="Linked login account (optional)">
            <Select value={form.userId ?? ""} onChange={(e) => set("userId", e.target.value || undefined)}>
              <option value="">— none —</option>
              {db.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {writable && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-3d" onClick={save}>
              <Save className="size-4" /> {form.id ? "Update" : "Add"}
            </button>
            {form.id && (
              <button className="btn-ghost-3d" onClick={() => setForm(blank(nextEmpId(db.employees)))}>
                <X className="size-4" /> Cancel
              </button>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Employee Display List"
        actions={
          <>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportExcel(
                  "Employees",
                  rows.map((e) => ({ ...e })),
                  "employees",
                )
              }
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportPDF(
                  "EMPLOYEE INFORMATION",
                  columns,
                  reportRows,
                  undefined,
                  rows.map((e) => e.photo),
                )
              }
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
          columns={["Photo", ...columns, "Actions"]}
          rows={rows.map((e) => {
            const eid = daysUntil(e.emiratesIdExpiry);
            const pp = daysUntil(e.passportExpiry);
            return [
              e.photo ? (
                <img src={e.photo} alt={e.fullName} className="size-10 rounded object-cover" />
              ) : (
                "—"
              ),
              e.empId,
              e.fullName,
              e.position,
              e.salary,
              e.emiratesId,
              <span className={eid !== null && eid <= 30 ? "font-bold text-warning" : ""}>
                {e.emiratesIdExpiry || "—"}
              </span>,
              e.passport,
              <span className={pp !== null && pp <= 30 ? "font-bold text-warning" : ""}>
                {e.passportExpiry || "—"}
              </span>,
              e.mobile,
              e.dateHired,
              yearsOfService(e.dateHired),
              e.status,
              writable ? (
                <div className="flex gap-1">
                  <button className="btn-ghost-3d px-2" onClick={() => setForm(e)}>
                    <Pencil className="size-4" />
                  </button>
                  <button className="btn-ghost-3d px-2" onClick={() => remove(e.id)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : (
                "—"
              ),
            ];
          })}
        />
      </Panel>
    </div>
  );
}
