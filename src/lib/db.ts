import { useSyncExternalStore } from "react";

export const APP_VERSION = "v10.0";
export const PROGRAMMER_TAG = "NAD ITALLO-PROGRAMMER " + APP_VERSION;

export type Role =
  | "PROGRAMMER-IV"
  | "PROGRAMMER"
  | "Logistic Admin"
  | "Logistic User"
  | "Warehouse Admin"
  | "Warehouse User"
  | "Manager"
  | "HR Admin"
  | "Sales Person"
  | "Technician"
  | "Collection Team"
  | "Client"
  | "Viewer"
  /* legacy roles kept so existing saved accounts keep working */
  | "ADMIN"
  | "USER"
  | "VISITOR"
  | "Collection team"
  | "Sales"
  | "WM Deployment"
  | "Logistic";

export const ROLES: Role[] = [
  "PROGRAMMER-IV",
  "PROGRAMMER",
  "Logistic Admin",
  "Logistic User",
  "Warehouse Admin",
  "Warehouse User",
  "Manager",
  "HR Admin",
  "Sales Person",
  "Technician",
  "Collection Team",
  "Client",
  "Viewer",
];

export const PROTECTED_USERNAME = "NAD ITALLO";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  position: string;
  role: Role;
  locked?: boolean;
  /** Dashboard permissions assigned by NAD ITALLO (overrides role defaults). */
  perms?: string[];
  createdAt: string;
}

export interface Branding {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  contact: string;
  email: string;
  logo: string; // base64 or url
  signatory1: string;
  signatory2: string;
}


export interface InventoryRow {
  id: string;
  transNo: string;
  date: string;
  materialName: string;
  photo: string;
  model: string;
  wmNo?: string;
  wmKeyNo?: string;
  unit: string;
  qty: number;
}

export interface DeploymentLine {
  materialName: string;
  photo: string;
  model: string;
  unit: string;
  wmNo?: string;
  wmKeyNo?: string;
  qty: number;
}

export interface DeploymentRow {
  id: string;
  transNo: string;
  date: string;
  name: string;
  area: string;
  lines: DeploymentLine[];
}

export interface AccomplishmentRow {
  id: string;
  date: string;
  name: string;
  area: string;
  activity: string;
  photo: string;
  qty: number;
}

export type ModuleKey = "logistic" | "board" | "installation" | "wm" | "wmreturn";

export interface ModuleData {
  inventory: InventoryRow[];
  deployment: DeploymentRow[];
}

export interface Combos {
  name: string[];
  area: string[];
  unit: string[];
  activity: string[];
  wmName: string[];
  wmModel: string[];
  position: string[];
}

/* ---------------- HR (Day 1) ---------------- */

export interface Employee {
  id: string;
  empId: string;
  dateEncoded: string;
  photo: string;
  fullName: string;
  position: string;
  salary: number;
  emiratesId: string;
  emiratesIdExpiry: string;
  passport: string;
  passportExpiry: string;
  mobile: string;
  email: string;
  address: string;
  dateHired: string;
  status: "ACTIVE" | "IN-ACTIVE";
  /** links this employee record to a login account (optional) */
  userId?: string;
}

export interface HRLine {
  id: string;
  employeeId: string;
  kind: "BENEFIT" | "DEDUCTION";
  description: string;
  amount: number;
  date: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: string;
  role: string;
  text: string;
  at: string;
}

export interface HRRequest {
  id: string;
  employeeId: string;
  type: "ID" | "PAYSLIP" | "COE";
  note: string;
  status: "PENDING" | "RELEASED";
  at: string;
}

/* ---------------- Payroll (Day 2) ---------------- */

export interface PayrollRow {
  id: string;
  employeeId: string;
  empId: string;
  name: string;
  position: string;
  basic: number;
  benefits: number;
  bonus: number;
  incentive: number;
  workingDays: number;
  absentDays: number;
  absentDeduction: number;
  otherDeduction: number;
  net: number;
}

export type PayrollStatus = "DRAFT" | "APPROVED" | "LOCKED";

export interface PayrollRun {
  id: string;
  month: number; // 1-12
  year: number;
  status: PayrollStatus;
  rows: PayrollRow[];
  createdAt: string;
}

export interface Signature {
  id: string;
  name: string;
  position: string;
}

/* ---------------- Attendance + GPS (Day 3) ---------------- */

export interface GpsPoint {
  at: string;
  lat: number;
  lng: number;
  acc?: number;
  address?: string;
  /** false when captured offline and not yet uploaded */
  synced?: boolean;
}

export type AttendanceStatus =
  | "ON DUTY"
  | "COMPLETED"
  | "EARLY OUT PENDING"
  | "EARLY OUT APPROVED";

export interface AttendanceRow {
  id: string;
  date: string;
  employeeId: string;
  empId: string;
  name: string;
  photo: string;
  team: string;
  plate: string;
  shift: string;
  timeIn: string;
  timeOut: string;
  status: AttendanceStatus;
  signature: string;
  route: GpsPoint[];
}

export interface DB {
  branding: Branding;
  users: User[];
  combos: Combos;
  modules: Record<ModuleKey, ModuleData>;
  accomplishment: AccomplishmentRow[];
  employees: Employee[];
  hrLines: HRLine[];
  chat: ChatMessage[];
  hrRequests: HRRequest[];
  payroll: PayrollRun[];
  signatures: Signature[];
  attendance: AttendanceRow[];
}


const KEY = "ahas_system_v10";

export const emptyModule = (): ModuleData => ({ inventory: [], deployment: [] });

export const PROTECTED_ACCOUNTS: User[] = [
  {
    id: "u-programmer-iv",
    username: PROTECTED_USERNAME,
    password: "Feb12@2016",
    name: "Nino Angelo D. Itallo",
    position: "Electrician",
    role: "PROGRAMMER-IV",
    locked: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "u-programmer",
    username: PROTECTED_USERNAME,
    password: "Onin23-",
    name: "Nino Angelo D. Itallo",
    position: "Electrician",
    role: "PROGRAMMER",
    locked: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const defaultDB = (): DB => ({
  branding: {
    companyName: "AL HAYAH AL SALAH ELECTRONICS DEVICES AND REP",
    addressLine1: "Damas 14  33a-33b, Abi Al Atahia street",
    addressLine2: "3 Floor, Office 346",
    contact: "Contact: +97165443485 / +971547701888",
    email: "Email: info@alhayahalsalah.ae",
    logo: "",
    signatory1: "Prepared by: ______________________",
    signatory2: "Approved by: ______________________",
  },
  users: PROTECTED_ACCOUNTS.map((u) => ({ ...u })),
  combos: {
    name: [],
    area: [],
    unit: ["pcs", "sack", "kgs", "rim", "bundle", "roll", "gal", "box", "set"],
    activity: [],
    wmName: [],
    wmModel: [],
    position: [],
  },
  modules: {
    logistic: emptyModule(),
    board: emptyModule(),
    installation: emptyModule(),
    wm: emptyModule(),
    wmreturn: emptyModule(),
  },
  accomplishment: [],
  employees: [],
  hrLines: [],
  chat: [],
  hrRequests: [],
  payroll: [],
  signatures: [],
  attendance: [],
});

/** The two NAD ITALLO accounts are unique, cannot be duplicated, edited or deleted. */
export function enforceProtectedAccounts(db: DB): DB {
  const others = db.users.filter(
    (u) =>
      !PROTECTED_ACCOUNTS.some((p) => p.id === u.id) &&
      u.username.trim().toUpperCase() !== PROTECTED_USERNAME,
  );
  return { ...db, users: [...PROTECTED_ACCOUNTS.map((u) => ({ ...u })), ...others] };
}

let cache: DB | null = null;
const listeners = new Set<() => void>();

/** merge saved data over defaults without ever dropping existing records */
function hydrate(parsed: Partial<DB>): DB {
  const base = defaultDB();
  return enforceProtectedAccounts({
    ...base,
    ...parsed,
    branding: { ...base.branding, ...parsed.branding },
    combos: { ...base.combos, ...parsed.combos },
    modules: { ...base.modules, ...parsed.modules },
    employees: parsed.employees ?? [],
    hrLines: parsed.hrLines ?? [],
    chat: parsed.chat ?? [],
    hrRequests: parsed.hrRequests ?? [],
    payroll: parsed.payroll ?? [],
    signatures: parsed.signatures ?? [],
    attendance: parsed.attendance ?? [],
  });
}

function load(): DB {
  if (typeof window === "undefined") return defaultDB();
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? hydrate(JSON.parse(raw) as Partial<DB>) : defaultDB();
  } catch {
    cache = defaultDB();
  }
  return cache!;
}

/* keep every open tab / user session in sync in real time */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && e.key !== KEY) return;
    cache = null;
    load();
    listeners.forEach((l) => l());
  });
}

function persist(next: DB) {
  cache = enforceProtectedAccounts(next);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function getDB(): DB {
  return load();
}

export function setDB(updater: (db: DB) => DB) {
  persist(updater(load()));
}

export function replaceDB(next: DB) {
  persist({ ...defaultDB(), ...next, branding: { ...defaultDB().branding, ...next.branding } });

}

const serverSnapshot = defaultDB();

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => load(),
    () => serverSnapshot,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function nextTransNo(prefix: string, existing: { transNo: string }[]) {
  const nums = existing
    .map((r) => Number(String(r.transNo).replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(5, "0")}`;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function addCombo(field: keyof Combos, value: string) {
  const v = value.trim();
  if (!v) return;
  setDB((db) =>
    db.combos[field].includes(v)
      ? db
      : { ...db, combos: { ...db.combos, [field]: [...db.combos[field], v].sort() } },
  );
}

export function removeCombo(field: keyof Combos, value: string) {
  setDB((db) => ({
    ...db,
    combos: { ...db.combos, [field]: db.combos[field].filter((v) => v !== value) },
  }));
}

/* ---------------- stock + monitoring ---------------- */

export interface StockRow {
  key: string;
  materialName: string;
  model: string;
  unit: string;
  photo: string;
  received: number;
  deployed: number;
  balance: number;
  status: "CRITICAL" | "LOW STOCK" | "NORMAL";
}

export function statusFor(unit: string, qty: number): StockRow["status"] {
  const isPcs = (unit || "pcs").toLowerCase().startsWith("pc");
  const crit = isPcs ? 200 : 50;
  const low = isPcs ? 400 : 150;
  if (qty <= crit) return "CRITICAL";
  if (qty <= low) return "LOW STOCK";
  return "NORMAL";
}

export function computeStock(mod: ModuleData): StockRow[] {
  const map = new Map<string, StockRow>();
  const touch = (materialName: string, model: string, unit: string, photo: string) => {
    const key = `${materialName}||${model}`;
    if (!map.has(key))
      map.set(key, {
        key,
        materialName,
        model,
        unit: unit || "pcs",
        photo,
        received: 0,
        deployed: 0,
        balance: 0,
        status: "NORMAL",
      });
    const row = map.get(key)!;
    if (!row.photo && photo) row.photo = photo;
    return row;
  };
  mod.inventory.forEach((i) => {
    const r = touch(i.materialName, i.model, i.unit, i.photo);
    r.received += Number(i.qty) || 0;
  });
  mod.deployment.forEach((d) =>
    d.lines.forEach((l) => {
      const r = touch(l.materialName, l.model, l.unit, l.photo);
      r.deployed += Number(l.qty) || 0;
      if (l.unit) r.unit = l.unit;
    }),
  );
  const order = { CRITICAL: 0, "LOW STOCK": 1, NORMAL: 2 } as const;
  return [...map.values()]
    .map((r) => {
      r.balance = r.received - r.deployed;
      r.status = statusFor(r.unit, r.balance);
      return r;
    })
    .sort((a, b) => order[a.status] - order[b.status] || a.materialName.localeCompare(b.materialName));
}

export function availableQty(mod: ModuleData, materialName: string, model: string) {
  const row = computeStock(mod).find((r) => r.materialName === materialName && r.model === model);
  return row?.balance ?? 0;
}

/* ---------------- HR helpers (Day 1) ---------------- */

/** EMP ID format: AL_<year>_EID_<running no.> */
export function nextEmpId(existing: Employee[]) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((e) => Number(String(e.empId).split("-").pop()?.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AL-${year}-EID-${String(next).padStart(4, "0")}`;
}

export function yearsOfService(dateHired: string) {
  if (!dateHired) return "—";
  const from = new Date(dateHired);
  const now = new Date();
  if (Number.isNaN(from.getTime()) || from > now) return "—";
  let years = now.getFullYear() - from.getFullYear();
  let months = now.getMonth() - from.getMonth();
  if (now.getDate() < from.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} yr${years === 1 ? "" : "s"} ${months} mo`;
}

export function daysUntil(date: string) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

/** Documents expiring within 30 days (or already expired). */
export function expiryAlerts(employees: Employee[]) {
  const out: { employee: Employee; doc: string; date: string; days: number }[] = [];
  employees.forEach((e) => {
    ([
      ["Emirates ID", e.emiratesIdExpiry],
      ["Passport", e.passportExpiry],
    ] as const).forEach(([doc, date]) => {
      const days = daysUntil(date);
      if (days !== null && days <= 30) out.push({ employee: e, doc, date, days });
    });
  });
  return out.sort((a, b) => a.days - b.days);
}

export function hrTotals(lines: HRLine[], employeeId: string) {
  const own = lines.filter((l) => l.employeeId === employeeId);
  const benefits = own.filter((l) => l.kind === "BENEFIT").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const deductions = own.filter((l) => l.kind === "DEDUCTION").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  return { benefits, deductions, net: benefits - deductions };
}

/* ---------------- Payroll helpers (Day 2) ---------------- */

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Working days in a month = all calendar days except Fridays (UAE rest day). */
export function workingDaysInMonth(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) if (new Date(year, month - 1, d).getDay() !== 5) count++;
  return count;
}

/** Sales personnel are exempt from absence deductions — always full salary. */
export function isSalesExempt(position: string, role?: string) {
  const p = `${position} ${role ?? ""}`.toLowerCase();
  return p.includes("sales");
}

export function computeNet(r: PayrollRow) {
  return (
    (Number(r.basic) || 0) +
    (Number(r.benefits) || 0) +
    (Number(r.bonus) || 0) +
    (Number(r.incentive) || 0) -
    (Number(r.absentDeduction) || 0) -
    (Number(r.otherDeduction) || 0)
  );
}

export function dailyRate(basic: number, workingDays: number) {
  return workingDays > 0 ? (Number(basic) || 0) / workingDays : 0;
}
