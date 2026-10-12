"use client";

import { useEffect, useState } from "react";
import AdminTable from "@/app/components/AdminTable";

const TABS = [
  { key: "turnos", label: "Turnos" },
  { key: "materia_prima", label: "Materia Prima" },
  { key: "presentaciones", label: "Presentaciones" },
  { key: "moldes", label: "Moldes" },
];

export default function BaseDatosPanel() {
  const [tab, setTab] = useState("turnos");
  const [presentaciones, setPresentaciones] = useState([]);

  useEffect(() => {
    // Se necesitan las presentaciones para el selector de la pestaña "Moldes"
    fetch("/api/admin/presentaciones")
      .then((r) => r.json())
      .then((data) => setPresentaciones(data.registros || []))
      .catch(() => {});
  }, []);

  const opcionesPresentaciones = presentaciones.map((p) => ({ value: p.id, label: p.nombre }));

  return (
    <>
      <style>{css}</style>
      <div className="bd-panel">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"tab-btn" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "turnos" && (
          <AdminTable
            tabla="turnos"
            titulo="Turnos"
            campos={[
              { key: "nombre", label: "Nombre", type: "text" },
              { key: "hora_inicio", label: "Hora inicio", type: "time" },
              { key: "hora_fin", label: "Hora fin", type: "time" },
            ]}
          />
        )}

        {tab === "materia_prima" && (
          <AdminTable
            tabla="materia_prima"
            titulo="Materia Prima"
            campos={[
              { key: "nombre", label: "Nombre", type: "text" },
              { key: "unidad_medida", label: "Unidad", type: "text" },
              { key: "stock_actual_kg", label: "Stock actual (kg)", type: "number" },
              { key: "stock_minimo_kg", label: "Stock mínimo (kg)", type: "number" },
            ]}
          />
        )}

        {tab === "presentaciones" && (
          <AdminTable
            tabla="presentaciones"
            titulo="Presentaciones"
            campos={[
              { key: "nombre", label: "Nombre", type: "text" },
              { key: "capacidad_ml", label: "Capacidad (ml)", type: "number" },
              { key: "peso_preforma_g", label: "Peso preforma (g)", type: "number" },
              { key: "peso_botella_g", label: "Peso botella (g)", type: "number" },
              { key: "activo", label: "Activo", type: "checkbox", default: true },
            ]}
          />
        )}

        {tab === "moldes" && (
          <AdminTable
            key={opcionesPresentaciones.length}
            tabla="moldes"
            titulo="Moldes"
            campos={[
              { key: "codigo", label: "Código", type: "text" },
              { key: "nombre", label: "Nombre", type: "text" },
              { key: "presentacion_id", label: "Presentación", type: "select", options: opcionesPresentaciones },
              { key: "activo", label: "Activo", type: "checkbox", default: true },
            ]}
          />
        )}
      </div>
    </>
  );
}

const css = `
:root{ --brand-dark:#123B7A; --brand:#2A6FE0; --ink-soft:#5B6B7A; --line:#E2E6EA; }
.bd-panel{ padding:28px 32px 60px 32px; max-width:1000px; margin:0 auto; font-family:'Inter',sans-serif; }
.tabs{ display:flex; gap:8px; margin-bottom:24px; border-bottom:1px solid var(--line); }
.tab-btn{ padding:10px 16px; background:none; border:none; border-bottom:2px solid transparent; font-size:13.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; margin-bottom:-1px; }
.tab-btn:hover{ color:var(--brand-dark); }
.tab-btn.active{ color:var(--brand-dark); border-bottom-color:var(--brand-dark); }
`;
