import { getDB, type DB } from "./db";

const KEY = "ahas_cloud_backups_v10";

export interface CloudBackup {
  date: string;
  at: string;
  data: DB;
}

export function listBackups(): CloudBackup[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CloudBackup[];
  } catch {
    return [];
  }
}

/** Snapshot every change; keep only the 2 most recent backups by date. */
export function saveBackup(db: DB = getDB()) {
  if (typeof window === "undefined") return;
  const date = new Date().toISOString().slice(0, 10);
  const rest = listBackups().filter((b) => b.date !== date);
  const next = [{ date, at: new Date().toISOString(), data: db }, ...rest]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 2);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — keep only the newest */
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, 1)));
    } catch {
      /* ignore */
    }
  }
}

let armed = false;
/** Debounced auto-backup on every database change. */
export function armAutoBackup() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  let t: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => saveBackup(), 1500);
  };
  window.addEventListener("storage", schedule);
  const orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k: string, v: string) => {
    orig(k, v);
    if (k === "ahas_system_v10") schedule();
  };
  schedule();
}
