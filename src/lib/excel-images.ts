import ExcelJS from "exceljs";
import { getDB, replaceDB, type DB, type ModuleKey } from "./db";

/* ------------------------------------------------------------------ *
 * Excel export / import that carries the photos inside the workbook.
 * Existing xlsx export/import in reports.ts stays untouched.
 * ------------------------------------------------------------------ */

type Sheet = {
  name: string;
  columns: { header: string; key: string; width: number }[];
  rows: Record<string, unknown>[];
  /** row field holding the base64 image */
  photoKey?: string;
};

const IMG_COL_WIDTH = 14;
const IMG_ROW_HEIGHT = 78;

function b64(data: string) {
  const comma = data.indexOf(",");
  return {
    base64: comma >= 0 ? data.slice(comma + 1) : data,
    ext: data.includes("image/png") ? ("png" as const) : ("jpeg" as const),
  };
}

function buildSheets(db: DB): Sheet[] {
  const sheets: Sheet[] = [];
  (Object.keys(db.modules) as ModuleKey[]).forEach((k) => {
    sheets.push({
      name: `${k}-inventory`,
      photoKey: "photo",
      columns: [
        { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
        { header: "id", key: "id", width: 20 },
        { header: "transNo", key: "transNo", width: 16 },
        { header: "date", key: "date", width: 14 },
        { header: "materialName", key: "materialName", width: 26 },
        { header: "model", key: "model", width: 18 },
        { header: "wmNo", key: "wmNo", width: 16 },
        { header: "wmKeyNo", key: "wmKeyNo", width: 16 },
        { header: "unit", key: "unit", width: 10 },
        { header: "qty", key: "qty", width: 10 },
      ],
      rows: db.modules[k].inventory as unknown as Record<string, unknown>[],
    });
    sheets.push({
      name: `${k}-deployment`,
      photoKey: "photo",
      columns: [
        { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
        { header: "id", key: "id", width: 20 },
        { header: "transNo", key: "transNo", width: 16 },
        { header: "date", key: "date", width: 14 },
        { header: "name", key: "name", width: 22 },
        { header: "area", key: "area", width: 20 },
        { header: "materialName", key: "materialName", width: 26 },
        { header: "model", key: "model", width: 18 },
        { header: "unit", key: "unit", width: 10 },
        { header: "wmNo", key: "wmNo", width: 16 },
        { header: "wmKeyNo", key: "wmKeyNo", width: 16 },
        { header: "qty", key: "qty", width: 10 },
      ],
      rows: db.modules[k].deployment.flatMap((d) =>
        d.lines.map((l) => ({
          id: d.id,
          transNo: d.transNo,
          date: d.date,
          name: d.name,
          area: d.area,
          ...l,
        })),
      ) as unknown as Record<string, unknown>[],
    });
  });

  sheets.push({
    name: "accomplishment",
    photoKey: "photo",
    columns: [
      { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
      { header: "id", key: "id", width: 20 },
      { header: "date", key: "date", width: 14 },
      { header: "name", key: "name", width: 22 },
      { header: "area", key: "area", width: 20 },
      { header: "activity", key: "activity", width: 26 },
      { header: "qty", key: "qty", width: 10 },
    ],
    rows: db.accomplishment as unknown as Record<string, unknown>[],
  });

  sheets.push({
    name: "employees",
    photoKey: "photo",
    columns: [
      { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
      { header: "id", key: "id", width: 20 },
      { header: "empId", key: "empId", width: 18 },
      { header: "fullName", key: "fullName", width: 26 },
      { header: "position", key: "position", width: 20 },
      { header: "department", key: "department", width: 20 },
      { header: "salary", key: "salary", width: 12 },
      { header: "emiratesId", key: "emiratesId", width: 22 },
      { header: "emiratesIdExpiry", key: "emiratesIdExpiry", width: 18 },
      { header: "passport", key: "passport", width: 18 },
      { header: "passportExpiry", key: "passportExpiry", width: 18 },
      { header: "mobile", key: "mobile", width: 18 },
      { header: "email", key: "email", width: 24 },
      { header: "address", key: "address", width: 28 },
      { header: "dateHired", key: "dateHired", width: 14 },
      { header: "gender", key: "gender", width: 10 },
      { header: "birthday", key: "birthday", width: 14 },
      { header: "status", key: "status", width: 12 },
      { header: "dateEncoded", key: "dateEncoded", width: 14 },
    ],
    rows: db.employees as unknown as Record<string, unknown>[],
  });

  sheets.push({
    name: "products",
    photoKey: "photo",
    columns: [
      { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
      { header: "id", key: "id", width: 20 },
      { header: "name", key: "name", width: 26 },
      { header: "model", key: "model", width: 18 },
      { header: "price", key: "price", width: 12 },
      { header: "commission", key: "commission", width: 14 },
      { header: "active", key: "active", width: 10 },
      { header: "createdAt", key: "createdAt", width: 22 },
    ],
    rows: db.products as unknown as Record<string, unknown>[],
  });

  sheets.push({
    name: "service",
    photoKey: "photo",
    columns: [
      { header: "Photo", key: "photo", width: IMG_COL_WIDTH },
      { header: "id", key: "id", width: 20 },
      { header: "date", key: "date", width: 14 },
      { header: "wmName", key: "wmName", width: 22 },
      { header: "wmNo", key: "wmNo", width: 16 },
      { header: "wmKeyNo", key: "wmKeyNo", width: 16 },
      { header: "companyName", key: "companyName", width: 26 },
      { header: "clientName", key: "clientName", width: 22 },
      { header: "address", key: "address", width: 28 },
      { header: "contact", key: "contact", width: 18 },
      { header: "technician", key: "technician", width: 20 },
      { header: "assistant", key: "assistant", width: 20 },
      { header: "status", key: "status", width: 14 },
      { header: "remarks", key: "remarks", width: 40 },
    ],
    rows: db.service.map((c) => ({ ...c, photo: c.photos?.[0] ?? "" })) as unknown as Record<string, unknown>[],
  });

  sheets.push({
    name: "orders",
    columns: [
      { header: "id", key: "id", width: 20 },
      { header: "date", key: "date", width: 14 },
      { header: "companyName", key: "companyName", width: 26 },
      { header: "repName", key: "repName", width: 22 },
      { header: "contact", key: "contact", width: 18 },
      { header: "email", key: "email", width: 24 },
      { header: "productName", key: "productName", width: 24 },
      { header: "model", key: "model", width: 18 },
      { header: "qty", key: "qty", width: 10 },
      { header: "commissionPerUnit", key: "commissionPerUnit", width: 18 },
      { header: "commissionTotal", key: "commissionTotal", width: 18 },
      { header: "salespersonId", key: "salespersonId", width: 22 },
      { header: "approved", key: "approved", width: 12 },
    ],
    rows: db.orders as unknown as Record<string, unknown>[],
  });

  return sheets;
}

/** Export every record + its picture into one readable, auto-fitted workbook. */
export async function exportAllExcelWithImages(db: DB = getDB()) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AL HAYAH AL SALAH System";

  buildSheets(db).forEach((sheet) => {
    const ws = wb.addWorksheet(sheet.name.slice(0, 30));
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    sheet.rows.forEach((r) => {
      const values: Record<string, unknown> = { ...r };
      if (sheet.photoKey) values[sheet.photoKey] = "";
      const row = ws.addRow(values);
      row.alignment = { vertical: "middle", wrapText: true };

      const src = sheet.photoKey ? String(r[sheet.photoKey] ?? "") : "";
      if (src.startsWith("data:image")) {
        const { base64, ext } = b64(src);
        const imageId = wb.addImage({ base64, extension: ext });
        row.height = IMG_ROW_HEIGHT;
        ws.addImage(imageId, {
          tl: { col: 0.2, row: row.number - 0.85 },
          ext: { width: 90, height: 90 },
        });
        // keep the base64 in a hidden trailing column so re-upload can restore it
        row.getCell(sheet.columns.length + 1).value = src;
      }
    });

    if (sheet.photoKey) {
      const hidden = ws.getColumn(sheet.columns.length + 1);
      hidden.header = "photo_base64";
      hidden.width = 12;
      hidden.hidden = true;
      ws.getRow(1).getCell(sheet.columns.length + 1).value = "photo_base64";
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `AHAS_ALL_DATA_WITH_PHOTOS_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type SheetRows = Record<string, Record<string, unknown>[]>;

async function readWorkbook(file: File): Promise<SheetRows> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const out: SheetRows = {};

  wb.eachSheet((ws) => {
    const headers: string[] = [];
    ws.getRow(1).eachCell((cell, col) => {
      headers[col] = String(cell.value ?? "").trim();
    });

    // embedded pictures → keyed by the row they sit on
    const pics = new Map<number, string>();
    (ws.getImages?.() ?? []).forEach((img) => {
      const media = wb.model.media?.find((m) => String((m as { index?: number }).index) === String(img.imageId));
      const buffer = (media as unknown as { buffer?: Uint8Array })?.buffer;
      const ext = (media as unknown as { extension?: string })?.extension ?? "png";
      if (!buffer) return;
      let binary = "";
      new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)));
      pics.set(Math.round(Number(img.range.tl.nativeRow)) + 1, `data:image/${ext};base64,${btoa(binary)}`);
    });

    const rows: Record<string, unknown>[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const key = headers[col];
        if (!key) return;
        const v = cell.value;
        obj[key] = v && typeof v === "object" && "text" in v ? (v as { text: string }).text : v;
      });
      const restored = String(obj["photo_base64"] ?? "") || pics.get(rowNumber) || "";
      if (restored) obj["photo"] = restored;
      delete obj["photo_base64"];
      if (Object.values(obj).some((v) => v !== null && v !== undefined && v !== "")) rows.push(obj);
    });
    out[ws.name] = rows;
  });

  return out;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Import the edited workbook back — text AND photos are restored to their records. */
export async function importAllExcelWithImages(file: File) {
  const sheets = await readWorkbook(file);
  const db = getDB();

  (Object.keys(db.modules) as ModuleKey[]).forEach((k) => {
    const inv = sheets[`${k}-inventory`];
    if (inv?.length) {
      db.modules[k].inventory = inv.map((r) => ({
        id: str(r["id"]) || Math.random().toString(36).slice(2),
        transNo: str(r["transNo"]),
        date: str(r["date"]).slice(0, 10),
        materialName: str(r["materialName"]),
        photo: str(r["photo"]),
        model: str(r["model"]),
        wmNo: str(r["wmNo"]),
        wmKeyNo: str(r["wmKeyNo"]),
        unit: str(r["unit"]),
        qty: num(r["qty"]),
      }));
    }

    const dep = sheets[`${k}-deployment`];
    if (dep?.length) {
      const grouped = new Map<string, DB["modules"][ModuleKey]["deployment"][number]>();
      dep.forEach((r) => {
        const key = str(r["id"]) || str(r["transNo"]);
        if (!grouped.has(key))
          grouped.set(key, {
            id: key,
            transNo: str(r["transNo"]),
            date: str(r["date"]).slice(0, 10),
            name: str(r["name"]),
            area: str(r["area"]),
            lines: [],
          });
        grouped.get(key)!.lines.push({
          materialName: str(r["materialName"]),
          photo: str(r["photo"]),
          model: str(r["model"]),
          unit: str(r["unit"]),
          wmNo: str(r["wmNo"]),
          wmKeyNo: str(r["wmKeyNo"]),
          qty: num(r["qty"]),
        });
      });
      db.modules[k].deployment = [...grouped.values()];
    }
  });

  const acc = sheets["accomplishment"];
  if (acc?.length)
    db.accomplishment = acc.map((r) => ({
      id: str(r["id"]) || Math.random().toString(36).slice(2),
      date: str(r["date"]).slice(0, 10),
      name: str(r["name"]),
      area: str(r["area"]),
      activity: str(r["activity"]),
      photo: str(r["photo"]),
      qty: num(r["qty"]),
    }));

  const emp = sheets["employees"];
  if (emp?.length)
    db.employees = emp.map((r) => {
      const existing = db.employees.find((e) => e.id === str(r["id"]) || e.empId === str(r["empId"]));
      return {
        ...(existing ?? ({} as (typeof db.employees)[number])),
        id: str(r["id"]) || existing?.id || Math.random().toString(36).slice(2),
        empId: str(r["empId"]),
        dateEncoded: str(r["dateEncoded"]).slice(0, 10) || existing?.dateEncoded || "",
        photo: str(r["photo"]) || existing?.photo || "",
        fullName: str(r["fullName"]),
        position: str(r["position"]),
        department: str(r["department"]),
        salary: num(r["salary"]),
        emiratesId: str(r["emiratesId"]),
        emiratesIdExpiry: str(r["emiratesIdExpiry"]).slice(0, 10),
        passport: str(r["passport"]),
        passportExpiry: str(r["passportExpiry"]).slice(0, 10),
        mobile: str(r["mobile"]),
        email: str(r["email"]),
        address: str(r["address"]),
        dateHired: str(r["dateHired"]).slice(0, 10),
        gender: (str(r["gender"]) as "Male" | "Female" | "") || "",
        birthday: str(r["birthday"]).slice(0, 10),
        status: str(r["status"]) === "IN-ACTIVE" ? "IN-ACTIVE" : "ACTIVE",
      };
    });

  const prods = sheets["products"];
  if (prods?.length)
    db.products = prods.map((r) => ({
      id: str(r["id"]) || Math.random().toString(36).slice(2),
      photo: str(r["photo"]),
      name: str(r["name"]),
      model: str(r["model"]),
      price: num(r["price"]),
      commission: num(r["commission"]),
      active: str(r["active"]).toLowerCase() !== "false",
      createdAt: str(r["createdAt"]) || new Date().toISOString(),
    }));

  const svc = sheets["service"];
  if (svc?.length)
    db.service = svc.map((r) => {
      const existing = db.service.find((c) => c.id === str(r["id"]));
      const photo = str(r["photo"]);
      return {
        ...(existing ?? ({} as (typeof db.service)[number])),
        id: str(r["id"]) || Math.random().toString(36).slice(2),
        date: str(r["date"]).slice(0, 10),
        wmName: str(r["wmName"]),
        wmNo: str(r["wmNo"]),
        wmKeyNo: str(r["wmKeyNo"]),
        companyName: str(r["companyName"]),
        clientName: str(r["clientName"]),
        address: str(r["address"]),
        contact: str(r["contact"]),
        technician: str(r["technician"]),
        assistant: str(r["assistant"]),
        remarks: str(r["remarks"]),
        status: (str(r["status"]) || "RECEIVED") as (typeof db.service)[number]["status"],
        approved: existing?.approved ?? false,
        photos: photo ? [photo, ...(existing?.photos ?? []).slice(1)] : (existing?.photos ?? []),
        techPhotos: existing?.techPhotos ?? [],
        techRemarks: existing?.techRemarks ?? "",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
    });

  const ord = sheets["orders"];
  if (ord?.length)
    db.orders = ord.map((r) => ({
      id: str(r["id"]) || Math.random().toString(36).slice(2),
      date: str(r["date"]).slice(0, 10),
      productId: str(r["productId"]),
      productName: str(r["productName"]),
      model: str(r["model"]),
      qty: num(r["qty"]),
      repName: str(r["repName"]),
      contact: str(r["contact"]),
      email: str(r["email"]),
      companyName: str(r["companyName"]),
      location: str(r["location"]),
      salespersonId: str(r["salespersonId"]),
      commissionPerUnit: num(r["commissionPerUnit"]),
      commissionTotal: num(r["commissionTotal"]),
      approved: str(r["approved"]).toLowerCase() === "true",
    }));

  replaceDB(db);
}
