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
  { key: "users", label: "User Management" },
  { key: "backup", label: "Backup & Data" },
  { key: "cleaning", label: "Data Cleaning" },
  { key: "branding", label: "Re-Branding" },
];

const EVERY: TabKey[] = ALL_TABS.map((t) => t.key);
const without = (...omit: TabKey[]) => EVERY.filter((t) => !omit.includes(t));

/** Default dashboards per role (NAD ITALLO can override per user). */
const ACCESS: Record<string, TabKey[]> = {
  "PROGRAMMER-IV": EVERY,
  PROGRAMMER: without("branding"),
  "Logistic Admin": without("branding", "cleaning"),
  "Logistic User": without("branding", "cleaning", "users"),
  "Warehouse Admin": without("branding", "cleaning", "logistic", "board", "wmreturn", "accomplishment"),
  "Warehouse User": without("branding", "cleaning", "logistic", "board", "wmreturn", "accomplishment", "users"),
  Manager: ["dashboard"],
  "HR Admin": ["dashboard"],
  "Sales Person": ["dashboard"],
  Technician: ["dashboard"],
  "Collection Team": ["dashboard"],
  Client: ["dashboard"],
  Viewer: ["dashboard"],
  /* legacy */
  ADMIN: without("branding", "cleaning"),
  USER: without("branding", "cleaning", "users"),
  VISITOR: ["dashboard"],
  "Collection team": ["dashboard"],
  Sales: ["dashboard"],
  "WM Deployment": ["dashboard"],
  Logistic: without("branding", "cleaning"),
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

