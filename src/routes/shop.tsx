import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Field, Input, Panel } from "@/components/ui-kit";
import { setDB, today, uid, useDB } from "@/lib/db";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : "" }),
  head: () => ({
    meta: [
      { title: "Product Store | AL HAYAH AL SALAH" },
      {
        name: "description",
        content: "Browse products and place an order with your assigned company representative.",
      },
      { property: "og:title", content: "AL HAYAH AL SALAH Product Store" },
      { property: "og:description", content: "Browse products and place your order online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { ref } = Route.useSearch();
  const db = useDB();
  const products = db.products.filter((p) => p.active);
  const [productId, setProductId] = useState("");
  const [form, setForm] = useState({
    repName: "",
    contact: "",
    email: "",
    companyName: "",
    location: "",
    qty: 1,
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });

  const submit = () => {
    const p = db.products.find((x) => x.id === productId);
    if (!p) return toast.error("Please choose a product.");
    if (!form.repName || !form.contact || !form.companyName) return toast.error("Please complete your details.");
    const qty = Math.max(1, Number(form.qty) || 1);
    setDB((d) => ({
      ...d,
      orders: [
        {
          id: uid(),
          date: today(),
          productId: p.id,
          productName: p.name,
          model: p.model,
          qty,
          repName: form.repName,
          contact: form.contact,
          email: form.email,
          companyName: form.companyName,
          location: form.location,
          lat: form.lat,
          lng: form.lng,
          salespersonId: ref,
          commissionPerUnit: p.commission,
          commissionTotal: p.commission * qty,
          approved: false,
        },
        ...d.orders,
      ],
    }));
    toast.success("Order submitted. Our representative will contact you shortly.");
    setForm({ repName: "", contact: "", email: "", companyName: "", location: "", qty: 1, lat: undefined, lng: undefined });
    setProductId("");
  };

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <div className="panel-3d flex items-center gap-4 p-4">
          <img src={db.branding.logo || defaultLogo} alt="Company logo" className="size-14 object-contain" />
          <div>
            <h1 className="display text-base font-bold">{db.branding.companyName}</h1>
            <p className="text-[11px] text-muted-foreground">Online Product Store</p>
          </div>
        </div>

        <Panel title="Available Products">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.length === 0 && <p className="text-sm text-muted-foreground">No products available yet.</p>}
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setProductId(p.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  productId === p.id ? "border-primary shadow-[var(--shadow-glow)]" : "border-border hover:bg-white/5"
                }`}
              >
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="mb-2 h-32 w-full rounded object-cover" />
                ) : (
                  <div className="mb-2 grid h-32 w-full place-items-center rounded bg-black/30 text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">Model: {p.model || "—"}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Order Form"
          actions={
            <button className="btn-3d" onClick={submit}>
              <ShoppingCart className="size-4" /> Place order
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company Representative Name">
              <Input value={form.repName} onChange={(e) => setForm({ ...form, repName: e.target.value })} />
            </Field>
            <Field label="Contact No.">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Company Name">
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </Field>
            <Field label="Location / Address">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            </Field>
            <Field label="Pin my location">
              <button
                type="button"
                className="btn-ghost-3d"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                      toast.success("Location captured.");
                    },
                    () => toast.error("Unable to read your location."),
                  )
                }
              >
                <MapPin className="size-4" /> {form.lat ? "Location captured" : "Capture location"}
              </button>
            </Field>
            <Field label="Order date">
              <Input value={today()} readOnly />
            </Field>
          </div>
        </Panel>
      </main>
    </div>
  );
}
