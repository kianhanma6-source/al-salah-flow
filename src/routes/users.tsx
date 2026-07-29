import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, FileSpreadsheet, Pencil, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, Select } from "@/components/ui-kit";
import { ALL_TABS, allowedTabs, canDeleteUser, canWrite, isProgrammer, useAuth } from "@/lib/auth";
import { PROTECTED_USERNAME, ROLES, setDB, uid, useDB, type Role, type User } from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management | AL HAYAH AL SALAH" },
      { name: "description", content: "Manage system users, roles and dashboard permissions for the AL HAYAH AL SALAH platform." },
      { property: "og:title", content: "User Management" },
      { property: "og:description", content: "Role-based user administration for the system management platform." },
    ],
  }),
  component: () => (
    <AppShell tab="users">
      <UsersPage />
    </AppShell>
  ),
});

const blank = (): User => ({
  id: "",
  username: "",
  password: "",
  name: "",
  position: "",
  role: "Logistic User",
  createdAt: new Date().toISOString(),
});

const isProtected = (u: User) =>
  !!u.locked || u.username.trim().toUpperCase() === PROTECTED_USERNAME;

function UsersPage() {
  const db = useDB();
  const { user: session } = useAuth();
  const me = db.users.find((u) => u.id === session?.id) ?? session ?? null;
  const writable = canWrite(me?.role);
  const canDelete = canDeleteUser(me?.role);
  const programmer = isProgrammer(me?.role);
  /** Only the NAD ITALLO accounts may see the dashboard assignment panel. */
  const isNadItallo = (me?.username ?? "").trim().toUpperCase() === PROTECTED_USERNAME;
  const [form, setForm] = useState<User>(blank());
  const [q, setQ] = useState("");

  // Protected accounts stay hidden from everyone except NAD ITALLO.
  const visible = db.users
    .filter((u) => isNadItallo || !isProtected(u))
    .filter((u) =>
      [u.username, u.name, u.position, u.role].join(" ").toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.username.localeCompare(a.username));

  const assignable = db.users.filter((u) => !isProtected(u));

  const save = () => {
    if (!form.username.trim()) return toast.error("Username is required.");
    if (form.username.trim().toUpperCase() === PROTECTED_USERNAME)
      return toast.error("Username NAD ITALLO is reserved and cannot be added or duplicated.");
    if (!form.id && !form.password.trim()) return toast.error("Password is required.");
    const dupe = db.users.some(
      (u) => u.id !== form.id && u.username.trim().toLowerCase() === form.username.trim().toLowerCase(),
    );
    if (dupe) return toast.error("That username already exists.");
    setDB((d) => {
      const list = [...d.users];
      if (form.id) {
        const i = list.findIndex((u) => u.id === form.id);
        if (i < 0 || isProtected(list[i])) return d;
        list[i] = { ...list[i], ...form, password: form.password.trim() ? form.password : list[i].password };
      } else list.push({ ...form, id: uid() });
      return { ...d, users: list };
    });
    toast.success(form.id ? "User updated." : "User added.");
    setForm(blank());
  };

  const remove = (u: User) => {
    if (isProtected(u)) return toast.error("This account is protected and cannot be deleted.");
    if (!canDelete) return toast.error("Only NAD ITALLO (PROGRAMMER-IV) can delete user accounts.");
    if (!confirm(`Delete user ${u.username}?`)) return;
    setDB((d) => ({ ...d, users: d.users.filter((x) => x.id !== u.id) }));
    toast.success("User deleted.");
  };

  return (
    <div className="space-y-5">
      <Panel title="Search All Users">
        <Field label="Search (username, name, position, role)">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
        </Field>
      </Panel>

      {writable && (
        <Panel
          title="User Data Entry"
          actions={
            <>
              <button className="btn-3d" onClick={save}>
                <Save className="size-4" /> {form.id ? "Update" : "Add"}
              </button>
              <button className="btn-ghost-3d" onClick={() => setForm(blank())}>
                <X className="size-4" /> Clear
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Username">
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label="Password">
              <Input
                type={programmer ? "text" : "password"}
                value={form.password}
                placeholder={form.id ? "Hidden — leave blank to keep" : "Set a password"}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Position">
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.filter((r) => r !== "PROGRAMMER-IV" && r !== "PROGRAMMER").map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Panel>
      )}

      {isNadItallo && <AssignmentPanel users={assignable} />}

      <Panel
        title="User Displaylist"
        actions={
          <>
            <button
              className="btn-ghost-3d"
              onClick={() => exportExcel("Users", visible.map(({ password: _p, ...u }) => u), "users")}
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              className="btn-ghost-3d"
              onClick={() =>
                exportPDF(
                  "User Management Report",
                  ["Username", "Name", "Position", "Role"],
                  visible.map((u) => [u.username, u.name, u.position, u.role]),
                )
              }
            >
              <FileDown className="size-4" /> PDF
            </button>
          </>
        }
      >
        <DataTable
          columns={["Username", "Name", "Position", "Role", "Dashboards", "Actions"]}
          rows={visible.map((u) => [
            u.username,
            u.name,
            u.position,
            u.role,
            <span className="text-[10px] text-muted-foreground">{allowedTabs(u).length} allowed</span>,
            <div className="flex gap-1">
              {writable && !isProtected(u) && (
                <button className="btn-ghost-3d px-2" onClick={() => setForm({ ...u, password: "" })}>
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canDelete && !isProtected(u) && (
                <button className="btn-ghost-3d px-2" onClick={() => remove(u)}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
              {isProtected(u) && <span className="text-[10px] text-muted-foreground">protected</span>}
            </div>,
          ])}
        />
      </Panel>
    </div>
  );
}

/* ---------------- NAD ITALLO dashboard assignment panel ---------------- */

const ASSIGNABLE_TABS = ALL_TABS.filter((t) => t.key !== "branding" && t.key !== "cleaning");

function AssignmentPanel({ users }: { users: User[] }) {
  const [draft, setDraft] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(users.map((u) => [u.id, [...allowedTabs(u)]])),
  );

  const get = (u: User) => draft[u.id] ?? [...allowedTabs(u)];

  const toggle = (u: User, key: string) =>
    setDraft((d) => {
      const cur = d[u.id] ?? [...allowedTabs(u)];
      return { ...d, [u.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });

  const saveAll = () => {
    setDB((db) => ({
      ...db,
      users: db.users.map((u) => (draft[u.id] ? { ...u, perms: draft[u.id] } : u)),
    }));
    toast.success("Dashboard permissions saved — applied immediately.");
  };

  return (
    <Panel
      title="Dashboard Assignment Panel (NAD ITALLO only)"
      actions={
        <button className="btn-3d" onClick={saveAll}>
          <ShieldCheck className="size-4" /> Save Permissions
        </button>
      }
    >
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No user accounts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-black/30">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wider text-muted-foreground">
                  User
                </th>
                {ASSIGNABLE_TABS.map((t) => (
                  <th key={t.key} className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="font-semibold">{u.username}</span>
                    <span className="block text-[10px] text-muted-foreground">{u.role}</span>
                  </td>
                  {ASSIGNABLE_TABS.map((t) => (
                    <td key={t.key} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        checked={get(u).includes(t.key)}
                        onChange={() => toggle(u, t.key)}
                        aria-label={`${u.username} — ${t.label}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
