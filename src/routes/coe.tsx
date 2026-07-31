import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, SearchBar, Select } from "@/components/ui-kit";
import { setDB, uid, useDB, yearsOfService, type Signature } from "@/lib/db";
import { coePDF } from "@/lib/hr-docs";

export const Route = createFileRoute("/coe")({
  head: () => ({
    meta: [
      { title: "Certificate of Employment | AL HAYAH AL SALAH HR" },
      {
        name: "description",
        content:
          "Generate searchable certificates of employment with editable body text and multiple signatories.",
      },
      { property: "og:title", content: "Certificate of Employment | AL HAYAH AL SALAH HR" },
      { property: "og:description", content: "Standard COE format with editable signatures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell tab="coe">
      <COE />
    </AppShell>
  ),
});

function COE() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const emp = db.employees.find((e) => e.id === employeeId);

  const defaultBody = useMemo(() => {
    if (!emp) return "";
    return `This is to certify that ${emp.fullName} has been employed with ${db.branding.companyName} as ${emp.position} since ${emp.dateHired || "—"} (${yearsOfService(emp.dateHired)} of service) and is currently ${emp.status === "ACTIVE" ? "an active employee" : "no longer employed"} of the company.\n\nThis certification is issued upon the request of the above-named employee for whatever legal purpose it may serve.`;
  }, [emp, db.branding.companyName]);

  const [body, setBody] = useState("");
  const text = body || defaultBody;

  const addSig = () =>
    setDB((d) => ({
      ...d,
      signatures: [...d.signatures, { id: uid(), name: "", position: "" } as Signature],
    }));
  const editSig = (id: string, patch: Partial<Signature>) =>
    setDB((d) => ({
      ...d,
      signatures: d.signatures.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  const delSig = (id: string) =>
    setDB((d) => ({ ...d, signatures: d.signatures.filter((s) => s.id !== id) }));

  const filtered = db.employees.filter((e) =>
    `${e.empId} ${e.fullName} ${e.position} ${e.status}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <Panel
        title="Certificate of Employment"
        actions={
          <button
            className="btn-3d"
            disabled={!emp}
            onClick={() => {
              if (!emp) return;
              coePDF(emp, text, db.signatures.length ? db.signatures : [{ id: "x", name: "", position: "" }]);
              toast.success("COE generated.");
            }}
          >
            <FileDown className="size-4" /> Print COE
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee">
            <Select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setBody("");
              }}
            >
              <option value="">Select employee…</option>
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.empId} — {e.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Years of Service">
            <Input value={emp ? yearsOfService(emp.dateHired) : ""} readOnly />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Certificate Body (editable)">
            <textarea
              className="field-3d min-h-40"
              value={text}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Select an employee to load the standard text…"
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Signatories (editable)"
        actions={
          <button className="btn-ghost-3d" onClick={addSig}>
            <Plus className="size-4" /> Add Signature
          </button>
        }
      >
        {db.signatures.length === 0 && (
          <p className="text-sm text-muted-foreground">No signatories yet. Add one to print on the COE.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {db.signatures.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <Field label="Name">
                <Input value={s.name} onChange={(e) => editSig(s.id, { name: e.target.value })} />
              </Field>
              <div className="mt-2">
                <Field label="Position">
                  <Input value={s.position} onChange={(e) => editSig(s.id, { position: e.target.value })} />
                </Field>
              </div>
              <button className="btn-ghost-3d mt-2" onClick={() => delSig(s.id)}>
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Save className="size-3" /> Signature changes are saved automatically.
        </p>
      </Panel>

      <Panel title="Search Employees">
        <SearchBar value={q} set={setQ} />
        <div className="mt-3">
          <DataTable
            columns={["EMP ID", "Name", "Position", "Date Hired", "Service", "Status", ""]}
            rows={filtered.map((e) => [
              e.empId,
              e.fullName,
              e.position,
              e.dateHired,
              yearsOfService(e.dateHired),
              e.status,
              <button key="s" className="btn-ghost-3d" onClick={() => { setEmployeeId(e.id); setBody(""); }}>
                Select
              </button>,
            ])}
          />
        </div>
      </Panel>
    </div>
  );
}
