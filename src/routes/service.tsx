import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FileDown, FileSpreadsheet, MapPin, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ComboBox, DataTable, Field, Input, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import {
  SERVICE_STATUS_TEXT,
  mapsLink,
  salespersonForCustomer,
  setDB,
  today,
  uid,
  useDB,
  type ServiceConcern,
  type ServiceStatus,
  type User,
} from "@/lib/db";
import { toSquareBase64 } from "@/lib/imaging";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/service")({
  head: () => ({
    meta: [
      { title: "Customer Service System | AL HAYAH AL SALAH" },
      {
        name: "description",
        content:
          "Log, approve, assign and track customer service concerns with photos, technician assignment and live status.",
      },
      { property: "og:title", content: "Customer Service System" },
      { property: "og:description", content: "Track customer concerns from request to completion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell tab="service">
      <ServicePage />
    </AppShell>
  ),
});

type View = "admin" | "sales" | "tech" | "client";

function viewFor(u: User | null | undefined): View {
  const r = u?.role ?? "";
  if (["PROGRAMMER-IV", "PROGRAMMER", "Manager", "HR Admin", "ADMIN"].includes(r)) return "admin";
  if (r === "Technician") return "tech";
  if (r === "Client") return "client";
  if (["Sales Person", "Sales"].includes(r)) return "sales";
  return "admin";
}

const blank = (): ServiceConcern => ({
  id: "",
  date: today(),
  wmName: "",
  wmNo: "",
  wmKeyNo: "",
  photos: [],
  remarks: "",
  companyName: "",
  clientName: "",
  address: "",
  contact: "",
  email: "",
  technician: "",
  assistant: "",
  status: "RECEIVED",
  approved: false,
  techPhotos: [],
  techRemarks: "",
  createdAt: new Date().toISOString(),
});

function MultiPhoto({
  photos,
  onChange,
  disabled,
}: {
  photos: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img src={p} alt="Concern" className="size-16 rounded-md border border-border object-cover" />
            {!disabled && (
              <button
                type="button"
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
        {photos.length === 0 && <span className="text-[11px] text-muted-foreground">No photos yet (7x7)</span>}
      </div>
      {!disabled && (
        <button type="button" className="btn-ghost-3d" onClick={() => ref.current?.click()}>
          <Upload className="size-4" /> Add photos
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          const next = [...photos];
          for (const f of files) next.push(await toSquareBase64(f, 700));
          onChange(next);
        }}
      />
    </div>
  );
}

function ServicePage() {
  const db = useDB();
  const { user: session } = useAuth();
  const user = db.users.find((u) => u.id === session?.id) ?? session;
  const view = viewFor(user);
  const [form, setForm] = useState<ServiceConcern>(blank());
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const all = [...db.service].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (view === "admin") return all;
    if (view === "sales") return all.filter((c) => c.salespersonId === user?.id);
    if (view === "tech")
      return all.filter(
        (c) =>
          c.approved &&
          (c.technicianUserId === user?.id ||
            [c.technician, c.assistant].some(
              (n) => n && n.trim().toLowerCase() === (user?.name ?? "").trim().toLowerCase(),
            )),
      );
    return all.filter((c) => c.clientUserId === user?.id);
  }, [db.service, view, user]);

  const rows = visible.filter((c) =>
    [c.date, c.wmName, c.wmNo, c.wmKeyNo, c.companyName, c.clientName, c.address, c.contact, c.technician, c.status]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const canCreate = view === "admin" || view === "sales" || view === "client";
  const lockedFields = view === "tech";

  const captureLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success("Location captured.");
      },
      () => toast.error("Unable to read your location."),
    );
  };

  const save = () => {
    if (!form.wmName || !form.clientName) return toast.error("WM name and client name are required.");
    setDB((d) => {
      const list = [...d.service];
      const salespersonId =
        form.salespersonId ??
        salespersonForCustomer(d.orders, {
          companyName: form.companyName,
          email: form.email,
          contact: form.contact,
        });
      const techUser = d.users.find(
        (u) => u.role === "Technician" && u.name.trim().toLowerCase() === form.technician.trim().toLowerCase(),
      );
      const next: ServiceConcern = {
        ...form,
        salespersonId,
        technicianUserId: techUser?.id,
        clientUserId: form.clientUserId ?? (view === "client" ? user?.id : undefined),
      };
      if (form.id) list[list.findIndex((c) => c.id === form.id)] = next;
      else list.unshift({ ...next, id: uid(), createdAt: new Date().toISOString(), status: "RECEIVED" });
      return { ...d, service: list };
    });
    toast.success(form.id ? "Concern updated." : "Concern submitted.");
    setForm(blank());
  };

  const patch = (id: string, fn: (c: ServiceConcern) => ServiceConcern) =>
    setDB((d) => ({ ...d, service: d.service.map((c) => (c.id === id ? fn(c) : c)) }));

  const approve = (c: ServiceConcern) => {
    if (!c.technician) return toast.error("Assign a technician before approving.");
    patch(c.id, (x) => ({ ...x, approved: true, status: "ASSIGNED" }));
    toast.success("Approved and assigned.");
  };

  const remove = (id: string) => {
    if (!confirm("Delete this service concern?")) return;
    setDB((d) => ({ ...d, service: d.service.filter((c) => c.id !== id) }));
  };

  const excelRows = rows.map((c) => ({
    Date: c.date,
    "WM Name": c.wmName,
    "WM No": c.wmNo,
    "WM Key No": c.wmKeyNo,
    Company: c.companyName,
    Client: c.clientName,
    Address: c.address,
    Contact: c.contact,
    Technician: c.technician,
    Assistant: c.assistant,
    Status: SERVICE_STATUS_TEXT[c.status],
    Remarks: c.remarks,
  }));

  return (
    <div className="space-y-5">
      <Panel title="Search Service Concerns">
        <Field
          label={
            view === "client"
              ? "Search my requests"
              : view === "tech"
                ? "Search my assigned records"
                : "Search all records"
          }
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
        </Field>
      </Panel>

      {(canCreate || form.id) && (
        <Panel
          title={
            view === "tech" ? "Technician Update (photos, remarks, status only)" : "Service Concern Data Entry"
          }
          actions={
            <>
              {view !== "tech" && (
                <button className="btn-3d" onClick={save}>
                  <Save className="size-4" /> {form.id ? "Update" : "Submit"}
                </button>
              )}
              <button className="btn-ghost-3d" onClick={() => setForm(blank())}>
                <X className="size-4" /> Clear
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={form.date} disabled={lockedFields} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="WM Name">
              <Input value={form.wmName} disabled={lockedFields} onChange={(e) => setForm({ ...form, wmName: e.target.value })} />
            </Field>
            <Field label="WM No">
              <Input value={form.wmNo} disabled={lockedFields} onChange={(e) => setForm({ ...form, wmNo: e.target.value })} />
            </Field>
            <Field label="WM Key No">
              <Input value={form.wmKeyNo} disabled={lockedFields} onChange={(e) => setForm({ ...form, wmKeyNo: e.target.value })} />
            </Field>
            <Field label="Company Name">
              <Input value={form.companyName} disabled={lockedFields} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </Field>
            <Field label="Client Name">
              <Input value={form.clientName} disabled={lockedFields} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} disabled={lockedFields} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Contact No.">
              <Input value={form.contact} disabled={lockedFields} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email ?? ""} disabled={lockedFields} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Location (Google Maps + driving directions)">
              <div className="flex gap-1">
                <button type="button" className="btn-ghost-3d" onClick={captureLocation} disabled={lockedFields}>
                  <MapPin className="size-4" /> Capture
                </button>
                <a
                  className="btn-ghost-3d"
                  href={mapsLink(form.lat, form.lng, form.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </div>
            </Field>
            {view === "admin" || view === "sales" ? (
              <>
                <Field label="Assigned Technician">
                  <ComboBox field="technician" value={form.technician} onChange={(v) => setForm({ ...form, technician: v })} />
                </Field>
                <Field label="Assigned Assistant Tech">
                  <ComboBox field="assistant" value={form.assistant} onChange={(v) => setForm({ ...form, assistant: v })} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Assigned Technician (after approval)">
                  <Input value={form.approved ? form.technician : "Pending approval"} readOnly />
                </Field>
                <Field label="Assigned Assistant (after approval)">
                  <Input value={form.approved ? form.assistant : "Pending approval"} readOnly />
                </Field>
              </>
            )}
            <Field label="Status">
              <Input value={SERVICE_STATUS_TEXT[form.status]} readOnly />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Photos (7x7, auto-resize ≤80KB)">
              <MultiPhoto photos={form.photos} onChange={(v) => setForm({ ...form, photos: v })} disabled={lockedFields} />
            </Field>
            <Field label="Remarks">
              <textarea
                className="field-3d min-h-28"
                value={form.remarks}
                disabled={lockedFields}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </Field>
          </div>
        </Panel>
      )}

      {view === "tech" && (
        <Panel title="My Assigned Concerns — Update">
          <div className="space-y-4">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No concerns assigned to you.</p>}
            {rows.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold">
                  {c.date} · {c.companyName} · {c.wmName} ({c.wmNo})
                </p>
                <p className="text-[11px] text-muted-foreground">{SERVICE_STATUS_TEXT[c.status]}</p>
                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                  <Field label="Technician photos">
                    <MultiPhoto photos={c.techPhotos} onChange={(v) => patch(c.id, (x) => ({ ...x, techPhotos: v }))} />
                  </Field>
                  <Field label="Technician remarks">
                    <textarea
                      className="field-3d min-h-24"
                      value={c.techRemarks}
                      onChange={(e) => patch(c.id, (x) => ({ ...x, techRemarks: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="btn-3d"
                    disabled={c.status !== "ASSIGNED"}
                    onClick={() => {
                      patch(c.id, (x) => ({ ...x, status: "ACCEPTED" }));
                      toast.success(SERVICE_STATUS_TEXT.ACCEPTED);
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="btn-3d"
                    disabled={c.status === "FIXED"}
                    onClick={() => {
                      patch(c.id, (x) => ({ ...x, status: "FIXED" }));
                      toast.success(SERVICE_STATUS_TEXT.FIXED);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Service Concern Displaylist"
        actions={
          <>
            <button className="btn-ghost-3d" onClick={() => exportExcel("Service", excelRows, "customer_service")}>
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportPDF(
                  "Customer Service Report",
                  ["Date", "Company", "Client", "WM Name", "WM No", "Technician", "Status"],
                  rows.map((c) => [c.date, c.companyName, c.clientName, c.wmName, c.wmNo, c.technician, c.status]),
                  undefined,
                  rows.map((c) => c.photos[0]),
                )
              }
            >
              <FileDown className="size-4" /> PDF
            </button>
          </>
        }
      >
        <DataTable
          columns={["Photo", "Date", "Company", "Client", "WM", "Technician", "Status", "Location", "Actions"]}
          rows={rows.map((c) => [
            c.photos[0] ? <img src={c.photos[0]} alt="" className="size-10 rounded object-cover" /> : "—",
            c.date,
            c.companyName,
            c.clientName,
            `${c.wmName} ${c.wmNo}`,
            c.approved ? c.technician || "—" : "Pending",
            <span className="text-[11px]">{SERVICE_STATUS_TEXT[c.status]}</span>,
            <a className="text-primary underline" href={mapsLink(c.lat, c.lng, c.address)} target="_blank" rel="noreferrer">
              Directions
            </a>,
            <div className="flex gap-1">
              {view !== "tech" && (
                <button className="btn-ghost-3d px-2" onClick={() => setForm(c)}>
                  <Pencil className="size-3.5" />
                </button>
              )}
              {view === "admin" && !c.approved && (
                <button className="btn-ghost-3d px-2 text-[10px]" onClick={() => approve(c)}>
                  Approve
                </button>
              )}
              {view === "admin" && (
                <button className="btn-ghost-3d px-2" onClick={() => remove(c.id)}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>,
          ])}
        />
      </Panel>
    </div>
  );
}

export type { ServiceStatus };
