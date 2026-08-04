import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, FileSpreadsheet, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { DataTable, Field, Input, Panel, PhotoInput } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import {
  AED,
  commissionBalance,
  mapsLink,
  referralLink,
  salesSeries,
  setDB,
  today,
  uid,
  useDB,
  type ChartRange,
  type Product,
  type User,
} from "@/lib/db";
import { exportExcel, exportWithdrawalReceipt } from "@/lib/reports";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Product Store & Commission | AL HAYAH AL SALAH" },
      {
        name: "description",
        content:
          "Manage store products, salesperson referral orders, AED commissions, withdrawals and sales charts.",
      },
      { property: "og:title", content: "Product Store & Commission System" },
      { property: "og:description", content: "Orders, commissions in AED and sales performance charts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell tab="store">
      <StorePage />
    </AppShell>
  ),
});

type View = "manager" | "sales" | "client";

function viewFor(u: User | null | undefined): View {
  const r = u?.role ?? "";
  if (["Sales Person", "Sales"].includes(r)) return "sales";
  if (r === "Client") return "client";
  return "manager";
}

const blankProduct = (): Product => ({
  id: "",
  photo: "",
  name: "",
  model: "",
  price: 0,
  commission: 0,
  active: true,
  createdAt: new Date().toISOString(),
});

function SalesChart({ data }: { data: { period: string; units: number; commission: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <ReTooltip />
          <Bar dataKey="units" name="Units" fill="hsl(var(--primary))" />
          <Bar dataKey="commission" name="Commission (AED)" fill="hsl(var(--warning))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StorePage() {
  const db = useDB();
  const { user: session } = useAuth();
  const user = db.users.find((u) => u.id === session?.id) ?? session;
  const view = viewFor(user);
  const [product, setProduct] = useState<Product>(blankProduct());
  const [range, setRange] = useState<ChartRange>("month");
  const [amount, setAmount] = useState(0);
  const [q, setQ] = useState("");

  const myOrders = useMemo(
    () => (view === "sales" ? db.orders.filter((o) => o.salespersonId === user?.id) : db.orders),
    [db.orders, view, user],
  );
  const orders = myOrders
    .filter((o) =>
      [o.date, o.companyName, o.repName, o.productName, o.model, o.contact, o.email]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const bal = commissionBalance(db, user?.id ?? "");
  const series = salesSeries(view === "sales" ? myOrders.filter((o) => o.approved) : db.orders.filter((o) => o.approved), range);
  const salespeople = db.users.filter((u) => ["Sales Person", "Sales"].includes(u.role));

  const saveProduct = () => {
    if (!product.name) return toast.error("Product name is required.");
    setDB((d) => {
      const list = [...d.products];
      if (product.id) list[list.findIndex((p) => p.id === product.id)] = product;
      else list.unshift({ ...product, id: uid(), createdAt: new Date().toISOString() });
      return { ...d, products: list };
    });
    toast.success(product.id ? "Product updated." : "Product added.");
    setProduct(blankProduct());
  };

  const approveOrder = (id: string) => {
    setDB((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, approved: true } : o)) }));
    toast.success("Sale approved — commission credited.");
  };

  const requestWithdrawal = () => {
    if (amount <= 0) return toast.error("Enter an amount.");
    if (amount > bal.balance - bal.pending) return toast.error("Amount exceeds available balance.");
    setDB((d) => ({
      ...d,
      withdrawals: [
        {
          id: uid(),
          salespersonId: user!.id,
          salespersonName: user!.name,
          amount,
          date: today(),
          status: "PENDING",
        },
        ...d.withdrawals,
      ],
    }));
    setAmount(0);
    toast.success("Withdrawal request submitted — Pending Approval.");
  };

  const approveWithdrawal = (id: string) => {
    const w = db.withdrawals.find((x) => x.id === id);
    if (!w) return;
    setDB((d) => ({
      ...d,
      withdrawals: d.withdrawals.map((x) =>
        x.id === id ? { ...x, status: "APPROVED", decidedAt: new Date().toISOString() } : x,
      ),
    }));
    const after = commissionBalance(db, w.salespersonId).balance - w.amount;
    exportWithdrawalReceipt({
      id: w.id,
      salespersonName: w.salespersonName,
      amount: w.amount,
      date: today(),
      balanceAfter: after,
    });
    toast.success("Withdrawal approved — receipt generated.");
  };

  return (
    <div className="space-y-5">
      <Panel title="Search Orders">
        <Field label={view === "sales" ? "Search my orders" : "Search all orders"}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
        </Field>
      </Panel>

      {view === "sales" && (
        <Panel title="My Referral Link & Commission Balance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Available balance</p>
              <p className="text-xl font-bold">{AED(bal.balance)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Earned</p>
              <p className="text-xl font-bold">{AED(bal.earned)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Pending withdrawals</p>
              <p className="text-xl font-bold">{AED(bal.pending)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Withdrawn</p>
              <p className="text-xl font-bold">{AED(bal.withdrawn)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="My referral link">
              <Input readOnly value={referralLink(user?.id ?? "")} />
            </Field>
            <button
              className="btn-ghost-3d"
              onClick={() => {
                navigator.clipboard?.writeText(referralLink(user?.id ?? ""));
                toast.success("Referral link copied.");
              }}
            >
              <Copy className="size-4" /> Copy
            </button>
            <Field label="Withdrawal amount (AED)">
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <button className="btn-3d" onClick={requestWithdrawal}>
              Request withdrawal
            </button>
          </div>
        </Panel>
      )}

      {view === "manager" && (
        <Panel
          title="Product Setup (commission per unit in AED)"
          actions={
            <>
              <button className="btn-3d" onClick={saveProduct}>
                <Save className="size-4" /> {product.id ? "Update" : "Add product"}
              </button>
              <button className="btn-ghost-3d" onClick={() => setProduct(blankProduct())}>
                <X className="size-4" /> Clear
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Product photo">
              <PhotoInput value={product.photo} onChange={(v) => setProduct({ ...product, photo: v })} />
            </Field>
            <Field label="Product name">
              <Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
            </Field>
            <Field label="Model">
              <Input value={product.model} onChange={(e) => setProduct({ ...product, model: e.target.value })} />
            </Field>
            <Field label="Price (AED)">
              <Input type="number" value={product.price} onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })} />
            </Field>
            <Field label="Commission per unit (AED)">
              <Input
                type="number"
                value={product.commission}
                onChange={(e) => setProduct({ ...product, commission: Number(e.target.value) })}
              />
            </Field>
            <Field label="Active in store">
              <select
                className="field-3d"
                value={product.active ? "yes" : "no"}
                onChange={(e) => setProduct({ ...product, active: e.target.value === "yes" })}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <DataTable
              columns={["Photo", "Name", "Model", "Price", "Commission / unit", "Active", "Actions"]}
              rows={db.products.map((p) => [
                p.photo ? <img src={p.photo} alt="" className="size-10 rounded object-cover" /> : "—",
                p.name,
                p.model,
                AED(p.price),
                AED(p.commission),
                p.active ? "Yes" : "No",
                <div className="flex gap-1">
                  <button className="btn-ghost-3d px-2" onClick={() => setProduct(p)}>
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    className="btn-ghost-3d px-2"
                    onClick={() => {
                      if (!confirm("Delete this product?")) return;
                      setDB((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }));
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>,
              ])}
            />
          </div>
        </Panel>
      )}

      <Panel
        title="Orders"
        actions={
          <button
            className="btn-ghost-3d"
            onClick={() =>
              exportExcel(
                "Orders",
                orders.map((o) => ({
                  Date: o.date,
                  Company: o.companyName,
                  Representative: o.repName,
                  Contact: o.contact,
                  Email: o.email,
                  Product: o.productName,
                  Model: o.model,
                  Qty: o.qty,
                  "Commission/Unit (AED)": o.commissionPerUnit,
                  "Total Commission (AED)": o.commissionTotal,
                  Status: o.approved ? "APPROVED" : "PENDING",
                })),
                "store_orders",
              )
            }
          >
            <FileSpreadsheet className="size-4" /> Excel
          </button>
        }
      >
        <DataTable
          columns={[
            "Date",
            "Company",
            "Representative",
            "Product",
            "Qty",
            "Commission",
            "Salesperson",
            "Location",
            "Status",
          ]}
          rows={orders.map((o) => [
            o.date,
            o.companyName,
            `${o.repName} · ${o.contact}`,
            `${o.productName} ${o.model}`,
            o.qty,
            AED(o.commissionTotal),
            db.users.find((u) => u.id === o.salespersonId)?.name ?? "—",
            <a className="text-primary underline" href={mapsLink(o.lat, o.lng, o.location)} target="_blank" rel="noreferrer">
              Directions
            </a>,
            o.approved ? (
              "APPROVED"
            ) : view === "manager" ? (
              <button className="btn-ghost-3d px-2 text-[10px]" onClick={() => approveOrder(o.id)}>
                Approve
              </button>
            ) : (
              "PENDING"
            ),
          ])}
        />
      </Panel>

      <Panel
        title={view === "sales" ? "My Sales Chart" : "Total Sales Chart — all salespersons"}
        actions={
          <select className="field-3d" value={range} onChange={(e) => setRange(e.target.value as ChartRange)}>
            <option value="week">Per Week</option>
            <option value="month">Per Month</option>
            <option value="year">Per Year</option>
          </select>
        }
      >
        <SalesChart data={series} />
      </Panel>

      {view === "manager" && (
        <Panel title="Salesperson Performance">
          <DataTable
            columns={["Salesperson", "Orders", "Units sold", "Commission earned", "Balance"]}
            rows={salespeople.map((s) => {
              const own = db.orders.filter((o) => o.salespersonId === s.id && o.approved);
              const b = commissionBalance(db, s.id);
              return [
                s.name,
                own.length,
                own.reduce((n, o) => n + (Number(o.qty) || 0), 0),
                AED(b.earned),
                AED(b.balance),
              ];
            })}
          />
        </Panel>
      )}

      <Panel title="Withdrawal Requests">
        <DataTable
          columns={["Date", "Salesperson", "Amount", "Status", "Actions"]}
          rows={db.withdrawals
            .filter((w) => view !== "sales" || w.salespersonId === user?.id)
            .map((w) => [
              w.date,
              w.salespersonName,
              AED(w.amount),
              w.status === "PENDING" ? "Pending Approval" : w.status,
              view === "manager" && w.status === "PENDING" ? (
                <button className="btn-ghost-3d px-2 text-[10px]" onClick={() => approveWithdrawal(w.id)}>
                  Approve & receipt
                </button>
              ) : (
                "—"
              ),
            ])}
        />
      </Panel>
    </div>
  );
}
