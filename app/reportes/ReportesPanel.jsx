"use client";

import { useState } from "react";

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function hoy() {
  return iso(new Date());
}
function haceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function inicioDeMes() {
  const d = new Date();
  d.setDate(1);
  return iso(d);
}

const PERIODOS = [
  { key: "hoy", label: "Hoy", desde: () => hoy(), hasta: () => hoy() },
  { key: "semana", label: "Últimos 7 días", desde: () => haceNDias(6), hasta: () => hoy() },
  { key: "mes", label: "Este mes", desde: () => inicioDeMes(), hasta: () => hoy() },
  { key: "custom", label: "Personalizado", desde: null, hasta: null },
];

export default function ReportesPanel() {
  const [periodo, setPeriodo] = useState("hoy");
  const [desdeCustom, setDesdeCustom] = useState(hoy());
  const [hastaCustom, setHastaCustom] = useState(hoy());
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  const activo = PERIODOS.find((p) => p.key === periodo);
  const desde = periodo === "custom" ? desdeCustom : activo.desde();
  const hasta = periodo === "custom" ? hastaCustom : activo.hasta();
  const rangoValido = desde && hasta && desde <= hasta;

  async function descargar() {
    setError("");
    if (!rangoValido) {
      setError("La fecha inicial debe ser anterior o igual a la final.");
      return;
    }
    setDescargando(true);
    try {
      const res = await fetch(`/api/reportes?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el reporte.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_multisoplado_${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
    setDescargando(false);
  }

  return (
    <>
      <style>{css}</style>
      <div className="reportes">
        <div className="section-title">Periodo</div>
        <div className="periodo-row">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              className={"periodo-btn" + (periodo === p.key ? " active" : "")}
              onClick={() => setPeriodo(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodo === "custom" && (
          <div className="custom-dates">
            <div className="field">
              <label>Desde</label>
              <input type="date" value={desdeCustom} onChange={(e) => setDesdeCustom(e.target.value)} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={hastaCustom} onChange={(e) => setHastaCustom(e.target.value)} />
            </div>
          </div>
        )}

        <div className="preview-card">
          <div className="preview-label">Se va a generar el reporte de</div>
          <div className="preview-range">{desde} → {hasta}</div>
          <div className="preview-sheets">
            <span>📄 Resumen</span>
            <span>📄 Producción</span>
            <span>📄 Merma</span>
            <span>📄 Paradas</span>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn-primary" onClick={descargar} disabled={descargando || !rangoValido}>
            {descargando ? "Generando..." : "Descargar reporte Excel"}
          </button>
        </div>
      </div>
    </>
  );
}

const css = `
:root{
  --brand-dark:#123B7A; --brand:#2A6FE0; --brand-light:#3FC6B8;
  --ink:#16211D; --ink-soft:#5B6B7A; --surface:#F4F6F8; --line:#E2E6EA; --alert:#C0392B;
}
*{ box-sizing:border-box; }
.reportes{ padding:28px 32px 60px 32px; max-width:640px; margin:0 auto; font-family:'Inter',sans-serif; color:var(--ink); }
.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin:0 0 14px 0; }

.periodo-row{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
.periodo-btn{ padding:10px 16px; background:#fff; border:1.5px solid var(--line); border-radius:6px; font-size:13.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; transition:all 0.15s ease; }
.periodo-btn:hover{ border-color:var(--brand); color:var(--brand-dark); }
.periodo-btn.active{ background:var(--brand-dark); border-color:var(--brand-dark); color:#fff; }

.custom-dates{ display:flex; gap:14px; margin-bottom:18px; }
.field{ flex:1; }
.field label{ display:block; font-size:12.5px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; }
.field input{ width:100%; padding:10px 11px; font-size:14px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; }
.field input:focus{ border-color:var(--brand); }

.preview-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:24px; text-align:center; }
.preview-label{ font-size:12.5px; color:var(--ink-soft); margin-bottom:4px; }
.preview-range{ font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:700; color:var(--brand-dark); margin-bottom:16px; }
.preview-sheets{ display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-bottom:22px; font-size:12.5px; color:var(--ink-soft); }

.btn-primary{ padding:12px 26px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:14.5px; font-weight:600; cursor:pointer; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }

.error-msg{ color:var(--alert); font-size:13px; margin-bottom:12px; }

@media (max-width:560px){
  .reportes{ padding:20px 16px 40px 16px; }
  .custom-dates{ flex-direction:column; gap:14px; }
}
`;
