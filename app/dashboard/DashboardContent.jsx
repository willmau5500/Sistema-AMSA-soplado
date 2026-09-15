"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

// ---------- Animated count-up ----------
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target == null) return;
    fromRef.current = 0;
    startRef.current = null;

    function step(ts) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function fmt(n) {
  return n.toLocaleString("es-CO");
}

function tiempoDesde(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const TIPO_PARADA_LABEL = {
  mecanica: "Mecánica",
  electrica: "Eléctrica",
  falta_materia_prima: "Falta de MP",
  cambio_formato: "Cambio de formato",
  mantenimiento_programado: "Mant. programado",
  calidad: "Calidad",
  otro: "Otro",
};

function KpiCard({ icon, label, value, suffix, sublabel, alert }) {
  return (
    <div className={"kpi-card" + (alert ? " alert" : "")}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}{suffix}</div>
        {sublabel && <div className="kpi-sub">{sublabel}</div>}
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el dashboard.");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const botellasEnBodega = useCountUp(data?.botellasEnBodega ?? 0);
  const alertasStock = useCountUp(data?.alertasStock?.count ?? 0);
  const mermaHoy = useCountUp(Math.round((data?.mermaHoyKg ?? 0) * 10) / 10 * 10); // *10 for one decimal precision in count-up
  const cumplimiento = useCountUp(data?.cumplimiento ?? 0);

  const paradasChart = (data?.paradas || []).map((p) => ({
    tipo: TIPO_PARADA_LABEL[p.tipo] || p.tipo,
    minutos: p.minutos,
  }));

  const tendenciaChart = (data?.tendencia || []).map((t) => ({
    fecha: new Date(t.fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "short" }),
    botellas: t.botellas,
  }));

  return (
    <>
      <style>{css}</style>
      <div className="dash">
        <main className="dash-main">
          {loading && (
            <div className="kpi-row">
              {[0, 1, 2, 3].map((i) => <div key={i} className="kpi-card skeleton" />)}
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          {!loading && data && (
            <>
              <div className="kpi-row">
                <KpiCard
                  icon={<AlertIcon />}
                  label="Alertas de Stock MP"
                  value={fmt(alertasStock)}
                  suffix=""
                  sublabel={data.alertasStock.count > 0 ? `${data.alertasStock.count} producto(s) bajo mínimo` : "Todo en orden"}
                  alert={data.alertasStock.count > 0}
                />
                <KpiCard
                  icon={<BoxIcon />}
                  label="Botellas en Bodega"
                  value={fmt(botellasEnBodega)}
                  sublabel="Total acumulado"
                />
                <KpiCard
                  icon={<TargetIcon />}
                  label="Cumplimiento de Hoy"
                  value={data.cumplimiento === null ? "N/A" : fmt(cumplimiento)}
                  suffix={data.cumplimiento === null ? "" : "%"}
                  sublabel={data.cumplimiento === null ? "Sin metas definidas" : "vs. meta del día"}
                />
                <KpiCard
                  icon={<DropIcon />}
                  label="Merma Hoy"
                  value={fmt(Math.round(mermaHoy) / 10)}
                  suffix=" kg"
                  sublabel="Acumulada del día"
                />
              </div>

              <div className="section-title">Estado de máquinas</div>
              <div className="machine-row">
                {data.maquinas.length === 0 && <p className="hint">No hay máquinas activas registradas.</p>}
                {data.maquinas.map((m) => (
                  <div key={m.id} className="machine-card">
                    <div className="machine-top">
                      <span className={"status-dot" + (m.activa ? " on" : "")} />
                      <span className="machine-name">{m.nombre}</span>
                    </div>
                    <div className="machine-value">{fmt(m.botellasHoy)}</div>
                    <div className="machine-label">botellas hoy</div>
                  </div>
                ))}
              </div>

              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-title">Producción — últimos 7 días</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={tendenciaChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2A6FE0" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2A6FE0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAEDF2" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: "#8B98A8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#8B98A8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid #E2E6EA", fontSize: 13 }} />
                      <Area type="monotone" dataKey="botellas" stroke="#123B7A" strokeWidth={2.5} fill="url(#prodGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Minutos perdidos por tipo de parada (7 días)</div>
                  {paradasChart.length === 0 ? (
                    <p className="hint">Sin paradas registradas en este período.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={paradasChart} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAEDF2" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "#8B98A8" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="tipo" type="category" width={110} tick={{ fontSize: 12, fill: "#3A4654" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid #E2E6EA", fontSize: 13 }} />
                        <Bar dataKey="minutos" fill="#3FC6B8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="section-title">Actividad reciente</div>
              <div className="table-card">
                {data.lotesRecientes.length === 0 ? (
                  <p className="hint">Todavía no hay lotes registrados.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Máquina</th>
                        <th>Turno</th>
                        <th>Botellas</th>
                        <th>Cuándo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lotesRecientes.map((l) => (
                        <tr key={l.codigo_lote}>
                          <td className="mono">{l.codigo_lote}</td>
                          <td>{l.maquina}</td>
                          <td>{l.turno}</td>
                          <td>{fmt(l.botellas)}</td>
                          <td className="muted">{tiempoDesde(l.creado_en)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 0 0 3.5 20.5h17a1.5 1.5 0 0 0 1.4-2.46L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}
function DropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2s7 8.5 7 13a7 7 0 1 1-14 0c0-4.5 7-13 7-13Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const css = `
:root{
  --brand-dark:#123B7A; --brand:#2A6FE0; --brand-light:#3FC6B8;
  --ink:#16211D; --ink-soft:#5B6B7A; --surface:#F4F6F8; --line:#E2E6EA; --white:#fff;
  --alert:#C0392B;
}
*{ box-sizing:border-box; }
.dash{ font-family:'Inter',sans-serif; color:var(--ink); }

.dash-main{ padding:28px 32px 60px 32px; max-width:1200px; margin:0 auto; }

.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin:32px 0 14px 0; color:var(--ink); }

.kpi-row{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
.kpi-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:18px; display:flex; gap:14px; align-items:flex-start; transition:transform 0.15s ease, box-shadow 0.15s ease; }
.kpi-card:hover{ transform:translateY(-2px); box-shadow:0 6px 18px rgba(18,59,122,0.08); }
.kpi-card.skeleton{ height:88px; background:linear-gradient(90deg,#EEF1F4 25%,#F7F9FA 37%,#EEF1F4 63%); background-size:400% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer{ 0%{background-position:100% 0;} 100%{background-position:0 0;} }
.kpi-icon{ width:38px; height:38px; border-radius:8px; background:#EEF3FC; color:var(--brand-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.kpi-card.alert .kpi-icon{ background:#FBEAE8; color:var(--alert); }
.kpi-label{ font-size:12.5px; color:var(--ink-soft); margin-bottom:4px; }
.kpi-value{ font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; line-height:1.1; }
.kpi-card.alert .kpi-value{ color:var(--alert); }
.kpi-sub{ font-size:11.5px; color:var(--ink-soft); margin-top:4px; }

.machine-row{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:14px; }
.machine-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; transition:transform 0.15s ease, box-shadow 0.15s ease; }
.machine-card:hover{ transform:translateY(-2px); box-shadow:0 6px 18px rgba(18,59,122,0.08); }
.machine-top{ display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.status-dot{ width:8px; height:8px; border-radius:50%; background:#C7CDD4; }
.status-dot.on{ background:var(--brand-light); box-shadow:0 0 0 3px rgba(63,198,184,0.2); }
.machine-name{ font-size:13px; font-weight:600; }
.machine-value{ font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; }
.machine-label{ font-size:11.5px; color:var(--ink-soft); margin-top:2px; }

.charts-row{ display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
.chart-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; }
.chart-title{ font-size:13px; font-weight:600; color:var(--ink-soft); margin-bottom:8px; }

.table-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 20px; overflow-x:auto; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:12px 8px; color:var(--ink-soft); font-weight:600; font-size:12px; border-bottom:1px solid var(--line); }
td{ padding:11px 8px; border-bottom:1px solid var(--surface); }
tr:last-child td{ border-bottom:none; }
.mono{ font-family:'Space Grotesk',sans-serif; font-weight:600; color:var(--brand-dark); }
.muted{ color:var(--ink-soft); }

.hint{ color:var(--ink-soft); font-size:13.5px; padding:16px 0; }
.error-msg{ color:var(--alert); }

@media (max-width:900px){
  .kpi-row{ grid-template-columns:repeat(2,1fr); }
  .charts-row{ grid-template-columns:1fr; }
}
@media (max-width:560px){
  .kpi-row{ grid-template-columns:1fr; }
  .dash-main{ padding:20px 16px 40px 16px; }
}
`;
