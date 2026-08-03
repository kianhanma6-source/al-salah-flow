import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDB, type Role, type User } from "./db";

const SESSION_KEY = "ahas_session_v10";
const REMEMBER_KEY = "ahas_remember_v10";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string, remember: boolean) => string | null;
  logout: () => void;
  remembered: { username: string; password: string } | null;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  login: () => "not ready",
  logout: () => {},
  remembered: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [remembered, setRemembered] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        const id = JSON.parse(raw) as string;
        const found = getDB().users.find((u) => u.id === id);
        if (found) setUser(found);
      }
      const rem = localStorage.getItem(REMEMBER_KEY);
      if (rem) setRemembered(JSON.parse(rem));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      remembered,
      login: (username, password, remember) => {
        const found = getDB().users.find(
          (u) =>
            u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
            u.password === password,
        );
        if (!found) return "Invalid username or password.";
        setUser(found);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(found.id));
        if (remember) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(found.id));
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(REMEMBER_KEY);
        }
        return null;
      },
      logout: () => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      },
    }),
    [user, ready, remembered],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/* ----------------- permissions ----------------- */

export type TabKey =
  | "dashboard"
  | "users"
  | "logistic"
  | "board"
  | "installation"
  | "wm"
  | "wmreturn"
  | "accomplishment"
  | "hr"
  | "hrbenefits"
  | "myhr"
  | "payroll"
  | "coe"
  | "idcard"
  | "attendance"
  | "gps"
  | "chat"
  | "reports"
  | "backup"
  | "cleaning"
  | "branding";

export const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "logistic", label: "Logistic" },
  { key: "board", label: "Board Parts" },
  { key: "installation", label: "Installation" },
  { key: "wm", label: "WM Deployment" },
  { key: "wmreturn", label: "WM Returned / Scrap" },
  { key: "accomplishment", label: "Accomplishment" },
  { key: "hr", label: "Employee Information" },
  { key: "hrbenefits", label: "Benefits & Deductions" },
  { key: "payroll", label: "Payroll" },
  { key: "coe", label: "Certificate of Employment" },
  { key: "idcard", label: "Employee ID Card" },
  { key: "attendance", label: "Daily Attendance" },
  { key: "gps", label: "GPS Monitoring" },
  { key: "myhr", label: "My HR Dashboard" },
  { key: "chat", label: "Group Chat" },
  { key: "reports", label: "Reports" },
  { key: "users", label: "User Management" },
  { key: "backup", label: "Backup & Data" },
  { key: "cleaning", label: "Data Cleaning" },
  { key: "branding", label: "Re-Branding" },
];


const EVERY: TabKey[] = ALL_TABS.map((t) => t.key);
const without = (...omit: TabKey[]) => EVERY.filter((t) => !omit.includes(t));

/** HR modules are restricted to HR Admin + programmers. */
const NO_HR: TabKey[] = ["hr", "hrbenefits", "payroll", "coe", "idcard", "gps"];
/** Personal HR dashboard + group chat: everyone except clients. */
const PERSONAL: TabKey[] = ["dashboard", "myhr", "chat", "attendance"];

/** Default dashboards per role (NAD ITALLO can override per user). */
const ACCESS: Record<string, TabKey[]> = {
  "PROGRAMMER-IV": EVERY,
  PROGRAMMER: without("branding"),
  "Logistic Admin": without("branding", "cleaning", ...NO_HR),
  "Logistic User": without("branding", "cleaning", "users", ...NO_HR),
  "Warehouse Admin": without("branding", "cleaning", "logistic", "board", "wmreturn", "accomplishment", ...NO_HR),
  "Warehouse User": without("branding", "cleaning", "logistic", "board", "wmreturn", "accomplishment", "users", ...NO_HR),
  Manager: [...PERSONAL, "gps"],
  "HR Admin": ["dashboard", "hr", "hrbenefits", "payroll", "coe", "idcard", "myhr", "chat", "attendance", "gps"],
  "Sales Person": PERSONAL,
  Technician: PERSONAL,
  "Collection Team": PERSONAL,
  Client: ["dashboard"],
  Viewer: ["reports", "chat"],
  /* legacy */
  ADMIN: without("branding", "cleaning", ...NO_HR),
  USER: without("branding", "cleaning", "users", ...NO_HR),
  VISITOR: ["dashboard"],
  "Collection team": PERSONAL,
  Sales: PERSONAL,
  "WM Deployment": PERSONAL,
  Logistic: without("branding", "cleaning", ...NO_HR),
};

const PROG: Role[] = ["PROGRAMMER-IV", "PROGRAMMER"];

export const allowedTabs = (u: Pick<User, "role" | "perms"> | null | undefined): TabKey[] => {
  if (!u) return [];
  if (PROG.includes(u.role)) return ACCESS[u.role] ?? EVERY;
  if (u.perms && u.perms.length)
    return EVERY.filter((t) => u.perms!.includes(t) && t !== "branding" && t !== "cleaning");
  return ACCESS[u.role] ?? ["dashboard"];
};

export const canAccess = (u: Pick<User, "role" | "perms"> | null | undefined, tab: TabKey) =>
  allowedTabs(u).includes(tab);

/** View-only roles. */
const READ_ONLY: string[] = ["Viewer", "Client", "VISITOR"];
export const canWrite = (role: Role | undefined) => !!role && !READ_ONLY.includes(role);

/** Only the PROGRAMMER-IV NAD ITALLO account may delete user accounts. */
export const canDeleteUser = (role: Role | undefined) => role === "PROGRAMMER-IV";
export const isProgrammerIV = (role: Role | undefined) => role === "PROGRAMMER-IV";
export const isProgrammer = (role: Role | undefined) => !!role && PROG.includes(role);

