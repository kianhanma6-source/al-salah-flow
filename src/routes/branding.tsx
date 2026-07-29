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
          <img src={form.logo || defaultLogo} alt="Company logo preview" width={128} height={128} className="size-32 object-contain" />
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
          <p className="text-center text-[11px] text-muted-foreground">
            This logo appears on the login page, every page header and all PDF reports.
          </p>
        </div>
      </div>
    </Panel>
  );
}
