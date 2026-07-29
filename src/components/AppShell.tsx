import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { canAccess, useAuth, type TabKey } from "@/lib/auth";
import { PROGRAMMER_TAG, useDB, type User } from "@/lib/db";
import defaultLogo from "@/assets/logo.png";

const TABS: { key: TabKey; to: string; label: string }[] = [
  { key: "dashboard", to: "/dashboard", label: "Dashboard" },
  { key: "logistic", to: "/logistic", label: "Logistic" },
  { key: "board", to: "/board", label: "Board Parts" },
  { key: "installation", to: "/installation", label: "Installation" },
  { key: "wm", to: "/wm-deployment", label: "WM Deployment" },
  { key: "wmreturn", to: "/wm-returned", label: "WM Returned / Scrap" },
  { key: "accomplishment", to: "/accomplishment", label: "Accomplishment" },
  { key: "users", to: "/users", label: "User Management" },
  { key: "backup", to: "/backup", label: "Backup & Data" },
  { key: "cleaning", to: "/data-cleaning", label: "Data Cleaning" },
  { key: "branding", to: "/branding", label: "Re-Branding" },
];

export function ReportHeader() {
  const { branding } = useDB();
  return (
    <div className="panel-3d flex flex-col items-center gap-3 px-4 py-5 text-center">
      <div className="relative">
        <div className="absolute -inset-2 rounded-full bg-primary/25 blur-xl" />
        <img
          src={branding.logo || defaultLogo}
          alt="Company logo"
          width={88}
          height={88}
          className="relative size-22 rounded-full border-2 border-primary/60 bg-white/90 object-contain p-1.5 shadow-[0_10px_22px_rgba(0,0,0,0.6),inset_0_2px_6px_rgba(255,255,255,0.75)]"
        />
      </div>
      <div>
        <h1 className="display text-base font-bold tracking-wide sm:text-xl">
          {branding.companyName}
        </h1>
        <p className="text-xs text-muted-foreground">{branding.addressLine1}</p>
        <p className="text-xs text-muted-foreground">{branding.addressLine2}</p>
        <p className="text-xs text-muted-foreground">{branding.contact}</p>
        {branding.email && <p className="text-xs text-muted-foreground">{branding.email}</p>}
      </div>
    </div>
  );
}


export function AppShell({ tab, children }: { tab: TabKey; children: ReactNode }) {
  const { user: session, ready, logout } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !session) navigate({ to: "/", replace: true });
  }, [ready, session, navigate]);

  if (!ready || !session) return null;
  // always read the live record so permission changes apply immediately
  const user = db.users.find((u) => u.id === session.id) ?? session;

  if (!canAccess(user, tab)) {
    return (
      <Frame user={user} tab={tab} open={open} setOpen={setOpen} pathname={pathname} logout={logout}>
        <div className="panel-3d p-10 text-center">
          <h2 className="display text-lg font-bold text-destructive">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your role ({user.role}) is not authorized for this page.
          </p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame user={user} tab={tab} open={open} setOpen={setOpen} pathname={pathname} logout={logout}>
      {children}
    </Frame>
  );
}

function Frame({
  user,
  open,
  setOpen,
  pathname,
  logout,
  children,
}: {
  user: User;
  tab: TabKey;
  open: boolean;
  setOpen: (v: boolean) => void;
  pathname: string;
  logout: () => void;
  children: ReactNode;
}) {
  const visible = TABS.filter((t) => canAccess(user, t.key));

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-floor" />

      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button className="btn-ghost-3d lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <span className="display text-xs font-bold uppercase tracking-[0.2em] brand-text sm:text-sm">
            AL HAYAH AL SALAH · System Management
          </span>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary">{user.role}</p>
            </div>
            <button className="btn-ghost-3d" onClick={logout}>
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <nav
          className={`${open ? "block" : "hidden"} border-t border-border lg:block`}
          onClick={() => setOpen(false)}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-3 py-2">
            {visible.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                  pathname === t.to
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <ReportHeader />
        {children}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 pt-2 text-right">
        <span className="display text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {PROGRAMMER_TAG}
        </span>
      </footer>
    </div>
  );
}
