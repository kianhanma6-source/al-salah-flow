import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AttendanceRow } from "@/lib/db";

/** Live map of on-duty employees with moving markers and travel paths. */
export default function LiveMap({
  rows,
  focusId,
  onSelect,
}: {
  rows: AttendanceRow[];
  focusId?: string;
  onSelect?: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { center: [25.3463, 55.4209], zoom: 11 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    rows.forEach((r) => {
      const path = r.route.map((p) => [p.lat, p.lng] as L.LatLngExpression);
      if (!path.length) return;
      bounds.push(...path);
      L.polyline(path, {
        color: r.id === focusId ? "#38bdf8" : "#f59e0b",
        weight: r.id === focusId ? 5 : 3,
        opacity: 0.85,
      }).addTo(g);
      const last = r.route[r.route.length - 1]!;
      const marker = L.marker([last.lat, last.lng]).addTo(g);
      marker.bindPopup(
        `<div style="font:12px sans-serif;text-align:center">${
          r.photo ? `<img src="${r.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover" />` : ""
        }<div><b>${r.name}</b></div><div>${last.address ?? ""}</div><div>${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}</div></div>`,
      );
      marker.on("click", () => onSelect?.(r.id));
    });

    if (focusId) {
      const f = rows.find((r) => r.id === focusId);
      const last = f?.route[f.route.length - 1];
      if (last) m.setView([last.lat, last.lng], 15);
    } else if (bounds.length) {
      m.fitBounds(L.latLngBounds(bounds).pad(0.25));
    }
  }, [rows, focusId, onSelect]);

  return <div ref={el} className="h-[420px] w-full rounded-lg border border-border" />;
}
