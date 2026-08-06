import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  computeStock,
  nextTransNo,
  setDB,
  today,
  uid,
  useDB,
  type DeploymentLine,
  type ModuleKey,
} from "@/lib/db";
import { canWrite, useAuth } from "@/lib/auth";
import { exportExcel, exportPDF } from "@/lib/reports";
import {
  ComboBox,
  DataTable,
  Field,
  Input,
  Panel,
  PhotoInput,
  SearchBar,
  Select,
  StatusChip,
} from "./ui-kit";

type SubTab = "inventory" | "deployment" | "monitor";

function matches(row: unknown, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const collect = (v: unknown): string => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.map(collect).join(" ");
    if (typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .filter(([k]) => k !== "photo" && k !== "id")
        .map(([, val]) => collect(val))
        .join(" ");
    }
    return String(v);
  };
  return collect(row).toLowerCase().includes(term);
}

export function ModuleView({
  moduleKey,
  title,
  wm = false,
  prefix,
  monitorLabel,
}: {
  moduleKey: ModuleKey;
  title: string;
  wm?: boolean;
  prefix: string;
  monitorLabel: string;
}) {
  const db = useDB();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const mod = db.modules[moduleKey];
  const [sub, setSub] = useState<SubTab>("inventory");

  const [invSearch, setInvSearch] = useState("");
  const [depSearch, setDepSearch] = useState("");
  const [monSearch, setMonSearch] = useState("");

  /* ---------- inventory form ---------- */
  const blankInv = {
    id: "",
    transNo: nextTransNo(prefix, mod.inventory),
    date: today(),
    materialName: "",
    photo: "",
    model: "",
    unit: "pcs",
    wmNo: "",
    wmKeyNo: "",
    qty: 0,
  };
  const [inv, setInv] = useState(blankInv);
  const resetInv = () => setInv({ ...blankInv, transNo: nextTransNo(prefix, mod.inventory) });

  const saveInv = () => {
    if (!inv.materialName.trim()) return toast.error("Material / WM name is required.");
    setDB((d) => {
      const list = [...d.modules[moduleKey].inventory];
      if (inv.id) {
        const i = list.findIndex((r) => r.id === inv.id);
        list[i] = { ...inv, qty: Number(inv.qty) };
      } else {
        list.push({ ...inv, id: uid(), qty: Number(inv.qty) });
      }
      return { ...d, modules: { ...d.modules, [moduleKey]: { ...d.modules[moduleKey], inventory: list } } };
    });
    toast.success(inv.id ? "Inventory updated." : "Inventory saved.");
    resetInv();
  };

  const delInv = (id: string) => {
    if (!confirm("Delete this inventory record?")) return;
    setDB((d) => ({
      ...d,
      modules: {
        ...d.modules,
        [moduleKey]: {
          ...d.modules[moduleKey],
          inventory: d.modules[moduleKey].inventory.filter((r) => r.id !== id),
        },
      },
    }));
    toast.success("Record deleted.");
  };

  /* ---------- deployment form ---------- */
  const blankDep = {
    id: "",
    transNo: nextTransNo(prefix + "D", mod.deployment),
    date: today(),
    name: "",
    area: "",
    lines: [] as DeploymentLine[],
  };
  const [dep, setDep] = useState(blankDep);
  const [line, setLine] = useState<DeploymentLine>({
    materialName: "",
    photo: "",
    model: "",
    unit: "pcs",
    wmNo: "",
    wmKeyNo: "",
    qty: 0,
  });

  const stock = useMemo(() => computeStock(mod), [mod]);
  const resetDep = () => {
    setDep({ ...blankDep, transNo: nextTransNo(prefix + "D", mod.deployment) });
    setLine({ materialName: "", photo: "", model: "", unit: "pcs", wmNo: "", wmKeyNo: "", qty: 0 });
  };

  const pickMaterial = (key: string) => {
    const s = stock.find((x) => x.key === key);
    if (!s) return setLine((l) => ({ ...l, materialName: "", model: "", photo: "" }));
    setLine((l) => ({ ...l, materialName: s.materialName, model: s.model, photo: s.photo, unit: s.unit }));
  };

  const addLine = () => {
    if (!line.materialName) return toast.error("Select a material from inventory.");
    const s = stock.find((x) => x.materialName === line.materialName && x.model === line.model);
    if (s && Number(line.qty) > s.balance) return toast.error(`Only ${s.balance} available in stock.`);
    if (Number(line.qty) <= 0) return toast.error("Quantity must be greater than zero.");
    setDep((d) => ({ ...d, lines: [...d.lines, { ...line, qty: Number(line.qty) }] }));
    setLine({ materialName: "", photo: "", model: "", unit: "pcs", wmNo: "", wmKeyNo: "", qty: 0 });
  };

  const saveDep = () => {
    if (!dep.lines.length) return toast.error("Add at least one material line.");
    setDB((d) => {
      const list = [...d.modules[moduleKey].deployment];
      if (dep.id) {
        const i = list.findIndex((r) => r.id === dep.id);
        list[i] = { ...dep };
      } else list.push({ ...dep, id: uid() });
      return { ...d, modules: { ...d.modules, [moduleKey]: { ...d.modules[moduleKey], deployment: list } } };
    });
    toast.success(dep.id ? "Deployment updated." : "Deployment saved. Inventory deducted.");
    resetDep();
  };

  const delDep = (id: string) => {
    if (!confirm("Delete this deployment record?")) return;
    setDB((d) => ({
      ...d,
      modules: {
        ...d.modules,
        [moduleKey]: {
          ...d.modules[moduleKey],
          deployment: d.modules[moduleKey].deployment.filter((r) => r.id !== id),
        },
      },
    }));
    toast.success("Record deleted.");
  };

  /* ---------- filtered lists (inventory sorts a-z by model, rest z-a) ---------- */
  const invRows = mod.inventory
    .filter((r) => matches(r, invSearch))
    .sort((a, b) => (a.model || "").localeCompare(b.model || "", undefined, { sensitivity: "base" }));

  const depRows = mod.deployment
    .filter((r) => matches(r, depSearch))
    .sort((a, b) => b.transNo.localeCompare(a.transNo));

  const historyRows = mod.deployment
    .filter((r) => matches(r, monSearch))
    .flatMap((d) => d.lines.map((l) => ({ ...d, ...l })))
    .sort((a, b) => b.transNo.localeCompare(a.transNo));

  const nameLabel = wm ? "WM Name" : "Material Name";

  return (
    <div className="space-y-5">
      <div className="panel-3d flex flex-wrap gap-2 p-2">
        {(
          [
            ["inventory", "Inventory"],
            ["deployment", "Deployment"],
            ["monitor", monitorLabel],
          ] as [SubTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={sub === k ? "btn-3d" : "btn-ghost-3d"}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "inventory" && (
        <>
          <Panel title={`${title} · Search Inventory`}>
            <SearchBar value={invSearch} set={setInvSearch} />
          </Panel>

          {writable && (
            <Panel
              title={`${title} · Inventory Data Entry`}
              actions={
                <>
                  <button className="btn-3d" onClick={saveInv}>
                    <Save className="size-4" /> {inv.id ? "Update" : "Add"}
                  </button>
                  <button className="btn-ghost-3d" onClick={resetInv}>
                    <X className="size-4" /> Clear
                  </button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Trans No.">
                  <Input value={inv.transNo} onChange={(e) => setInv({ ...inv, transNo: e.target.value })} />
                </Field>
                <Field label="Date">
                  <Input type="date" value={inv.date} onChange={(e) => setInv({ ...inv, date: e.target.value })} />
                </Field>
                <Field label={nameLabel}>
                  {wm ? (
                    <ComboBox field="wmName" value={inv.materialName} onChange={(v) => setInv({ ...inv, materialName: v })} />
                  ) : (
                    <Input value={inv.materialName} onChange={(e) => setInv({ ...inv, materialName: e.target.value })} />
                  )}
                </Field>
                <Field label="Model">
                  {wm ? (
                    <ComboBox field="wmModel" value={inv.model} onChange={(v) => setInv({ ...inv, model: v })} />
                  ) : (
                    <Input value={inv.model} onChange={(e) => setInv({ ...inv, model: e.target.value })} />
                  )}
                </Field>
                <Field label="Unit">
                  <ComboBox field="unit" value={inv.unit} onChange={(v) => setInv({ ...inv, unit: v })} />
                </Field>
                <Field label="Photo 6x6 (auto-resize ≤80KB)">
                  <PhotoInput value={inv.photo} onChange={(v) => setInv({ ...inv, photo: v })} />
                </Field>
                {wm && (
                  <>
                    <Field label="WM No.">
                      <Input value={inv.wmNo} onChange={(e) => setInv({ ...inv, wmNo: e.target.value })} />
                    </Field>
                    <Field label="WM Key No.">
                      <Input value={inv.wmKeyNo} onChange={(e) => setInv({ ...inv, wmKeyNo: e.target.value })} />
                    </Field>
                  </>
                )}
                <Field label="Qty">
                  <Input type="number" value={inv.qty} onChange={(e) => setInv({ ...inv, qty: Number(e.target.value) })} />
                </Field>
              </div>
            </Panel>
          )}

          <Panel
            title={`${title} · Inventory Displaylist`}
            actions={
              <>
                <button
                  className="btn-ghost-3d"
                  onClick={() =>
                    exportExcel(
                      "Inventory",
                      invRows.map((r) => ({
                        Photo: r.photo || "",
                        [nameLabel]: r.materialName,
                        Model: r.model,
                        Qty: `${r.qty} ${r.unit}`.trim(),
                        Date: r.date,
                      })) as unknown as Record<string, unknown>[],
                      `${moduleKey}_inventory`,
                    )
                  }
                >
                  <FileSpreadsheet className="size-4" /> Excel
                </button>
                <button
                  className="btn-ghost-3d"
                  onClick={() =>
                    exportPDF(
                      `${title} Inventory Report`,
                      [nameLabel, "Model", "Qty", "Date"],
                      invRows.map((r) => [r.materialName, r.model, `${r.qty} ${r.unit}`.trim(), r.date]),
                      undefined,
                      invRows.map((r) => r.photo || undefined),
                    )
                  }
                >
                  <FileDown className="size-4" /> PDF
                </button>

              </>
            }
          >
            <DataTable
              columns={[
                "Photo",
                "Trans No",
                "Date",
                nameLabel,
                "Model",
                ...(wm ? ["WM No", "WM Key No"] : []),
                "Unit",
                "Qty",
                "Actions",
              ]}
              rows={invRows.map((r) => [
                r.photo ? <img src={r.photo} alt={r.materialName} className="size-10 rounded object-cover" /> : "—",
                r.transNo,
                r.date,
                r.materialName,
                r.model,
                ...(wm ? [r.wmNo || "—", r.wmKeyNo || "—"] : []),
                r.unit,
                r.qty,
                writable ? (
                  <div className="flex gap-1">
                    <button className="btn-ghost-3d px-2" onClick={() => setInv({ ...blankInv, ...r, wmNo: r.wmNo ?? "", wmKeyNo: r.wmKeyNo ?? "" })}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button className="btn-ghost-3d px-2" onClick={() => delInv(r.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  "—"
                ),
              ])}
            />
          </Panel>
        </>
      )}

      {sub === "deployment" && (
        <>
          <Panel title={`${title} · Search Deployment`}>
            <SearchBar value={depSearch} set={setDepSearch} />
          </Panel>

          {writable && (
            <Panel
              title={`${title} · Deployment Data Entry`}
              actions={
                <>
                  <button className="btn-3d" onClick={saveDep}>
                    <Save className="size-4" /> {dep.id ? "Update" : "Add"}
                  </button>
                  <button className="btn-ghost-3d" onClick={resetDep}>
                    <X className="size-4" /> Clear
                  </button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Trans No.">
                  <Input value={dep.transNo} onChange={(e) => setDep({ ...dep, transNo: e.target.value })} />
                </Field>
                <Field label="Date">
                  <Input type="date" value={dep.date} onChange={(e) => setDep({ ...dep, date: e.target.value })} />
                </Field>
                <Field label="Name">
                  <ComboBox field="name" value={dep.name} onChange={(v) => setDep({ ...dep, name: v })} />
                </Field>
                <Field label="Area">
                  <ComboBox field="area" value={dep.area} onChange={(v) => setDep({ ...dep, area: v })} />
                </Field>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-black/20 p-3">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-accent">
                  Add materials (multiple lines per trans no.)
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label={`${nameLabel} (from inventory)`}>
                    <Select
                      value={stock.find((s) => s.materialName === line.materialName && s.model === line.model)?.key ?? ""}
                      onChange={(e) => pickMaterial(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {stock.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.materialName} — {s.model} (avail: {s.balance})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Model (auto)">
                    <Input value={line.model} readOnly />
                  </Field>
                  <Field label="Photo (auto)">
                    <div className="grid size-16 place-items-center overflow-hidden rounded-md border border-border bg-black/30">
                      {line.photo ? <img src={line.photo} alt="" className="size-full object-cover" /> : <span className="text-[10px] text-muted-foreground">—</span>}
                    </div>
                  </Field>
                  <Field label="Unit">
                    <ComboBox field="unit" value={line.unit} onChange={(v) => setLine({ ...line, unit: v })} />
                  </Field>
                  {wm && (
                    <>
                      <Field label="WM No.">
                        <Input value={line.wmNo} onChange={(e) => setLine({ ...line, wmNo: e.target.value })} />
                      </Field>
                      <Field label="WM Key No.">
                        <Input value={line.wmKeyNo} onChange={(e) => setLine({ ...line, wmKeyNo: e.target.value })} />
                      </Field>
                    </>
                  )}
                  <Field label="Qty">
                    <Input type="number" value={line.qty} onChange={(e) => setLine({ ...line, qty: Number(e.target.value) })} />
                  </Field>
                </div>
                <button className="btn-ghost-3d mt-3" onClick={addLine}>
                  <Plus className="size-4" /> Add line
                </button>

                {dep.lines.length > 0 && (
                  <div className="mt-3">
                    <DataTable
                      columns={[nameLabel, "Model", ...(wm ? ["WM No", "WM Key No"] : []), "Unit", "Qty", ""]}
                      rows={dep.lines.map((l, i) => [
                        l.materialName,
                        l.model,
                        ...(wm ? [l.wmNo || "—", l.wmKeyNo || "—"] : []),
                        l.unit,
                        l.qty,
                        <button
                          className="btn-ghost-3d px-2"
                          onClick={() => setDep((d) => ({ ...d, lines: d.lines.filter((_, j) => j !== i) }))}
                        >
                          <Trash2 className="size-3.5" />
                        </button>,
                      ])}
                    />
                  </div>
                )}
              </div>
            </Panel>
          )}

          <Panel
            title={`${title} · Deployment Displaylist`}
            actions={
              <>
                <button
                  className="btn-ghost-3d"
                  onClick={() =>
                    exportExcel(
                      "Deployment",
                      depRows.flatMap((d) => d.lines.map((l) => ({ transNo: d.transNo, date: d.date, name: d.name, area: d.area, ...l }))),
                      `${moduleKey}_deployment`,
                    )
                  }
                >
                  <FileSpreadsheet className="size-4" /> Excel
                </button>
                <button
                  className="btn-ghost-3d"
                  onClick={() =>
                    exportPDF(
                      `${title} Deployment Report`,
                      ["Trans No", "Date", "Name", "Area", nameLabel, "Model", "Unit", "Qty"],
                      depRows.flatMap((d) => d.lines.map((l) => [d.transNo, d.date, d.name, d.area, l.materialName, l.model, l.unit, l.qty])),
                      undefined,
                      depRows.flatMap((d) => d.lines.map((l) => l.photo || undefined)),
                    )
                  }
                >
                  <FileDown className="size-4" /> PDF
                </button>
              </>
            }
          >
            <DataTable
              columns={["Photo", "Trans No", "Date", "Name", "Area", nameLabel, "Model", ...(wm ? ["WM No", "WM Key No"] : []), "Unit", "Qty", "Actions"]}
              rows={depRows.flatMap((d) =>
                d.lines.map((l, idx) => [
                  l.photo ? <img src={l.photo} alt="" className="size-10 rounded object-cover" /> : "—",
                  d.transNo,
                  d.date,
                  d.name,
                  d.area,
                  l.materialName,
                  l.model,
                  ...(wm ? [l.wmNo || "—", l.wmKeyNo || "—"] : []),
                  l.unit,
                  l.qty,
                  writable && idx === 0 ? (
                    <div className="flex gap-1">
                      <button className="btn-ghost-3d px-2" onClick={() => setDep({ ...d })}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button className="btn-ghost-3d px-2" onClick={() => delDep(d.id)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    "—"
                  ),
                ]),
              )}
            />
          </Panel>
        </>
      )}

      {sub === "monitor" && (
        <>
          <Panel title={`${title} · Search`}>
            <SearchBar value={monSearch} set={setMonSearch} />
          </Panel>

          {wm ? (
            <Panel
              title={`${title} · ${monitorLabel} Displaylist`}
              actions={
                <button
                  className="btn-ghost-3d"
                  onClick={() =>
                    exportPDF(
                      `${title} ${monitorLabel}`,
                      ["Trans No", "Date", "Name", "Area", nameLabel, "Model", "WM No", "WM Key No", "Unit", "Qty"],
                      historyRows.map((r) => [r.transNo, r.date, r.name, r.area, r.materialName, r.model, r.wmNo ?? "", r.wmKeyNo ?? "", r.unit, r.qty]),
                      undefined,
                      historyRows.map((r) => r.photo || undefined),
                    )
                  }
                >
                  <FileDown className="size-4" /> PDF
                </button>
              }
            >
              <DataTable
                columns={["Trans No", "Date", "Name", "Area", nameLabel, "Model", "WM No", "WM Key No", "Unit", "Qty"]}
                rows={historyRows.map((r) => [r.transNo, r.date, r.name, r.area, r.materialName, r.model, r.wmNo || "—", r.wmKeyNo || "—", r.unit, r.qty])}
              />
            </Panel>
          ) : (
            <Panel
              title={`${title} · Monitoring Displaylist`}
              actions={
                <>
                  <button className="btn-ghost-3d" onClick={() => exportExcel("Monitoring", stock.map(({ key: _k, ...r }) => r), `${moduleKey}_monitoring`)}>
                    <FileSpreadsheet className="size-4" /> Excel
                  </button>
                  <button
                    className="btn-ghost-3d"
                    onClick={() =>
                      exportPDF(
                        `${title} Monitoring Report`,
                        ["Material", "Model", "Unit", "Received", "Deployed", "Balance", "Status"],
                        stock.map((s) => [s.materialName, s.model, s.unit, s.received, s.deployed, s.balance, s.status]),
                        undefined,
                        stock.map((s) => s.photo || undefined),
                      )
                    }
                  >
                    <FileDown className="size-4" /> PDF
                  </button>
                </>
              }
            >
              <DataTable
                columns={["Photo", nameLabel, "Model", "Unit", "Received", "Deployed", "Balance", "Status"]}
                rows={stock.map((s) => [
                  s.photo ? <img src={s.photo} alt="" className="size-10 rounded object-cover" /> : "—",
                  s.materialName,
                  s.model,
                  s.unit,
                  s.received,
                  s.deployed,
                  <span className="font-bold">{s.balance}</span>,
                  <StatusChip status={s.status} />,
                ])}
              />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
