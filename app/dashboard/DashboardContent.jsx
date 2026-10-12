"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line,
} from "recharts";
import { TIPO_PARADA_LABEL } from "@/lib/constantes";

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
              <AlertasPanel alertas={data.alertas || []} />

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

              <OeeSection oee={data.oee} />
              <CostosSection costos={data.costos} />

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

              <div className="charts-row" style={{ gridTemplateColumns: "1fr" }}>
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

              </div>

              <div className="section-title">Análisis de Pareto — últimos 7 días</div>
              <div className="charts-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <ParetoChart
                  titulo="Paradas por causa (minutos)"
                  unidad="min"
                  color="#3FC6B8"
                  datos={paradasChart.map((p) => ({ nombre: p.tipo, valor: p.minutos }))}
                  vacio="Sin paradas registradas en este período."
                />
                <ParetoChart
                  titulo="Merma y producto dañado por máquina (kg)"
                  unidad="kg"
                  color="#E8823A"
                  datos={(data.mermaPorMaquina || []).map((m) => ({ nombre: m.nombre, valor: m.kg }))}
                  vacio="Sin merma registrada en este período."
                />
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
                          <td className="mono"><a href={`/trazabilidad?codigo=${encodeURIComponent(l.codigo_lote)}`} style={{ color: "inherit", textDecoration: "none", borderBottom: "1px dashed #8B98A8" }}>{l.codigo_lote}</a></td>
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

function ParetoChart({ titulo, unidad, color, datos, vacio }) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  let acum = 0;
  const filas = datos.map((d) => {
    acum += d.valor;
    return { ...d, acumulado: total > 0 ? Math.round((acum / total) * 100) : 0 };
  });
  const vitales = filas.findIndex((f) => f.acumulado >= 80) + 1; // causas que explican ~80 %
  return (
    <div className="chart-card">
      <div className="chart-title">{titulo}</div>
      {filas.length === 0 ? (
        <p className="hint">{vacio}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={filas} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEDF2" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#5B6B7A" }} axisLine={false} tickLine={false} interval={0} />
              <YAxis yAxisId="v" tick={{ fontSize: 12, fill: "#8B98A8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tickFormatter={(v) => v + "%"} tick={{ fontSize: 12, fill: "#8B98A8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid #E2E6EA", fontSize: 13 }}
                formatter={(v, n) => (n === "acumulado" ? [v + "%", "Acumulado"] : [v + " " + unidad, "Valor"])}
              />
              <Bar yAxisId="v" dataKey="valor" fill={color} radius={[4, 4, 0, 0]} />
              <Line yAxisId="p" type="monotone" dataKey="acumulado" stroke="#123B7A" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="oee-note">
            {vitales === 1 ? "La primera categoría explica" : `Las primeras ${vitales} categorías explican`} el {filas[vitales - 1]?.acumulado}% del total
            ({total.toLocaleString("es-CO", { maximumFractionDigits: 1 })} {unidad}). Ahí está el mayor potencial de mejora.
          </p>
        </>
      )}
    </div>
  );
}

const cop = (n) => (n == null ? "—" : Number(n).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }));

function CostosSection({ costos }) {
  if (!costos) return null;
  return (
    <>
      <div className="section-title">Costos de materia prima — últimos 7 días</div>
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi-card"><div className="kpi-body"><div className="kpi-label">Costo de materia prima consumida</div><div className="kpi-value">{cop(costos.costoMp)}</div></div></div>
        <div className="kpi-card alert"><div className="kpi-body"><div className="kpi-label">Pérdida por merma y producto dañado</div><div className="kpi-value">{cop(costos.perdidaMerma)}</div><div className="kpi-sub">Kg perdidos × precio de la materia prima del lote</div></div></div>
        <div className="kpi-card"><div className="kpi-body"><div className="kpi-label">Costo de MP por botella</div><div className="kpi-value">{costos.costoPorBotella == null ? "—" : cop(costos.costoPorBotella)}</div></div></div>
      </div>
      {costos.coberturaPct !== null && costos.coberturaPct < 100 && (
        <p className="oee-note">Cobertura de precios: {costos.coberturaPct}% de la materia prima consumida tiene precio registrado. Registra el precio por kg en cada recepción para completar el cálculo.</p>
      )}
    </>
  );
}

const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
function colorOee(x) {
  if (x == null) return "#C7CDD4";
  if (x >= 0.85) return "#3FC6B8";   // clase mundial
  if (x >= 0.6) return "#2A6FE0";    // aceptable
  if (x >= 0.4) return "#E8823A";    // por mejorar
  return "#C0392B";                  // crítico
}

function Gauge({ valor }) {
  const r = 52, c = 2 * Math.PI * r;
  const v = valor == null ? 0 : Math.max(0, Math.min(1, valor));
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" className="gauge">
      <circle cx="66" cy="66" r={r} fill="none" stroke="#EAEDF2" strokeWidth="12" />
      <circle
        cx="66" cy="66" r={r} fill="none" stroke={colorOee(valor)} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 66 66)"
        style={{ transition: "stroke-dashoffset 0.9s ease" }}
      />
      <text x="66" y="68" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="28" fontWeight="700" fill="#16211D">{pct(valor)}</text>
      <text x="66" y="88" textAnchor="middle" fontSize="11" fill="#5B6B7A">OEE</text>
    </svg>
  );
}

function Factor({ label, valor }) {
  return (
    <div className="factor">
      <div className="factor-top"><span>{label}</span><b>{pct(valor)}</b></div>
      <div className="factor-bar"><div style={{ width: (valor == null ? 0 : valor * 100) + "%", background: colorOee(valor) }} /></div>
    </div>
  );
}

function OeeSection({ oee }) {
  const g = oee?.global;
  const filas = (oee?.maquinas || []);
  return (
    <>
      <div className="section-title">Eficiencia global de equipos (OEE) — últimos 7 días</div>
      {!g ? (
        <div className="table-card"><p className="hint">Aún no hay datos suficientes. Revisa que las máquinas tengan capacidad teórica por hora y que haya lotes registrados.</p></div>
      ) : (
        <div className="oee-grid">
          <div className="chart-card oee-main">
            <Gauge valor={g.oee} />
            <div className="oee-factors">
              <Factor label="Disponibilidad" valor={g.disponibilidad} />
              <Factor label="Rendimiento" valor={g.rendimiento} />
              <Factor label="Calidad" valor={g.calidad} />
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-title">OEE por máquina</div>
            {filas.map((f) => (
              <div key={f.id} className="oee-row">
                <span className="oee-name">{f.nombre}</span>
                <div className="factor-bar grow"><div style={{ width: (f.oee == null ? 0 : f.oee * 100) + "%", background: colorOee(f.oee) }} /></div>
                <b className="oee-val">{f.sinDatos ? "sin datos" : pct(f.oee)}</b>
              </div>
            ))}
            <p className="oee-note">Meta de referencia: 85 % (clase mundial). OEE = Disponibilidad × Rendimiento × Calidad.</p>
          </div>
        </div>
      )}
    </>
  );
}

function AlertasPanel({ alertas }) {
  const [abierto, setAbierto] = useState(true);
  if (!alertas.length)
    return <div className="alert-ok">Sin alertas activas. Todo dentro de los parámetros.</div>;
  const crit = alertas.filter((a) => a.nivel === "critica").length;
  return (
    <div className="alert-panel">
      <button className="alert-head" onClick={() => setAbierto(!abierto)}>
        <span><b>{alertas.length}</b> alerta(s) activa(s){crit > 0 ? ` — ${crit} crítica(s)` : ""}</span>
        <span>{abierto ? "Ocultar" : "Ver"}</span>
      </button>
      {abierto && (
        <ul>
          {alertas.map((a, i) => (
            <li key={i} className={"alert-item " + a.nivel}>
              <span className="alert-bar" />
              <div><div className="alert-title">{a.titulo}</div><div className="alert-detail">{a.detalle}</div></div>
            </li>
          ))}
        </ul>
      )}
    </div>
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

.alert-panel{ background:#fff; border:1px solid var(--line); border-radius:8px; margin-bottom:20px; overflow:hidden; }
.alert-head{ width:100%; display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:#FBF3EA; border:none; cursor:pointer; font:inherit; font-size:13.5px; color:var(--ink); }
.alert-panel ul{ list-style:none; margin:0; padding:6px 0; max-height:260px; overflow-y:auto; }
.alert-item{ display:flex; gap:12px; padding:9px 18px; }
.alert-bar{ width:4px; border-radius:2px; background:#8B98A8; flex-shrink:0; }
.alert-item.critica .alert-bar{ background:#C0392B; }
.alert-item.aviso .alert-bar{ background:#E8823A; }
.alert-item.info .alert-bar{ background:#2A6FE0; }
.alert-title{ font-size:13.5px; font-weight:600; }
.alert-detail{ font-size:12px; color:var(--ink-soft); margin-top:2px; }
.alert-ok{ background:#EAF7F5; color:#1B6F66; border:1px solid #CDEBE6; border-radius:8px; padding:10px 18px; font-size:13px; margin-bottom:20px; }

.oee-grid{ display:grid; grid-template-columns:1fr 1.2fr; gap:16px; }
.oee-main{ display:flex; align-items:center; gap:24px; }
.oee-factors{ flex:1; display:flex; flex-direction:column; gap:14px; }
.factor-top{ display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); margin-bottom:5px; }
.factor-top b{ color:var(--ink); }
.factor-bar{ height:8px; background:#EAEDF2; border-radius:4px; overflow:hidden; }
.factor-bar > div{ height:100%; border-radius:4px; transition:width 0.9s ease; }
.factor-bar.grow{ flex:1; }
.oee-row{ display:flex; align-items:center; gap:12px; padding:7px 0; }
.oee-name{ width:110px; font-size:13px; font-weight:600; }
.oee-val{ width:64px; text-align:right; font-size:13px; }
.oee-note{ font-size:11.5px; color:var(--ink-soft); margin:12px 0 0 0; }

.hint{ color:var(--ink-soft); font-size:13.5px; padding:16px 0; }
.error-msg{ color:var(--alert); }

@media (max-width:900px){
  .kpi-row{ grid-template-columns:repeat(2,1fr); }
  .charts-row{ grid-template-columns:1fr; }
  .oee-grid{ grid-template-columns:1fr; }
  .kpi-row[style]{ grid-template-columns:1fr !important; }
  .charts-row{ grid-template-columns:1fr !important; }
}
@media (max-width:560px){
  .oee-main{ flex-direction:column; align-items:stretch; }
  .gauge{ align-self:center; }
  .kpi-row{ grid-template-columns:1fr; }
  .dash-main{ padding:20px 16px 40px 16px; }
}
`;
