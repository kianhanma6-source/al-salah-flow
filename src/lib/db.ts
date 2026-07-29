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
}

export interface DB {
  branding: Branding;
  users: User[];
  combos: Combos;
  modules: Record<ModuleKey, ModuleData>;
  accomplishment: AccomplishmentRow[];
}

const KEY = "ahas_system_v10";

export const emptyModule = (): ModuleData => ({ inventory: [], deployment: [] });

export const defaultDB = (): DB => ({
  branding: {
    companyName: "AL HAYAH AL SALAH ELECTRONICS DEVICES AND REP",
    addressLine1: "Damas 14  33a-33b, Abi Al Atahia street",
    addressLine2: "3 Floor, Office 346",
    contact: "Contact: +97165443485 / +971547701888",
    logo: "",
    signatory1: "Prepared by: ______________________",
    signatory2: "Approved by: ______________________",
  },
  users: [
    {
      id: "u-programmer-iv",
      username: "NAD ITALLO",
      password: "Onin23",
      name: "Nino Angelo D. Itallo",
      position: "System Administrator",
      role: "PROGRAMMER-IV",
      locked: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "u-programmer",
      username: "Blazark",
      password: "admin123",
      name: "Nino Angelo D. Itallo",
      position: "System Administrator",
      role: "PROGRAMMER",
      locked: true,
      createdAt: new Date().toISOString(),
    },
  ],
  combos: {
    name: [],
    area: [],
    unit: ["pcs", "sack", "kgs", "rim", "bundle", "roll", "gal", "box", "set"],
    activity: [],
    wmName: [],
    wmModel: [],
  },
  modules: {
    logistic: emptyModule(),
    board: emptyModule(),
    installation: emptyModule(),
    wm: emptyModule(),
    wmreturn: emptyModule(),
  },
  accomplishment: [],
});

let cache: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (typeof window === "undefined") return defaultDB();
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      cache = { ...defaultDB(), ...parsed, modules: { ...defaultDB().modules, ...parsed.modules } };
    } else {
      cache = defaultDB();
    }
  } catch {
    cache = defaultDB();
  }
  return cache!;
}

function persist(next: DB) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function getDB(): DB {
  return load();
}

export function setDB(updater: (db: DB) => DB) {
  persist(updater(load()));
}

export function replaceDB(next: DB) {
  persist({ ...defaultDB(), ...next });
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
