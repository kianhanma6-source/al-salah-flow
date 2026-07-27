import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LogIn, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth, isProgrammerIV } from "@/lib/auth";
import { PROGRAMMER_TAG, getDB, setDB, useDB } from "@/lib/db";
import { toLogoBase64 } from "@/lib/imaging";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AL HAYAH AL SALAH System Management — Secure Login" },
      {
        name: "description",
        content:
          "Secure login for the AL HAYAH AL SALAH Electronics Devices and Rep system management platform.",
      },
      { property: "og:title", content: "AL HAYAH AL SALAH System Management" },
      { property: "og:description", content: "Inventory, deployment and monitoring control system." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, ready, remembered } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (remembered) {
      setUsername(remembered.username);
      setPassword(remembered.password);
      setRemember(true);
    }
  }, [remembered]);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard", replace: true });
  }, [ready, user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = login(username, password, remember);
    if (err) return toast.error(err);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const canEditLogo = isProgrammerIV(getDB().users.find((u) => u.username === username)?.role);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="aurora" />
      <div className="pointer-events-none absolute inset-0 grid-floor" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25 ring-orbit" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/25 ring-orbit" />

      <div className="w-full max-w-md tilt-card">
        <form
          onSubmit={submit}
          className="glass rounded-2xl p-7 shadow-[var(--shadow-3d)] backdrop-blur-2xl"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-primary/25 blur-2xl pulse-glow" />
              <img
                src={db.branding.logo || defaultLogo}
                alt="AL HAYAH AL SALAH logo"
                width={96}
                height={96}
                className="relative size-24 object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.7)]"
              />
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost-3d mt-1 text-[10px]"
              title={canEditLogo ? "Change logo" : "PROGRAMMER-IV credentials required"}
            >
              <Upload className="size-3" /> Change logo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!canEditLogo)
                  return toast.error("Enter PROGRAMMER-IV username first to change the logo.");
                const logo = await toLogoBase64(f);
                setDB((d) => ({ ...d, branding: { ...d.branding, logo } }));
                toast.success("Logo updated.");
              }}
            />
            <h1 className="display mt-1 text-lg font-bold tracking-widest brand-text">
              AL HAYAH AL SALAH
            </h1>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              System Management
            </p>
          </div>

          <div className="mt-7 space-y-4">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </span>
              <input
                className="field-3d"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </span>
              <div className="relative">
                <input
                  className="field-3d pr-11"
                  type={show ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Remember me
            </label>

            <button type="submit" className="btn-3d w-full py-2.5">
              <LogIn className="size-4" /> Sign in
            </button>
          </div>
        </form>

        <p className="mt-4 text-right text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {PROGRAMMER_TAG}
        </p>
      </div>
    </div>
  );
}
