import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, FileSpreadsheet, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, Select } from "@/components/ui-kit";
import { canDeleteUser, canWrite, useAuth } from "@/lib/auth";
import { ROLES, setDB, uid, useDB, type Role, type User } from "@/lib/db";
import { exportExcel, exportPDF } from "@/lib/reports";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management | AL HAYAH AL SALAH" },
      { name: "description", content: "Manage system users, roles and access rights for the AL HAYAH AL SALAH platform." },
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
  role: "USER",
  createdAt: new Date().toISOString(),
});

function UsersPage() {
  const db = useDB();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const canDelete = canDeleteUser(user?.role);
  const isProgrammer = user?.role === "PROGRAMMER-IV" || user?.role === "PROGRAMMER";
  const [form, setForm] = useState<User>(blank());
  const [q, setQ] = useState("");

  // Protected accounts stay hidden from non-programmer roles.
  const visible = db.users
    .filter((u) => isProgrammer || !u.locked)
    .filter((u) =>
      [u.username, u.name, u.position, u.role].join(" ").toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.username.localeCompare(a.username));

  const save = () => {
    if (!form.username.trim() || !form.password.trim()) return toast.error("Username and password are required.");
    setDB((d) => {
      const list = [...d.users];
      if (form.id) {
        const i = list.findIndex((u) => u.id === form.id);
        if (list[i].locked && !isProgrammer) return d;
        list[i] = form;
      } else list.push({ ...form, id: uid() });
      return { ...d, users: list };
    });
    toast.success(form.id ? "User updated." : "User added.");
    setForm(blank());
  };

  const remove = (u: User) => {
    if (u.locked) return toast.error("This account is restricted and cannot be deleted.");
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
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Position">
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.filter((r) => isProgrammer || (r !== "PROGRAMMER-IV" && r !== "PROGRAMMER")).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Panel>
      )}

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
          columns={["Username", "Name", "Position", "Role", "Actions"]}
          rows={visible.map((u) => [
            u.username,
            u.name,
            u.position,
            u.role,
            <div className="flex gap-1">
              {writable && (!u.locked || isProgrammer) && (
                <button className="btn-ghost-3d px-2" onClick={() => setForm(u)}>
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canDelete && !u.locked && (
                <button className="btn-ghost-3d px-2" onClick={() => remove(u)}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
              {u.locked && <span className="text-[10px] text-muted-foreground">restricted</span>}
            </div>,
          ])}
        />
      </Panel>
    </div>
  );
}
