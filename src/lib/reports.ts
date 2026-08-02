import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDB, replaceDB, signatureFor, type Branding, type DB, type DocKey } from "./db";
import { toCircleBase64 } from "./imaging";

export type Row = Record<string, unknown>;

export function exportExcel(sheetName: string, rows: Row[], fileName: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No records" }]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportAllExcel(db: DB = getDB()) {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Row[]) =>
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No records" }]),
      name.slice(0, 30),
    );
  add("Users", db.users.map(({ password: _p, ...u }) => u) as Row[]);
  add("Branding", [db.branding as unknown as Row]);
  (Object.keys(db.modules) as (keyof DB["modules"])[]).forEach((k) => {
    // photo kept as base64 string so pictures survive export/import
    add(`${k}-inventory`, db.modules[k].inventory as unknown as Row[]);
    add(
      `${k}-deployment`,
      db.modules[k].deployment.flatMap((d) =>
        d.lines.map((l) => ({
          id: d.id,
          transNo: d.transNo,
          date: d.date,
          name: d.name,
          area: d.area,
          ...l,
        })),
      ) as Row[],
    );
  });
  add("accomplishment", db.accomplishment as unknown as Row[]);
  XLSX.writeFile(wb, `AHAS_ALL_DATA_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function importAllExcel(file: File) {
  return new Promise<void>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const wb = XLSX.read(fr.result, { type: "binary" });
        const db = getDB();
        const get = (n: string) =>
          wb.Sheets[n] ? (XLSX.utils.sheet_to_json(wb.Sheets[n]) as Row[]) : [];
        const users = get("Users");
        if (users.length)
          db.users = users.map((u) => ({ password: "changeme", ...(u as object) })) as DB["users"];
        const brand = get("Branding");
        if (brand.length) db.branding = { ...db.branding, ...(brand[0] as object) } as DB["branding"];
        (Object.keys(db.modules) as (keyof DB["modules"])[]).forEach((k) => {
          const inv = get(`${k}-inventory`);
          if (inv.length)
            db.modules[k].inventory = inv.map((r) => ({
              photo: "",
              ...(r as object),
            })) as unknown as DB["modules"][typeof k]["inventory"];

          const dep = get(`${k}-deployment`);
          if (dep.length) {
            const grouped = new Map<string, DB["modules"][typeof k]["deployment"][number]>();
            dep.forEach((r) => {
              const row = r as Record<string, never>;
              const key = String(row.id ?? row.transNo);
              if (!grouped.has(key))
                grouped.set(key, {
                  id: String(row.id ?? key),
                  transNo: String(row.transNo ?? ""),
                  date: String(row.date ?? ""),
                  name: String(row.name ?? ""),
                  area: String(row.area ?? ""),
                  lines: [],
                } as never);
              grouped.get(key)!.lines.push({
                materialName: String(row.materialName ?? ""),
                photo: String(row.photo ?? ""),
                model: String(row.model ?? ""),
                unit: String(row.unit ?? ""),
                wmNo: row.wmNo ? String(row.wmNo) : undefined,
                wmKeyNo: row.wmKeyNo ? String(row.wmKeyNo) : undefined,
                qty: Number(row.qty ?? 0),
              });
            });
            db.modules[k].deployment = [...grouped.values()];
          }
        });
        const acc = get("accomplishment");
        if (acc.length)
          db.accomplishment = acc.map((r) => ({
            photo: "",
            ...(r as object),
          })) as unknown as DB["accomplishment"];
        replaceDB(db);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    fr.onerror = reject;
    fr.readAsBinaryString(file);
  });
}

export function backupJson(db: DB = getDB()) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `db_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function restoreJson(file: File) {
  return new Promise<void>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        replaceDB(JSON.parse(String(fr.result)) as DB);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

/** Shared branded header for every generated document:
 *  [ROUND LOGO] COMPANY NAME side by side, address / contact / email below the name,
 *  report title below the header block. Returns the Y position after the header. */
export async function drawReportHeader(
  doc: jsPDF,
  title: string,
  brand: Branding = getDB().branding,
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const top = 12;

  let round = "";
  if (brand.logo) {
    try {
      round = await toCircleBase64(brand.logo, 512);
    } catch {
      round = "";
    }
  }

  const size = 20;
  const left = 14;
  let logoW = size;
  if (round) {
    try {
      const props = doc.getImageProperties(round);
      logoW = Math.min(34, (props.width / props.height) * size);
      doc.addImage(round, "PNG", left, top, logoW, size);
    } catch {
      /* ignore */
    }
  }
  const textX = round ? left + logoW + 6 : left;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(brand.companyName, textX, top + (round ? size / 2 + 1.5 : 5));

  let y = top + (round ? size + 6 : 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  [brand.addressLine1, brand.addressLine2, brand.contact, brand.email]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(String(line), textX, y);
      y += 5;
    });

  doc.setDrawColor(17, 46, 82);
  doc.setLineWidth(0.6);
  doc.line(left, y + 1, w - left, y + 1);

  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), w / 2, y + 8, { align: "center" });
  }
  return y + 8;
}

/** Standard footer: assigned signature image (if any) + signatories + programmer version tag. */
export function drawReportFooter(
  doc: jsPDF,
  brand: Branding = getDB().branding,
  docKey: DocKey = "all",
) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const sig = signatureFor(getDB(), docKey);
  if (sig) {
    try {
      const props = doc.getImageProperties(sig.record.image);
      const width = sig.width || 40;
      const height = (props.height / props.width) * width;
      doc.addImage(sig.record.image, "PNG", sig.x, sig.y, width, height);
      doc.setFontSize(7);
      doc.text(sig.record.label, sig.x, sig.y + height + 4);
    } catch {
      /* ignore unsupported signature image */
    }
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(brand.signatory1, 14, h - 14);
  doc.text(brand.signatory2, 14, h - 8);
  doc.text("NAD ITALLO-PROGRAMMER v10.0", w - 14, h - 8, { align: "right" });
}

/** Branded PDF: logo left + company name beside it, table body, signatories + version footer.
 *  Pass `photos` (one entry per row, base64) to print the saved pictures inside the report. */
export async function exportPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  b?: Branding,
  photos?: (string | undefined)[],
  docKey: DocKey = "all",
) {
  const brand = b ?? getDB().branding;
  const withPhotos = !!photos?.some(Boolean);
  const cols = withPhotos ? ["Photo", ...columns] : columns;
  const body = withPhotos ? rows.map((r) => ["", ...r]) : rows;
  const doc = new jsPDF({ orientation: cols.length > 6 ? "landscape" : "portrait" });
  const y = await drawReportHeader(doc, title, brand);




  autoTable(doc, {
    startY: y + 13,
    head: [cols],
    body: body.length ? body : [cols.map(() => "-")],
    styles: { fontSize: 8, cellPadding: 2, minCellHeight: withPhotos ? 16 : undefined },
    headStyles: { fillColor: [17, 46, 82] },
    columnStyles: withPhotos ? { 0: { cellWidth: 18 } } : undefined,
    didDrawCell: (data) => {
      if (!withPhotos || data.section !== "body" || data.column.index !== 0) return;
      const src = photos?.[data.row.index];
      if (!src) return;
      try {
        doc.addImage(src, "JPEG", data.cell.x + 2, data.cell.y + 2, 12, 12);
      } catch {
        /* ignore unsupported image */
      }
    },
    didDrawPage: () => drawReportFooter(doc, brand, docKey),
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}


export function exportAllPDF(db: DB = getDB()) {
  const rows: (string | number)[][] = [];
  const photos: (string | undefined)[] = [];
  (Object.keys(db.modules) as (keyof DB["modules"])[]).forEach((k) => {
    db.modules[k].inventory.forEach((i) => {
      rows.push([k, "INVENTORY", i.transNo, i.date, i.materialName, i.model, i.unit, i.qty]);
      photos.push(i.photo || undefined);
    });
    db.modules[k].deployment.forEach((d) =>
      d.lines.forEach((l) => {
        rows.push([k, "DEPLOYMENT", d.transNo, d.date, l.materialName, l.model, l.unit, l.qty]);
        photos.push(l.photo || undefined);
      }),
    );
  });
  db.accomplishment.forEach((a) => {
    rows.push(["accomplishment", "ACTIVITY", "—", a.date, a.name, a.area, a.activity, a.qty]);
    photos.push(a.photo || undefined);
  });
  exportPDF(
    "All Data Report",
    ["Module", "Type", "Trans No", "Date", "Material", "Model", "Unit", "Qty"],
    rows,
    db.branding,
    photos,

  );
}
