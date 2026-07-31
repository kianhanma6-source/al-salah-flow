import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, SearchBar, Select } from "@/components/ui-kit";
import { useDB } from "@/lib/db";
import { idCardPDF, qrDataUrl } from "@/lib/hr-docs";

export const Route = createFileRoute("/id-card")({
  head: () => ({
    meta: [
      { title: "Employee ID Card | AL HAYAH AL SALAH HR" },
      {
        name: "description",
        content:
          "Print employee ID cards with photo, position, EMP ID and a QR code carrying Emirates ID number and expiry.",
      },
      { property: "og:title", content: "Employee ID Card | AL HAYAH AL SALAH HR" },
      { property: "og:description", content: "Auto-filled ID cards with live QR code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell tab="idcard">
      <IdCard />
    </AppShell>
  ),
});

function IdCard() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const emp = db.employees.find((e) => e.id === employeeId);
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!emp) return setQr("");
    qrDataUrl(
      `EID:${emp.emiratesId || "N/A"}|EXP:${emp.emiratesIdExpiry || "N/A"}|EMP:${emp.empId}|NAME:${emp.fullName}`,
    ).then(setQr);
  }, [emp?.emiratesId, emp?.emiratesIdExpiry, emp?.empId, emp?.fullName, emp]);

  const filtered = db.employees.filter((e) =>
    `${e.empId} ${e.fullName} ${e.position}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <Panel
        title="Employee ID Card"
        actions={
          <button
            className="btn-3d"
            disabled={!emp}
            onClick={() => {
              if (emp) {
                idCardPDF(emp);
                toast.success("ID card generated.");
              }
            }}
          >
            <FileDown className="size-4" /> Print ID Card
          </button>
        }
      >
        <Field label="Employee">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee…</option>
            {db.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.empId} — {e.fullName}
              </option>
            ))}
          </Select>
        </Field>

        {emp && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="panel-3d overflow-hidden p-0">
              <div className="flex items-center gap-2 bg-primary px-3 py-2">
                {db.branding.logo && (
                  <img src={db.branding.logo} alt="" className="size-8 rounded-full bg-white object-contain p-0.5" />
                )}
                <span className="text-[10px] font-bold uppercase text-primary-foreground">
                  {db.branding.companyName}
                </span>
              </div>
              <div className="flex gap-4 p-4">
                {emp.photo ? (
                  <img src={emp.photo} alt={emp.fullName} className="size-24 rounded-md object-cover" />
                ) : (
                  <div className="grid size-24 place-items-center rounded-md bg-muted text-xs">No Photo</div>
                )}
                <div>
                  <p className="display text-lg font-bold">{emp.fullName}</p>
                  <p className="text-sm text-muted-foreground">{emp.position}</p>
                  <p className="mt-2 text-xs">EMP ID: {emp.empId}</p>
                </div>
              </div>
            </div>

            <div className="panel-3d p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide">Back — Information</p>
              <div className="flex gap-4">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Emirates ID: {emp.emiratesId || "—"}</p>
                  <p>EID Expiry: {emp.emiratesIdExpiry || "—"}</p>
                  <p>Passport: {emp.passport || "—"}</p>
                  <p>Mobile: {emp.mobile || "—"}</p>
                  <p>Email: {emp.email || "—"}</p>
                  <p>Date Hired: {emp.dateHired || "—"}</p>
                  <p>Status: {emp.status}</p>
                </div>
                {qr && <img src={qr} alt="Employee QR code" className="size-24 self-start rounded bg-white p-1" />}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                QR updates automatically whenever the Emirates ID number or expiry is edited.
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Search Employees">
        <SearchBar value={q} set={setQ} />
        <div className="mt-3">
          <DataTable
            columns={["EMP ID", "Name", "Position", "EID Expiry", "Status", ""]}
            rows={filtered.map((e) => [
              e.empId,
              e.fullName,
              e.position,
              e.emiratesIdExpiry,
              e.status,
              <button key="s" className="btn-ghost-3d" onClick={() => setEmployeeId(e.id)}>
                Select
              </button>,
            ])}
          />
        </div>
      </Panel>
    </div>
  );
}
