import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { getDB, MONTHS, type Branding, type Employee, type PayrollRow, type Signature } from "./db";
import { drawReportFooter, drawReportHeader } from "./reports";
import { toCircleBase64 } from "./imaging";

const money = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Payslip for one payroll row. */
export async function payslipPDF(row: PayrollRow, month: number, year: number, b?: Branding) {
  const brand = b ?? getDB().branding;
  const doc = new jsPDF();
  const y = await drawReportHeader(doc, `Payslip — ${MONTHS[month - 1]} ${year}`, brand);

  autoTable(doc, {
    startY: y + 8,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [17, 46, 82] },
    head: [["Employee Details", ""]],
    body: [
      ["EMP ID", row.empId],
      ["Name", row.name],
      ["Position", row.position],
      ["Working Days", String(row.workingDays)],
      ["Absent Days", String(row.absentDays)],
    ],
  });

  const afterInfo = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: afterInfo + 6,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [17, 46, 82] },
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: [
      ["Basic Salary", money(row.basic), "Absent Deduction", money(row.absentDeduction)],
      ["Benefits", money(row.benefits), "Other Deduction", money(row.otherDeduction)],
      ["Bonus", money(row.bonus), "", ""],
      ["Incentive", money(row.incentive), "", ""],
      [
        "Total Earnings",
        money(row.basic + row.benefits + row.bonus + row.incentive),
        "Total Deductions",
        money(row.absentDeduction + row.otherDeduction),
      ],
      ["NET SALARY", money(row.net), "", ""],
    ],
  });

  drawReportFooter(doc, brand);
  doc.save(`Payslip_${row.empId}_${MONTHS[month - 1]}_${year}.pdf`);
}

/** Certificate of Employment with multiple editable signatories. */
export async function coePDF(
  emp: Employee,
  body: string,
  signatures: Signature[],
  b?: Branding,
) {
  const brand = b ?? getDB().branding;
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const y = await drawReportHeader(doc, "Certificate of Employment", brand);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`, 14, y + 12);
  doc.text("TO WHOM IT MAY CONCERN:", 14, y + 22);
  const lines = doc.splitTextToSize(body, w - 28) as string[];
  doc.text(lines, 14, y + 32, { lineHeightFactor: 1.6 });

  let sy = y + 32 + lines.length * 8 + 20;
  signatures.forEach((s, i) => {
    const x = 14 + (i % 2) * ((w - 28) / 2);
    if (i > 0 && i % 2 === 0) sy += 28;
    doc.line(x, sy, x + 65, sy);
    doc.setFont("helvetica", "bold");
    doc.text(s.name || "____________________", x, sy + 5);
    doc.setFont("helvetica", "normal");
    doc.text(s.position || "", x, sy + 10);
  });

  drawReportFooter(doc, brand);
  doc.save(`COE_${emp.empId}_${emp.fullName.replace(/\s+/g, "_")}.pdf`);
}

/** Employee ID card — front (photo/name/position/EMP ID) + back (info + QR). */
export async function idCardPDF(emp: Employee, b?: Branding) {
  const brand = b ?? getDB().branding;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [86, 54] });

  let logo = "";
  if (brand.logo) {
    try {
      logo = await toCircleBase64(brand.logo, 256);
    } catch {
      logo = "";
    }
  }

  /* FRONT */
  doc.setFillColor(17, 46, 82);
  doc.rect(0, 0, 86, 13, "F");
  if (logo) doc.addImage(logo, "PNG", 2, 1.5, 10, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text(doc.splitTextToSize(brand.companyName, 68) as string[], 14, 5.5);

  doc.setTextColor(20, 20, 20);
  if (emp.photo) {
    try {
      doc.addImage(emp.photo, "JPEG", 4, 17, 24, 24);
    } catch {
      /* ignore */
    }
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(emp.fullName, 50) as string[], 32, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(emp.position || "", 32, 30);
  doc.text(`EMP ID: ${emp.empId}`, 32, 35);
  doc.setFontSize(5.5);
  doc.text("NAD ITALLO-PROGRAMMER v10.0", 84, 51, { align: "right" });

  /* BACK */
  doc.addPage([86, 54], "landscape");
  doc.setFillColor(17, 46, 82);
  doc.rect(0, 0, 86, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("EMPLOYEE INFORMATION", 4, 5.2);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const info = [
    `Emirates ID: ${emp.emiratesId || "—"}`,
    `EID Expiry: ${emp.emiratesIdExpiry || "—"}`,
    `Passport: ${emp.passport || "—"}`,
    `Mobile: ${emp.mobile || "—"}`,
    `Email: ${emp.email || "—"}`,
    `Date Hired: ${emp.dateHired || "—"}`,
    `Status: ${emp.status}`,
  ];
  info.forEach((t, i) => doc.text(t, 4, 13 + i * 4.5));

  const qr = await QRCode.toDataURL(
    `EID:${emp.emiratesId || "N/A"}|EXP:${emp.emiratesIdExpiry || "N/A"}|EMP:${emp.empId}|NAME:${emp.fullName}`,
    { margin: 0, width: 256 },
  );
  doc.addImage(qr, "PNG", 60, 14, 22, 22);
  doc.setFontSize(5);
  doc.text("EID No. + Expiry", 71, 39, { align: "center" });
  doc.text(brand.contact, 4, 50);

  doc.save(`ID_${emp.empId}_${emp.fullName.replace(/\s+/g, "_")}.pdf`);
}

export const qrDataUrl = (text: string) => QRCode.toDataURL(text, { margin: 0, width: 256 });
