import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Field, Input, Panel } from "@/components/ui-kit";
import { PROGRAMMER_TAG, getDB, setDB, uid, useDB } from "@/lib/db";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Employee Registration | AL HAYAH AL SALAH" },
      {
        name: "description",
        content:
          "Private employee registration link — request a system account using your Employee ID and full name.",
      },
      { property: "og:title", content: "Employee Registration" },
      { property: "og:description", content: "Private registration request for AL HAYAH AL SALAH staff." },
    ],
  }),
  component: RegisterPage,
});

const blank = () => ({ username: "", password: "", empId: "", fullName: "", position: "" });

function RegisterPage() {
  const db = useDB();
  const [form, setForm] = useState(blank());
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const live = getDB();
    const emp = live.employees.find(
      (x) =>
        x.empId.trim().toLowerCase() === form.empId.trim().toLowerCase() &&
        x.fullName.trim().toLowerCase() === form.fullName.trim().toLowerCase(),
    );
    if (!emp)
      return toast.error(
        "PLEASE CORRECT YOUR EMPLOYEE ID & FULL NAME — THEY MUST MATCH THE COMPANY RECORDS.",
      );
    if (!form.username.trim() || !form.password.trim())
      return toast.error("Username and password are required.");
    if (live.users.some((u) => u.username.trim().toLowerCase() === form.username.trim().toLowerCase()))
      return toast.error("That username already exists.");
    if (
      live.registrations.some(
        (r) => r.status === "PENDING" && r.empId.trim().toLowerCase() === form.empId.trim().toLowerCase(),
      )
    )
      return toast.error("A pending request already exists for this Employee ID.");

    setDB((d) => ({
      ...d,
      registrations: [
        ...d.registrations,
        {
          id: uid(),
          username: form.username.trim(),
          password: form.password,
          empId: form.empId.trim(),
          fullName: form.fullName.trim(),
          position: form.position.trim() || emp.position,
          date: today,
          status: "PENDING",
        },
      ],
    }));
    setForm(blank());
    setDone(true);
    toast.success("Registration submitted — waiting for HR approval.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="aurora" />
      <div className="pointer-events-none absolute inset-0 grid-floor" />
      <div className="w-full max-w-lg">
        <form onSubmit={submit} className="glass rounded-2xl p-7 shadow-[var(--shadow-3d)]">
          <div className="flex flex-col items-center gap-2 text-center">
            <img
              src={db.branding.logo || defaultLogo}
              alt="AL HAYAH AL SALAH logo"
              width={96}
              height={96}
              className="size-24 rounded-full border border-primary/40 bg-white/5 object-contain p-1 shadow-[var(--shadow-3d)]"
            />
            <h1 className="display mt-1 text-base font-bold tracking-widest brand-text">
              EMPLOYEE REGISTRATION
            </h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Private link — HR approval required
            </p>
          </div>

          {done ? (
            <div className="mt-6 space-y-4 text-center">
              <p className="text-sm text-primary">
                Your registration is <strong>PENDING APPROVAL</strong>. You will be able to sign in once HR
                Admin or NAD ITALLO activates your account.
              </p>
              <Link to="/" className="btn-3d inline-flex">
                Back to login
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Field label="Username">
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              <Field label="Employee ID">
                <Input value={form.empId} onChange={(e) => setForm({ ...form, empId: e.target.value })} />
              </Field>
              <Field label="Full Name">
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Field>
              <Field label="Position">
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </Field>
              <Field label="Date">
                <Input value={today} readOnly />
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-3d w-full py-2.5">
                  <UserPlus className="size-4" /> Submit registration
                </button>
              </div>
            </div>
          )}
        </form>
        <p className="mt-4 text-right text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {PROGRAMMER_TAG}
        </p>
      </div>
    </div>
  );
}
