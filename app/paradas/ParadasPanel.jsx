"use client";

import { useEffect, useState } from "react";
import { TIPOS_PARADA, TIPO_PARADA_LABEL } from "@/lib/constantes";

function duracionDesde(iso, ahora) {
  const segTotal = Math.floor((ahora - new Date(iso).getTime()) / 1000);
  const h = Math.floor(segTotal / 3600);
  const m = Math.floor((segTotal % 3600) / 60);
  const s = segTotal % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
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

export default function ParadasPanel() {
  const [catalogos, setCatalogos] = useState(null);
  const [activas, setActivas] = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(Date.now());

  const [form, setForm] = useState({ maquina_id: "", turno_id: "", tipo_parada: "", observacion: "" });
  const [iniciando, setIniciando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [finalizandoId, setFinalizandoId] = useState(null);

  useEffect(() => {
    cargarTodo();
    const tick = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  function cargarTodo() {
    setLoading(true);
    Promise.all([
      fetch("/api/catalogos").then((r) => r.json()),
      fetch("/api/paradas").then((r) => r.json()),
    ])
      .then(([cat, par]) => {
        setCatalogos(cat);
        setActivas(par.activas || []);
        setRecientes(par.recientes || []);
      })
      .catch(() => setError("No se pudo cargar la información."))
      .finally(() => setLoading(false));
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const formValido = form.maquina_id && form.turno_id && form.tipo_parada;

  async function iniciarParada(e) {
    e.preventDefault();
    setIniciando(true);
    setErrorForm("");
    try {
      const res = await fetch("/api/paradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maquina_id: Number(form.maquina_id),
          turno_id: Number(form.turno_id),
          tipo_parada: form.tipo_parada,
          observacion: form.observacion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorForm(data.error || "No se pudo iniciar la parada.");
        setIniciando(false);
        return;
      }
      setForm({ maquina_id: "", turno_id: "", tipo_parada: "", observacion: "" });
      cargarTodo();
    } catch {
      setErrorForm("Error de conexión.");
    }
    setIniciando(false);
  }

  async function finalizarParada(id) {
    setFinalizandoId(id);
    try {
      await fetch(`/api/paradas/${id}`, { method: "PATCH" });
      cargarTodo();
    } catch {
      setError("No se pudo finalizar la parada.");
    }
    setFinalizandoId(null);
  }

  return (
    <>
      <style>{css}</style>
      <div className="paradas">
        {loading && <p className="hint">Cargando...</p>}
        {error && <p className="error-msg">{error}</p>}

        {!loading && catalogos && (
          <>
            <div className="section-title">Iniciar parada</div>
            <form className="start-card" onSubmit={iniciarParada}>
              <div className="field-grid">
                <div className="field">
                  <label>Máquina</label>
                  <select value={form.maquina_id} onChange={(e) => update("maquina_id", e.target.value)}>
                    <option value="">Selecciona</option>
                    {catalogos.maquinas.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Turno</label>
                  <select value={form.turno_id} onChange={(e) => update("turno_id", e.target.value)}>
                    <option value="">Selecciona</option>
                    {catalogos.turnos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tipo de parada</label>
                  <select value={form.tipo_parada} onChange={(e) => update("tipo_parada", e.target.value)}>
                    <option value="">Selecciona</option>
                    {TIPOS_PARADA.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Observación (opcional)</label>
                  <input
                    type="text"
                    value={form.observacion}
                    onChange={(e) => update("observacion", e.target.value)}
                    placeholder="Ej: fuga de aire en la válvula"
                  />
                </div>
              </div>
              {errorForm && <p className="error-msg">{errorForm}</p>}
              <button className="btn-primary" disabled={!formValido || iniciando}>
                {iniciando ? "Iniciando..." : "Iniciar parada"}
              </button>
            </form>

            <div className="section-title">Paradas activas</div>
            {activas.length === 0 ? (
              <p className="hint">No hay paradas activas en este momento.</p>
            ) : (
              <div className="activas-row">
                {activas.map((p) => (
                  <div key={p.id} className="activa-card">
                    <div className="activa-top">
                      <span className="pulse-dot" />
                      <span className="activa-maquina">{p.maquinas?.nombre}</span>
                    </div>
                    <div className="activa-timer">{duracionDesde(p.hora_inicio, ahora)}</div>
                    <div className="activa-tipo">{TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada}</div>
                    {p.observacion && <div className="activa-obs">{p.observacion}</div>}
                    <button
                      className="btn-secondary"
                      onClick={() => finalizarParada(p.id)}
                      disabled={finalizandoId === p.id}
                    >
                      {finalizandoId === p.id ? "Finalizando..." : "Finalizar parada"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="section-title">Historial reciente</div>
            <div className="table-card">
              {recientes.length === 0 ? (
                <p className="hint">Todavía no hay paradas finalizadas.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Máquina</th>
                      <th>Tipo</th>
                      <th>Duración</th>
                      <th>Cuándo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((p) => (
                      <tr key={p.id}>
                        <td>{p.maquinas?.nombre}</td>
                        <td>{TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada}</td>
                        <td>{p.duracion_minutos} min</td>
                        <td className="muted">{tiempoDesde(p.hora_fin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
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
.paradas{ padding:28px 32px 60px 32px; max-width:1100px; margin:0 auto; font-family:'Inter',sans-serif; color:var(--ink); }
.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin:28px 0 14px 0; }
.section-title:first-child{ margin-top:0; }

.start-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; }
.field-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
.field label{ display:block; font-size:12.5px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; }
.field select, .field input{ width:100%; padding:10px 11px; font-size:14px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; color:var(--ink); }
.field select:focus, .field input:focus{ border-color:var(--brand); }

.btn-primary{ padding:11px 22px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }
.btn-secondary{ margin-top:14px; width:100%; padding:9px; background:#fff; color:var(--alert); border:1.5px solid #F3D4D0; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer; }
.btn-secondary:hover{ background:#FBEAE8; }
.btn-secondary:disabled{ opacity:0.6; cursor:not-allowed; }

.activas-row{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
.activa-card{ background:#fff; border:1px solid #F3D4D0; border-radius:8px; padding:16px; }
.activa-top{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.pulse-dot{ width:8px; height:8px; border-radius:50%; background:var(--alert); animation:pulse 1.4s infinite; }
@keyframes pulse{ 0%{box-shadow:0 0 0 0 rgba(192,57,43,0.4);} 70%{box-shadow:0 0 0 7px rgba(192,57,43,0);} 100%{box-shadow:0 0 0 0 rgba(192,57,43,0);} }
.activa-maquina{ font-size:13.5px; font-weight:600; }
.activa-timer{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; color:var(--alert); font-variant-numeric:tabular-nums; }
.activa-tipo{ font-size:12.5px; color:var(--ink-soft); margin-top:4px; }
.activa-obs{ font-size:12px; color:var(--ink-soft); margin-top:6px; font-style:italic; }

.table-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 20px; overflow-x:auto; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:12px 8px; color:var(--ink-soft); font-weight:600; font-size:12px; border-bottom:1px solid var(--line); }
td{ padding:11px 8px; border-bottom:1px solid var(--surface); }
tr:last-child td{ border-bottom:none; }
.muted{ color:var(--ink-soft); }

.hint{ color:var(--ink-soft); font-size:14px; }
.error-msg{ color:var(--alert); font-size:13.5px; margin:8px 0; }

@media (max-width:700px){
  .field-grid{ grid-template-columns:1fr 1fr; }
  .paradas{ padding:20px 16px 40px 16px; }
}
@media (max-width:460px){
  .field-grid{ grid-template-columns:1fr; }
}
`;
