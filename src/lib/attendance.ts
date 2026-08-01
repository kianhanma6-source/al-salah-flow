import { getDB, setDB, uid, today, type AttendanceRow, type Employee, type GpsPoint } from "./db";

export const SHIFT_HOURS = 8;
const QUEUE_KEY = "ahas_gps_queue_v10";
const ACTIVE_KEY = "ahas_gps_active_v10";

/* ---------------- helpers ---------------- */

export const nowISO = () => new Date().toISOString();

/** UAE date (GST, UTC+4) — rolls over at 12:00 AM UAE time. */
export function uaeDate(d: Date = new Date()) {
  return new Date(d.getTime() + 4 * 3600000).toISOString().slice(0, 10);
}

export function fmtTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
}

export function hoursWorked(row: AttendanceRow) {
  if (!row.timeIn) return 0;
  const end = row.timeOut ? new Date(row.timeOut).getTime() : Date.now();
  return (end - new Date(row.timeIn).getTime()) / 3600000;
}

export function canTimeOut(row: AttendanceRow) {
  return hoursWorked(row) >= SHIFT_HOURS || row.status === "EARLY OUT APPROVED";
}

export const openRowFor = (employeeId: string) =>
  getDB().attendance.find((a) => a.employeeId === employeeId && !a.timeOut);

/** Barcode on the ID card = Emirates ID number. */
export function matchBarcode(code: string): Employee | undefined {
  const c = code.replace(/[\s-]/g, "").trim().toLowerCase();
  if (!c) return undefined;
  return getDB().employees.find(
    (e) =>
      e.emiratesId.replace(/[\s-]/g, "").toLowerCase() === c ||
      e.empId.replace(/[\s-]/g, "").toLowerCase() === c,
  );
}

/* ---------------- offline queue ---------------- */

interface QueuedPoint extends GpsPoint {
  attendanceId: string;
}

function readQueue(): QueuedPoint[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueuedPoint[];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedPoint[]) {
  if (typeof window !== "undefined") localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/** Store a point immediately on device, then mark synced once online. */
export function recordPoint(attendanceId: string, p: GpsPoint) {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const point: GpsPoint = { ...p, synced: online };
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) =>
      a.id === attendanceId ? { ...a, route: [...a.route, point] } : a,
    ),
  }));
  if (!online) writeQueue([...readQueue(), { ...point, attendanceId }]);
  else void resolveAddress(attendanceId, point);
}

/** Uploads every offline point and resolves their addresses. */
export async function flushQueue() {
  const q = readQueue();
  if (!q.length) return 0;
  writeQueue([]);
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) => ({
      ...a,
      route: a.route.map((p) => ({ ...p, synced: true })),
    })),
  }));
  for (const p of q) await resolveAddress(p.attendanceId, p);
  return q.length;
}

/* ---------------- reverse geocoding ---------------- */

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
    );
    if (!r.ok) return "";
    const j = (await r.json()) as { display_name?: string };
    return j.display_name ?? "";
  } catch {
    return "";
  }
}

async function resolveAddress(attendanceId: string, point: GpsPoint) {
  if (point.address) return;
  const address = await reverseGeocode(point.lat, point.lng);
  if (!address) return;
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) =>
      a.id === attendanceId
        ? {
            ...a,
            route: a.route.map((p) =>
              p.at === point.at ? { ...p, address, synced: true } : p,
            ),
          }
        : a,
    ),
  }));
}

/* ---------------- background tracking ---------------- */

let watchId: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export const activeTrackingId = () =>
  typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_KEY);

/** Starts continuous tracking; keeps running while the device keeps the page alive
 *  and stores every fix on-device first so nothing is lost when offline. */
export function startTracking(attendanceId: string) {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  localStorage.setItem(ACTIVE_KEY, attendanceId);
  stopWatchers();

  const capture = (pos: GeolocationPosition) =>
    recordPoint(attendanceId, {
      at: nowISO(),
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      acc: pos.coords.accuracy,
    });

  watchId = navigator.geolocation.watchPosition(capture, () => {}, {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 30000,
  });

  // periodic fix every 3 minutes so the travel path keeps building
  timer = setInterval(
    () => navigator.geolocation.getCurrentPosition(capture, () => {}, { enableHighAccuracy: true }),
    180000,
  );

  window.addEventListener("online", onOnline);
}

const onOnline = () => void flushQueue();

function stopWatchers() {
  if (watchId !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (timer) clearInterval(timer);
  timer = null;
}

export function stopTracking() {
  stopWatchers();
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/** Resume tracking after a reload/app restart while still timed in. */
export function resumeTracking() {
  const id = activeTrackingId();
  if (!id) return;
  const row = getDB().attendance.find((a) => a.id === id);
  if (!row || row.timeOut) return stopTracking();
  startTracking(id);
  void flushQueue();
}

/* ---------------- time in / out ---------------- */

export function timeIn(emp: Employee, extra: { team: string; plate: string; shift: string }) {
  if (openRowFor(emp.id)) return "You have already timed in.";
  const row: AttendanceRow = {
    id: uid(),
    date: uaeDate(),
    employeeId: emp.id,
    empId: emp.empId,
    name: emp.fullName,
    photo: emp.photo,
    team: extra.team,
    plate: extra.plate,
    shift: extra.shift,
    timeIn: nowISO(),
    timeOut: "",
    status: "ON DUTY",
    signature: emp.fullName,
    route: [],
  };
  setDB((db) => ({ ...db, attendance: [row, ...db.attendance] }));
  startTracking(row.id);
  return null;
}

export function timeOut(row: AttendanceRow) {
  if (!canTimeOut(row))
    return "YOU HAVE ALREADY TIMED IN. YOUR WORKING HOURS ARE NOT YET COMPLETED.";
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) =>
      a.id === row.id ? { ...a, timeOut: nowISO(), status: "COMPLETED" } : a,
    ),
  }));
  if (activeTrackingId() === row.id) stopTracking();
  void flushQueue();
  return null;
}

export function requestEarlyOut(row: AttendanceRow) {
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) =>
      a.id === row.id ? { ...a, status: "EARLY OUT PENDING" } : a,
    ),
  }));
}

export function approveEarlyOut(id: string) {
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) =>
      a.id === id ? { ...a, status: "EARLY OUT APPROVED" } : a,
    ),
  }));
}

export function updateAttendance(id: string, patch: Partial<AttendanceRow>) {
  setDB((db) => ({
    ...db,
    attendance: db.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  }));
}

export function deleteAttendance(id: string) {
  setDB((db) => ({ ...db, attendance: db.attendance.filter((a) => a.id !== id) }));
}

export const todayDate = today;
