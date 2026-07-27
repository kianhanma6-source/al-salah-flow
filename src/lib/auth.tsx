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
  | "branding";

const PROG: Role[] = ["PROGRAMMER-IV", "PROGRAMMER"];

const ACCESS: Record<TabKey, Role[]> = {
  dashboard: [...PROG, "ADMIN", "USER", "VISITOR", "Technician", "Collection team", "Sales", "WM Deployment", "Logistic"],
  users: [...PROG, "ADMIN"],
  logistic: [...PROG, "Logistic", "VISITOR"],
  board: [...PROG, "Logistic", "VISITOR"],
  installation: [...PROG, "Logistic", "WM Deployment", "VISITOR"],
  wm: [...PROG, "WM Deployment", "VISITOR"],
  wmreturn: [...PROG, "Logistic", "VISITOR"],
  accomplishment: [...PROG, "Logistic", "VISITOR"],
  backup: ["PROGRAMMER-IV", "Logistic"],
  branding: ["PROGRAMMER-IV"],
};

export const canAccess = (role: Role | undefined, tab: TabKey) =>
  !!role && ACCESS[tab].includes(role);

/** VISITOR is view-only everywhere. */
export const canWrite = (role: Role | undefined) => !!role && role !== "VISITOR";

export const canDeleteUser = (role: Role | undefined) => !!role && PROG.includes(role);
export const isProgrammerIV = (role: Role | undefined) => role === "PROGRAMMER-IV";
