import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Panel } from "@/components/ui-kit";
import { setDB, useDB } from "@/lib/db";
import { toLogoBase64 } from "@/lib/imaging";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/branding")({
  head: () => ({
    meta: [
      { title: "Re-Branding | AL HAYAH AL SALAH" },
      { name: "description", content: "PROGRAMMER-IV control panel for company logo, name, address, contacts and report signatories." },
      { property: "og:title", content: "Re-Branding Control" },
      { property: "og:description", content: "Update the logo and report identity used across the whole system." },
    ],
  }),
  component: () => (
    <AppShell tab="branding">
      <BrandingPage />
    </AppShell>
  ),
});

function BrandingPage() {
  const db = useDB();
  const [form, setForm] = useState(db.branding);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <Panel
      title="Re-Branding (PROGRAMMER-IV only)"
      actions={
        <button
          className="btn-3d"
          onClick={() => {
            setDB((d) => ({ ...d, branding: form }));
            toast.success("Branding updated everywhere.");
          }}
        >
          <Save className="size-4" /> Save
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Company Name">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <Field label="Address Line 1">
            <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          </Field>
          <Field label="Address Line 2">
            <Input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          </Field>
          <Field label="Contact Numbers">
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </Field>
          <Field label="Email Address">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>

          <Field label="Signatory 1">
            <Input value={form.signatory1} onChange={(e) => setForm({ ...form, signatory1: e.target.value })} />
          </Field>
          <Field label="Signatory 2">
            <Input value={form.signatory2} onChange={(e) => setForm({ ...form, signatory2: e.target.value })} />
          </Field>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-black/20 p-6">
          <img
            src={form.logo || defaultLogo}
            alt="Company logo preview"
            width={128}
            height={128}
            className="size-32 rounded-full border border-primary/40 bg-white/5 object-contain p-1 shadow-[var(--shadow-3d)]"
          />
          <button className="btn-ghost-3d" onClick={() => ref.current?.click()}>
            <Upload className="size-4" /> Upload new logo
          </button>
          {form.logo && (
            <button className="btn-ghost-3d" onClick={() => setForm({ ...form, logo: "" })}>
              Reset to default
            </button>
          )}
          <input
            ref={ref}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setForm({ ...form, logo: await toLogoBase64(f) });
            }}
          />

          <div className="w-full space-y-2 border-t border-border pt-3">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide text-primary">
              Report logo position &amp; size
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoOffsetY: (form.logoOffsetY ?? 0) - 2 })}
              >
                ↑
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoOffsetY: (form.logoOffsetY ?? 0) + 2 })}
              >
                ↓
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoOffsetX: (form.logoOffsetX ?? 0) - 2 })}
              >
                ←
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoOffsetX: (form.logoOffsetX ?? 0) + 2 })}
              >
                →
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoScale: Math.min(3, (form.logoScale ?? 1) + 0.1) })}
              >
                Larger
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoScale: Math.max(0.3, (form.logoScale ?? 1) - 0.1) })}
              >
                Smaller
              </button>
              <button
                className="btn-ghost-3d px-2"
                onClick={() => setForm({ ...form, logoOffsetX: 0, logoOffsetY: 0, logoScale: 1 })}
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="X (mm)">
                <Input
                  type="number"
                  value={form.logoOffsetX ?? 0}
                  onChange={(e) => setForm({ ...form, logoOffsetX: Number(e.target.value) })}
                />
              </Field>
              <Field label="Y (mm)">
                <Input
                  type="number"
                  value={form.logoOffsetY ?? 0}
                  onChange={(e) => setForm({ ...form, logoOffsetY: Number(e.target.value) })}
                />
              </Field>
              <Field label="Scale">
                <Input
                  type="number"
                  step="0.1"
                  value={form.logoScale ?? 1}
                  onChange={(e) => setForm({ ...form, logoScale: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            The logo is always shown inside a perfect circle. Report headers stay centered on the page no
            matter where the logo is placed.
          </p>
        </div>

      </div>
    </Panel>
  );
}
