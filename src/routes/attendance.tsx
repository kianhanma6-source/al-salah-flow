import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { CheckCircle2, LogIn, LogOut, ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, ReportHeader } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, SearchBar } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useDB, type AttendanceRow } from "@/lib/db";
import {
  approveEarlyOut,
  canTimeOut,
  deleteAttendance,
  fmtTime,
  flushQueue,
  hoursWorked,
  matchBarcode,
  openRowFor,
  requestEarlyOut,
  resumeTracking,
  timeIn,
  timeOut,
  updateAttendance,
} from "@/lib/attendance";
import { attendancePDF } from "@/lib/attendance-report";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Daily Attendance — Barcode Time In / Out | AL HAYAH AL SALAH" },
      {
        name: "description",
        content:
          "Scan the employee ID barcode to time in and out, with automatic GPS tracking, 8-hour shift rules and early-out approval.",
      },
      { property: "og:title", content: "Daily Attendance | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Barcode attendance with live GPS tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell tab="attendance">
      <ClientOnly fallback={null}>
        <Attendance />
      </ClientOnly>
    </AppShell>
  ),
});

const EDITORS = ["HR Admin", "Manager", "PROGRAMMER-IV", "PROGRAMMER"];

function Attendance() {
  const db = useDB();
  const { user } = useAuth();
  const canEdit = !!user && EDITORS.includes(user.role);
  const isTechnician = user?.role === "Technician";

  const [code, setCode] = useState("");
  const [team, setTeam] = useState("");
  const [plate, setPlate] = useState("");
  const [shift, setShift] = useState("Day");
  const [q, setQ] = useState("");

  useEffect(() => {
    resumeTracking();
    void flushQueue();
  }, []);

  const ownEmployee = db.employees.find((e) => e.userId === user?.id);

  const rows = useMemo(() => {
    let list = [...db.attendance].sort((a, b) => (a.timeIn < b.timeIn ? 1 : -1));
    if (isTechnician && ownEmployee) list = list.filter((r) => r.employeeId === ownEmployee.id);
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) =>
      `${r.date} ${r.name} ${r.empId} ${r.team} ${r.plate} ${r.shift} ${r.status}`
        .toLowerCase()
        .includes(s),
    );
  }, [db.attendance, q, isTechnician, ownEmployee]);

  const scanIn = () => {
    const emp = matchBarcode(code);
    if (!emp) return toast.error("Barcode did not match any employee record.");
    const err = timeIn(emp, { team, plate, shift });
    if (err) return toast.error(err);
    setCode("");
    toast.success(`TIME IN approved for ${emp.fullName}. GPS tracking started.`);
  };

  const scanOut = () => {
    const emp = matchBarcode(code);
    if (!emp) return toast.error("Barcode did not match any employee record.");
    const row = openRowFor(emp.id);
    if (!row) return toast.error("No open time-in record for this employee.");
    const err = timeOut(row);
    if (err) {
      requestEarlyOut(row);
      return toast.warning(`${err} Early-out approval requested.`);
    }
    setCode("");
    toast.success(`TIME OUT recorded for ${emp.fullName}. GPS tracking stopped.`);
  };

  return (
    <div className="space-y-5">
      <ReportHeader />

      <Panel title="Barcode Time In / Time Out">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Scan barcode (Emirates ID no.)">
            <Input
              value={code}
              autoFocus
              placeholder="Scan or type…"
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scanIn()}
            />
          </Field>
          <Field label="Team / Location">
            <Input value={team} onChange={(e) => setTeam(e.target.value)} />
          </Field>
          <Field label="Vehicle Plate">
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} />
          </Field>
          <Field label="Shift">
            <Input value={shift} onChange={(e) => setShift(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-3d" onClick={scanIn}>
            <LogIn className="size-4" /> Time In
          </button>
          <button className="btn-3d" onClick={scanOut}>
            <LogOut className="size-4" /> Time Out
          </button>
          <button className="btn-ghost-3d" onClick={() => void flushQueue().then((n) => toast.success(`${n} offline GPS point(s) uploaded.`))}>
            <ScanLine className="size-4" /> Sync offline GPS
          </button>
          <button className="btn-ghost-3d" onClick={() => attendancePDF(rows)}>
            PDF (with travel path)
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          First scan = TIME IN (official instantly). TIME OUT unlocks automatically after 8 hours;
          earlier requires HR Admin / Manager / NAD ITALLO approval.
        </p>
      </Panel>

      <Panel title="Attendance Records">
        <SearchBar value={q} set={setQ} />
        <div className="mt-4">
          <DataTable
            columns={[
              "Date",
              "Team / Location",
              "Plate",
              "Name",
              "Shift",
              "Time In",
              "Time Out",
              "Hours",
              "Route Pts",
              "Signature",
              "Status",
              "Action",
            ]}
            rows={rows.map((r) => [
              canEdit ? (
                <Input
                  className="w-32 text-xs"
                  type="date"
                  value={r.date}
                  onChange={(e) => updateAttendance(r.id, { date: e.target.value })}
                />
              ) : (
                r.date
              ),
              canEdit ? (
                <Input
                  className="w-28 text-xs"
                  value={r.team}
                  onChange={(e) => updateAttendance(r.id, { team: e.target.value })}
                />
              ) : (
                r.team || "—"
              ),
              r.plate || "—",
              r.name,
              r.shift || "—",
              fmtTime(r.timeIn),
              fmtTime(r.timeOut),
              hoursWorked(r).toFixed(2),
              r.route.length,
              r.signature,
              <StatusPill key="s" row={r} />,
              <div key="a" className="flex gap-1">
                {canEdit && r.status === "EARLY OUT PENDING" && (
                  <button
                    className="btn-ghost-3d px-2"
                    title="Approve early time out"
                    onClick={() => {
                      approveEarlyOut(r.id);
                      toast.success("Early time out approved.");
                    }}
                  >
                    <CheckCircle2 className="size-4 text-success" />
                  </button>
                )}
                {canEdit && !r.timeOut && canTimeOut(r) && (
                  <button
                    className="btn-ghost-3d px-2"
                    onClick={() => {
                      timeOut(r);
                      toast.success("Timed out.");
                    }}
                  >
                    <LogOut className="size-4" />
                  </button>
                )}
                {canEdit && (
                  <button
                    className="btn-ghost-3d px-2"
                    onClick={() => {
                      if (confirm("Delete this attendance record?")) deleteAttendance(r.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                )}
              </div>,
            ])}
          />
        </div>
      </Panel>
    </div>
  );
}

function StatusPill({ row }: { row: AttendanceRow }) {
  const tone =
    row.status === "ON DUTY"
      ? "bg-success/20 text-success border-success/50"
      : row.status === "EARLY OUT PENDING"
        ? "bg-warning/20 text-warning border-warning/50"
        : "bg-primary/20 text-primary border-primary/50";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {row.status}
    </span>
  );
}
