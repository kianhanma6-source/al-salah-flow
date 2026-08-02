import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { getDB, MONTHS, signatureFor, type Branding, type Employee, type PayrollRow, type Signature } from "./db";
import { drawReportFooter, drawReportHeader } from "./reports";
import { toReportLogo } from "./imaging";

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

  drawReportFooter(doc, brand, "payslip");
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

/** Code128 barcode as PNG base64. */
export function barcodeDataUrl(value: string) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value || "N/A", {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    width: 2,
    height: 60,
  });
  return canvas.toDataURL("image/png");
}

const NAVY: [number, number, number] = [16, 35, 66];
const GOLD: [number, number, number] = [198, 158, 74];

/** Employee ID card — official layout (portrait 54 x 86 mm), front + back. */
export async function idCardPDF(emp: Employee, b?: Branding) {
  const db = getDB();
  const brand = b ?? db.branding;
  const W = 54;
  const H = 86;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });

  let logo = "";
  if (brand.logo) {
    try {
      logo = await toReportLogo(brand.logo, 512);
    } catch {
      logo = "";
    }
  }

  const drawFrame = () => {
    doc.setFillColor(252, 252, 250);
    doc.rect(0, 0, W, H, "F");
    /* top-right navy corner with gold edge */
    doc.setFillColor(...GOLD);
    doc.triangle(W - 26, 0, W, 0, W, 26, "F");
    doc.setFillColor(...NAVY);
    doc.triangle(W - 23, 0, W, 0, W, 23, "F");
    /* bottom-left navy corner with gold edge */
    doc.setFillColor(...GOLD);
    doc.triangle(0, H - 22, 22, H, 0, H, "F");
    doc.setFillColor(...NAVY);
    doc.triangle(0, H - 19, 19, H, 0, H, "F");
  };

  const drawBrandRow = () => {
    if (logo) {
      try {
        const p = doc.getImageProperties(logo);
        const h = 11;
        const w = Math.min(16, (p.width / p.height) * h);
        doc.addImage(logo, "PNG", 4, 4, w, h);
      } catch {
        /* ignore */
      }
    }
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(doc.splitTextToSize(brand.companyName, 30) as string[], 22, 8);
  };

  /* ---------- FRONT ---------- */
  drawFrame();
  drawBrandRow();

  /* photo with gold frame */
  const px = 15.5;
  const py = 19;
  const pw = 23;
  const ph = 28;
  doc.setFillColor(...GOLD);
  doc.rect(px - 1, py - 1, pw + 2, ph + 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(px, py, pw, ph, "F");
  if (emp.photo) {
    try {
      doc.addImage(emp.photo, "JPEG", px, py, pw, ph);
    } catch {
      /* ignore */
    }
  }

  /* detail lines */
  const fields: [string, string][] = [
    ["Full Name:", emp.fullName],
    ["Position:", emp.position],
    ["Employee ID:", emp.empId],
    ["Department:", emp.department || "—"],
  ];
  let fy = 55;
  fields.forEach(([label, value]) => {
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(label, 5, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.4);
    doc.text(doc.splitTextToSize(String(value || ""), 26) as string[], 21, fy);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.line(20, fy + 1, 49, fy + 1);
    fy += 6;
  });

  /* management signature + SIGNATURE label */
  const sig = signatureFor(db, "idcard");
  if (sig) {
    try {
      const p = doc.getImageProperties(sig.record.image);
      const w = sig.width || 18;
      const h = (p.height / p.width) * w;
      doc.addImage(sig.record.image, "PNG", sig.x || 28, (sig.y || 71) - h, w, h);
    } catch {
      /* ignore */
    }
  }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(27, 72, 50, 72);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.text("SIGNATURE", 38.5, 75, { align: "center" });

  /* barcode: Emirates ID number + expiry, image only */
  try {
    const bc = barcodeDataUrl(`${emp.emiratesId || "N/A"} ${emp.emiratesIdExpiry || ""}`.trim());
    doc.addImage(bc, "PNG", 24, 77, 26, 7);
  } catch {
    /* ignore */
  }

  /* ---------- BACK ---------- */
  doc.addPage([W, H], "portrait");
  drawFrame();
  drawBrandRow();

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("EMPLOYEE DETAILS", W / 2, 22, { align: "center" });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(12, 23.5, W - 12, 23.5);

  doc.setFontSize(5);
  const details: [string, string][] = [
    ["Joining Date", emp.dateHired || "—"],
    ["Gender", emp.gender || "—"],
    ["Birthday", emp.birthday || "—"],
    ["Validity", emp.emiratesIdExpiry || "—"],
  ];
  let dy = 28;
  details.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 6, dy);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 24, dy);
    dy += 4.5;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.text("TERMS AND CONDITIONS", W / 2, dy + 3, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.4);
  const terms =
    `By using this identification card, the holder agrees to abide by the company's policies and regulations. This card remains the property of ${brand.companyName} and must be surrendered upon request or upon termination of employment.\n\nIf found, please return this card immediately to the company address listed below. Unauthorized use, alteration, or duplication of this card is strictly prohibited and may result in legal action.`;
  doc.text(doc.splitTextToSize(terms, W - 12) as string[], 6, dy + 7, {
    align: "justify",
    maxWidth: W - 12,
    lineHeightFactor: 1.35,
  });

  /* contact footer */
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 24, W, 24, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 24.7, W, 0.7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.4);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT US", 4, H - 20);
  doc.setFont("helvetica", "normal");
  doc.text(brand.contact.replace(/^Contact:\s*/i, ""), 4, H - 17);
  doc.setFont("helvetica", "bold");
  doc.text("EMAIL", 4, H - 13.5);
  doc.setFont("helvetica", "normal");
  doc.text(brand.email.replace(/^Email:\s*/i, ""), 4, H - 10.5);
  doc.setFont("helvetica", "bold");
  doc.text("ADDRESS", 4, H - 7);
  doc.setFont("helvetica", "normal");
  doc.text(
    doc.splitTextToSize(`${brand.addressLine1} ${brand.addressLine2}`, 34) as string[],
    4,
    H - 4,
  );

  /* MANAGEMENT signature block */
  if (sig) {
    try {
      const p = doc.getImageProperties(sig.record.image);
      const w = 16;
      const h = (p.height / p.width) * w;
      doc.addImage(sig.record.image, "PNG", 36, H - 14 - h, w, h);
    } catch {
      /* ignore */
    }
  }
  doc.setDrawColor(...GOLD);
  doc.line(36, H - 12, 52, H - 12);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.6);
  doc.text("MANAGEMENT", 44, H - 9, { align: "center" });

  doc.save(`ID_${emp.empId}_${emp.fullName.replace(/\s+/g, "_")}.pdf`);
}

export const qrDataUrl = (text: string) => QRCode.toDataURL(text, { margin: 0, width: 256 });
