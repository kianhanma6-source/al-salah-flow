import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawReportFooter, drawReportHeader } from "./reports";
import { fmtTime, hoursWorked } from "./attendance";
import type { AttendanceRow } from "./db";

/** Attendance PDF including each employee's full travel path. */
export async function attendancePDF(rows: AttendanceRow[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const y = await drawReportHeader(doc, "Daily Attendance Report");

  autoTable(doc, {
    startY: y + 6,
    head: [
      [
        "Date",
        "Team / Location",
        "Plate",
        "Name",
        "Shift",
        "Time In",
        "Time Out",
        "Hours",
        "Route Points",
        "Signature",
        "Status",
      ],
    ],
    body: rows.map((r) => [
      r.date,
      r.team,
      r.plate,
      r.name,
      r.shift,
      fmtTime(r.timeIn),
      fmtTime(r.timeOut),
      hoursWorked(r).toFixed(2),
      String(r.route.length),
      r.signature,
      r.status,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [17, 46, 82] },
  });

  rows
    .filter((r) => r.route.length)
    .forEach((r) => {
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`TRAVEL PATH — ${r.name} (${r.date})`, 14, 16);
      autoTable(doc, {
        startY: 20,
        head: [["Time", "Latitude", "Longitude", "Accuracy (m)", "Address", "Sync"]],
        body: r.route.map((p) => [
          fmtTime(p.at),
          p.lat.toFixed(6),
          p.lng.toFixed(6),
          p.acc ? p.acc.toFixed(0) : "—",
          p.address ?? "—",
          p.synced === false ? "OFFLINE" : "UPLOADED",
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [17, 46, 82] },
      });
    });

  drawReportFooter(doc, undefined, "attendance");
  doc.save(`attendance_${new Date().toISOString().slice(0, 10)}.pdf`);
}
