"use client";

import { useEffect, useState } from "react";
import { TIPO_PARADA_LABEL } from "@/lib/constantes";

const fmt = (n, d = 0) =>
  n == null ? "—" : Number(n).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const cop = (n) => (n == null ? "—" : Number(n).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }));
const hora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }) : "—";
const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

export default function TrazabilidadPanel() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(texto) {
    try {
      const r = await fetch(`/api/trazabilidad?q=${encodeURIComponent(texto)}`);
      const d = await r.json();
      setResultados(d.resultados || []);
    } catch {
      setError("No se pudo buscar.");
    }
  }

  async function abrir(codigo) {
    setCargando(true);
    setError("");
    setDetalle(null);
    try {
      const r = await fetch(`/api/trazabilidad?codigo=${encodeURIComponent(codigo)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al consultar.");
      setDetalle(d);
      window.history.replaceState(null, "", `/trazabilidad?codigo=${encodeURIComponent(codigo)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("codigo");
    if (c) { setQ(c); abrir(c); }
    buscar("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const l = detalle?.lote;

  // Línea de tiempo: lote, consumo MP, merma y paradas ordenados por hora
  const eventos = [];
  if (l) {
    (detalle.movimientos || []).forEach((m) =>
      eventos.push({ t: m.creado_en, tipo: "mp", titulo: "Salida de materia prima", det: `${fmt(m.cantidad_kg, 1)} kg de ${l.materia_prima?.nombre || "MP"}` }));
    eventos.push({ t: l.creado_en, tipo: "lote", titulo: "Lote registrado", det: `${fmt(l.cantidad_botellas_terminadas)} botellas terminadas, ${l.operario ? "por " + l.operario : ""}` });
    detalle.merma.forEach((m) =>
      eventos.push({ t: m.creado_en, tipo: m.tipo === "producto_danado" ? "danado" : "merma",
        titulo: (m.tipo === "producto_danado" ? "Producto dañado" : "Merma") + ` — ${m.etapa === "preforma" ? "preforma" : "soplado"}`,
        det: `${fmt(m.peso_kg, 2)} kg${m.observacion ? " · " + m.observacion : ""}` }));
    eventos.sort((a, b) => new Date(a.t) - new Date(b.t));
  }

  return (
    <>
      <style>{css}</style>
      <div className="tz">
        <div className="tz-head no-print">
          <h1>Trazabilidad de lotes</h1>
          <p>Escribe el código del lote (o parte de él) para ver su historia completa.</p>
          <input
            className="tz-input" placeholder="Ej. Mol01-07092615" value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && q.trim() && abrir(q.trim())}
          />
          <div className="tz-chips">
            {resultados.map((r) => (
              <button key={r.codigo_lote} className={"chip" + (l?.codigo_lote === r.codigo_lote ? " on" : "")} onClick={() => { setQ(r.codigo_lote); abrir(r.codigo_lote); }}>
                <b>{r.codigo_lote}</b>
                <span>{r.maquinas?.nombre || "—"} · {r.fecha}</span>
              </button>
            ))}
            {resultados.length === 0 && <span className="muted">Sin coincidencias.</span>}
          </div>
        </div>

        {error && <p className="err">{error}</p>}
        {cargando && <p className="muted">Consultando…</p>}

        {l && (
          <div className="tz-body">
            <div className="tz-title">
              <div>
                <div className="code">{l.codigo_lote}</div>
                <div className="muted">{l.presentaciones?.nombre} · {l.maquinas?.nombre} · {l.turnos?.nombre} · {l.fecha}</div>
              </div>
              <button className="btn no-print" onClick={() => window.print()}>Imprimir ficha</button>
            </div>

            <div className="stats">
              <Stat label="Materia prima" v={fmt(l.cantidad_materia_prima_kg, 1)} u="kg" s={l.materia_prima?.nombre} />
              <Stat label="Preformas" v={fmt(l.cantidad_preformas)} s={`${fmt(detalle.resumen.preformasNoConvertidas)} sin convertir`} />
              <Stat label="Botellas terminadas" v={fmt(l.cantidad_botellas_terminadas)} s={detalle.resumen.rendimientoPct != null ? fmt(detalle.resumen.rendimientoPct, 1) + " % de rendimiento" : ""} />
              <Stat label="Merma + dañado" v={fmt(detalle.resumen.mermaKg + detalle.resumen.danadoKg, 2)} u="kg"
                s={detalle.resumen.mermaPctMp != null ? fmt(detalle.resumen.mermaPctMp, 1) + " % de la MP" : ""}
                warn={detalle.resumen.mermaPctMp >= 3} />
            </div>

            {detalle.costos && (
              <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                <Stat label="Costo de materia prima" v={cop(detalle.costos.costoMp)} s={detalle.costos.completo ? "" : "Parcial: hay kg sin precio registrado"} />
                <Stat label="Costo de MP por botella" v={detalle.costos.porBotella == null ? "—" : cop(detalle.costos.porBotella)} />
                <Stat label="Pérdida por merma y dañado" v={cop(detalle.costos.perdida)} warn={detalle.costos.perdida > 0} />
              </div>
            )}

            <div className="cols">
              <div className="card">
                <h3>Origen y proceso</h3>
                <dl>
                  <dt>Molde</dt><dd>{l.moldes ? `${l.moldes.codigo} — ${l.moldes.nombre}` : "—"}</dd>
                  <dt>Máquina</dt><dd>{l.maquinas?.nombre || "—"}</dd>
                  <dt>Turno</dt><dd>{l.turnos?.nombre || "—"} ({String(l.turnos?.hora_inicio || "").slice(0, 5)}–{String(l.turnos?.hora_fin || "").slice(0, 5)})</dd>
                  <dt>Operario</dt><dd>{l.operario || "—"}</dd>
                  <dt>Registrado</dt><dd>{fechaHora(l.creado_en)}</dd>
                  <dt>Materia prima</dt><dd>{l.materia_prima?.nombre || "—"}</dd>
                  <dt>Peso preforma</dt><dd>{l.presentaciones?.peso_preforma_g ? l.presentaciones.peso_preforma_g + " g" : "—"}</dd>
                </dl>
              </div>

              <div className="card">
                <h3>Línea de tiempo</h3>
                <ul className="timeline">
                  {eventos.map((e, i) => (
                    <li key={i} className={e.tipo}>
                      <span className="dot" />
                      <div><b>{e.titulo}</b><div className="muted">{e.det}</div><div className="time">{fechaHora(e.t)}</div></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card">
              <h3>Origen de la materia prima</h3>
              {(detalle.origen || []).length === 0 ? (
                <p className="muted">Sin información de origen: este lote se registró antes de usar recepciones de materia prima, o no había entradas con saldo.</p>
              ) : (
                <table>
                  <thead><tr><th>Proveedor</th><th>Lote proveedor</th><th>Factura</th><th>Recibido</th><th>Kg usados</th>{detalle.costos && <th>Precio/kg</th>}</tr></thead>
                  <tbody>
                    {detalle.origen.map((o, i) => (
                      <tr key={i}>
                        <td>{o.recepciones_mp?.proveedores?.nombre || "—"}</td>
                        <td>{o.recepciones_mp?.lote_proveedor || "—"}</td>
                        <td>{o.recepciones_mp?.factura || "—"}</td>
                        <td>{o.recepciones_mp?.fecha || "—"}</td>
                        <td>{fmt(o.cantidad_kg, 1)}</td>
                        {detalle.costos && <td>{cop(o.recepciones_mp?.precio_kg)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3>Paradas de la máquina en ese turno</h3>
              <p className="muted small">Contexto: paradas de {l.maquinas?.nombre} durante el turno del lote. Pueden haber afectado su producción.</p>
              {detalle.paradas.length === 0 ? (
                <p className="muted">No se registraron paradas.</p>
              ) : (
                <table>
                  <thead><tr><th>Causa</th><th>Inicio</th><th>Fin</th><th>Minutos</th><th>Observación</th></tr></thead>
                  <tbody>
                    {detalle.paradas.map((p, i) => (
                      <tr key={i}>
                        <td>{TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada}</td>
                        <td>{hora(p.hora_inicio)}</td>
                        <td>{p.hora_fin ? hora(p.hora_fin) : "en curso"}</td>
                        <td>{p.duracion_minutos ?? "—"}</td>
                        <td className="muted">{p.observacion || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, v, u, s, warn }) {
  return (
    <div className={"stat" + (warn ? " warn" : "")}>
      <div className="muted small">{label}</div>
      <div className="val">{v}{u ? <small> {u}</small> : null}</div>
      {s ? <div className="muted small">{s}</div> : null}
    </div>
  );
}

const css = `
.tz{ font-family:'Inter',sans-serif; color:#16211D; padding:28px 32px 60px; max-width:1100px; margin:0 auto; }
.tz h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:0 0 4px; }
.tz-head p{ color:#5B6B7A; margin:0 0 14px; font-size:14px; }
.tz-input{ width:100%; max-width:480px; padding:12px 14px; border:1px solid #D5DBE2; border-radius:8px; font:inherit; font-family:'Space Grotesk',sans-serif; font-size:15px; }
.tz-input:focus{ outline:2px solid #2A6FE0; border-color:transparent; }
.tz-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.chip{ background:#fff; border:1px solid #E2E6EA; border-radius:8px; padding:8px 12px; text-align:left; cursor:pointer; font:inherit; display:flex; flex-direction:column; gap:2px; }
.chip b{ font-family:'Space Grotesk',sans-serif; font-size:13px; color:#123B7A; }
.chip span{ font-size:11.5px; color:#5B6B7A; }
.chip:hover,.chip.on{ border-color:#2A6FE0; background:#F0F5FE; }
.muted{ color:#5B6B7A; } .small{ font-size:12px; } .err{ color:#C0392B; }
.tz-body{ margin-top:26px; display:flex; flex-direction:column; gap:16px; }
.tz-title{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
.code{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; color:#123B7A; }
.btn{ background:#123B7A; color:#fff; border:none; border-radius:8px; padding:10px 16px; font:inherit; font-size:13.5px; cursor:pointer; }
.stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.stat{ background:#fff; border:1px solid #E2E6EA; border-bottom:3px solid #2A6FE0; border-radius:8px; padding:14px 16px; }
.stat.warn{ border-bottom-color:#C0392B; } .stat.warn .val{ color:#C0392B; }
.stat .val{ font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; margin:4px 0; } .stat small{ font-size:13px; font-weight:500; color:#5B6B7A; }
.cols{ display:grid; grid-template-columns:1fr 1.2fr; gap:16px; }
.card{ background:#fff; border:1px solid #E2E6EA; border-radius:8px; padding:18px 20px; overflow-x:auto; }
.card h3{ font-family:'Space Grotesk',sans-serif; font-size:14px; margin:0 0 12px; }
dl{ display:grid; grid-template-columns:120px 1fr; gap:8px 12px; margin:0; font-size:13.5px; } dt{ color:#5B6B7A; } dd{ margin:0; font-weight:500; }
.timeline{ list-style:none; margin:0; padding:0 0 0 6px; border-left:2px solid #E2E6EA; }
.timeline li{ position:relative; padding:0 0 16px 18px; font-size:13.5px; }
.timeline .dot{ position:absolute; left:-7px; top:4px; width:12px; height:12px; border-radius:50%; background:#2A6FE0; border:2px solid #fff; }
.timeline .mp .dot{ background:#3FC6B8; } .timeline .merma .dot{ background:#E8823A; } .timeline .danado .dot{ background:#C0392B; }
.time{ font-size:11.5px; color:#8B98A8; margin-top:2px; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; } th{ text-align:left; padding:10px 8px; color:#5B6B7A; font-size:12px; border-bottom:1px solid #E2E6EA; } td{ padding:10px 8px; border-bottom:1px solid #F4F6F8; }
@media (max-width:900px){ .stats[style]{ grid-template-columns:1fr !important; } .stats{ grid-template-columns:repeat(2,1fr); } .cols{ grid-template-columns:1fr; } .tz{ padding:20px 16px 40px; } }
@media print{ .no-print, .sidebar, aside, header, .topbar{ display:none !important; } .tz{ padding:0; } }
`;
