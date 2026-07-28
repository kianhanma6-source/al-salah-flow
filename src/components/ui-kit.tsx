import { useRef, useState, type ReactNode } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { addCombo, removeCombo, useDB, type Combos } from "@/lib/db";
import { toSquareBase64 } from "@/lib/imaging";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field-3d ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field-3d ${props.className ?? ""}`} />;
}

export function Panel({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel-3d p-4 sm:p-5">
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          {title && (
            <h2 className="display text-sm font-bold uppercase tracking-widest text-primary">
              {title}
            </h2>
          )}
          <div className="flex flex-wrap gap-2">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

/** Combo list with inline add / remove of options. */
export function ComboBox({
  field,
  value,
  onChange,
  placeholder = "Select…",
  editable = true,
}: {
  field: keyof Combos;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  const db = useDB();
  const [adding, setAdding] = useState("");
  const options = db.combos[field];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        {editable && value && (
          <button
            type="button"
            title="Remove option"
            onClick={() => {
              removeCombo(field, value);
              onChange("");
            }}
            className="btn-ghost-3d px-2"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {editable && (
        <div className="flex gap-1">
          <Input
            value={adding}
            placeholder="Add new option"
            onChange={(e) => setAdding(e.target.value)}
            className="text-xs"
          />
          <button
            type="button"
            className="btn-ghost-3d px-2"
            onClick={() => {
              if (!adding.trim()) return;
              addCombo(field, adding);
              onChange(adding.trim());
              setAdding("");
            }}
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function PhotoInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-black/30">
        {value ? (
          <img src={value} alt="Item" className="size-full object-cover" />
        ) : (
          <span className="text-[10px] text-muted-foreground">6x6</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button type="button" className="btn-ghost-3d" onClick={() => ref.current?.click()}>
          <Upload className="size-4" /> Photo
        </button>
        {value && (
          <button type="button" className="btn-ghost-3d" onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await toSquareBase64(f));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty = "No records found.",
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-black/30">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-border/60 hover:bg-white/5">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2 align-middle">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBar({
  value,
  set,
}: {
  value: string;
  set: (v: string) => void;
}) {
  return (
    <Field label="Search all records (trans no., date, name, model, area, unit…)">
      <Input value={value} onChange={(e) => set(e.target.value)} placeholder="Type to search…" />
    </Field>
  );
}


export function StatusChip({ status }: { status: string }) {
  const tone =
    status === "CRITICAL"
      ? "bg-destructive/20 text-destructive border-destructive/50"
      : status === "LOW STOCK"
        ? "bg-warning/20 text-warning border-warning/50"
        : "bg-success/20 text-success border-success/50";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
