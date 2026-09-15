"use client";

import { useEffect, useState } from "react";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function MetasPanel() {
  const [catalogos, setCatalogos] = useState(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ maquina_id: "", turno_id: "", meta_botellas: "" });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    fetch("/api/catalogos")
      .then((r) => r.json())
      .then(setCatalogos)
      .catch(() => setError("No se pudieron cargar los catálogos."));
  }, []);

  useEffect(() => {
    cargarMetas(fecha);
  }, [fecha]);

  function cargarMetas(f) {
    setLoading(true);
    fetch(`/api/metas?fecha=${f}`)
      .then((r) => r.json())
      .then((data) => setMetas(data.metas || []))
      .catch(() => setError("No se pudieron cargar las metas."))
      .finally(() => setLoading(false));
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const formValido = form.maquina_id && form.turno_id && Number(form.meta_botellas) > 0;

  async function guardarMeta(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");
    try {
      const res = await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maquina_id: Number(form.maquina_id),
          turno_id: Number(form.turno_id),
          fecha,
          meta_botellas: Number(form.meta_botellas),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorForm(data.error || "No se pudo guardar la meta.");
        setGuardando(false);
        return;
      }
      setForm({ maquina_id: "", turno_id: "", meta_botellas: "" });
      cargarMetas(fecha);
    } catch {
      setErrorForm("Error de conexión.");
    }
    setGuardando(false);
  }

  async function borrarMeta(id) {
    setBorrandoId(id);
    try {
      await fetch(`/api/metas/${id}`, { method: "DELETE" });
      cargarMetas(fecha);
    } catch {
      setError("No se pudo eliminar la meta.");
    }
    setBorrandoId(null);
  }

  const totalMeta = metas.reduce((s, m) => s + m.meta_botellas, 0);
  const totalProducido = metas.reduce((s, m) => s + m.producido, 0);

  return (
    <>
      <style>{css}</style>
      <div className="metas">
        {error && <p className="error-msg">{error}</p>}

        <div className="section-title">Definir meta</div>
        <form className="start-card" onSubmit={guardarMeta}>
          <div className="field-grid">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            {catalogos && (
              <>
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
              </>
            )}
            <div className="field">
              <label>Meta (botellas)</label>
              <input
                type="number"
                min="0"
                value={form.meta_botellas}
                onChange={(e) => update("meta_botellas", e.target.value)}
              />
            </div>
          </div>
          {errorForm && <p className="error-msg">{errorForm}</p>}
          <button className="btn-primary" disabled={!formValido || guardando}>
            {guardando ? "Guardando..." : "Guardar meta"}
          </button>
          <span className="hint-inline">Si ya existe una meta para esa máquina/turno/fecha, se actualiza en vez de duplicarse.</span>
        </form>

        <div className="section-title-row">
          <div className="section-title">Metas del día</div>
          <input type="date" className="date-filter" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        {loading ? (
          <p className="hint">Cargando...</p>
        ) : metas.length === 0 ? (
          <p className="hint">No hay metas definidas para esta fecha.</p>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Máquina</th>
                  <th>Turno</th>
                  <th>Meta</th>
                  <th>Producido</th>
                  <th>Cumplimiento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {metas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.maquinas?.nombre}</td>
                    <td>{m.turnos?.nombre}</td>
                    <td>{m.meta_botellas}</td>
                    <td>{m.producido}</td>
                    <td>
                      <div className="bar-wrap">
                        <div className="bar-bg">
                          <div
                            className={"bar-fill" + (m.porcentaje >= 100 ? " full" : "")}
                            style={{ width: Math.min(100, m.porcentaje) + "%" }}
                          />
                        </div>
                        <span className={"pct" + (m.porcentaje >= 100 ? " full" : "")}>{m.porcentaje}%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => borrarMeta(m.id)}
                        disabled={borrandoId === m.id}
                        title="Eliminar meta"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}><b>Total del día</b></td>
                  <td><b>{totalMeta}</b></td>
                  <td><b>{totalProducido}</b></td>
                  <td colSpan={2}>
                    <b>{totalMeta > 0 ? Math.round((totalProducido / totalMeta) * 100) : 0}%</b>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
.metas{ padding:28px 32px 60px 32px; max-width:1100px; margin:0 auto; font-family:'Inter',sans-serif; color:var(--ink); }
.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin:28px 0 14px 0; }
.section-title:first-child, .section-title-row:first-child .section-title{ margin-top:0; }
.section-title-row{ display:flex; align-items:center; justify-content:space-between; margin-top:28px; }
.date-filter{ padding:8px 10px; border:1.5px solid var(--line); border-radius:4px; font-size:13px; font-family:'Inter',sans-serif; }

.start-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; }
.field-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
.field label{ display:block; font-size:12.5px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; }
.field select, .field input{ width:100%; padding:10px 11px; font-size:14px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; color:var(--ink); }
.field select:focus, .field input:focus{ border-color:var(--brand); }

.btn-primary{ padding:11px 22px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }
.hint-inline{ display:block; margin-top:10px; font-size:12px; color:var(--ink-soft); }

.table-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 20px; overflow-x:auto; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:12px 8px; color:var(--ink-soft); font-weight:600; font-size:12px; border-bottom:1px solid var(--line); }
td{ padding:11px 8px; border-bottom:1px solid var(--surface); }
tr:last-child td{ border-bottom:none; }
tfoot td{ border-top:1.5px solid var(--line); border-bottom:none; padding-top:14px; }

.bar-wrap{ display:flex; align-items:center; gap:8px; min-width:140px; }
.bar-bg{ flex:1; height:7px; background:var(--surface); border-radius:4px; overflow:hidden; }
.bar-fill{ height:100%; background:var(--brand); border-radius:4px; transition:width 0.3s ease; }
.bar-fill.full{ background:var(--brand-light); }
.pct{ font-size:12px; font-weight:600; color:var(--ink-soft); width:36px; }
.pct.full{ color:var(--brand-light); }

.delete-btn{ background:none; border:none; color:var(--ink-soft); cursor:pointer; font-size:14px; padding:4px 8px; border-radius:4px; }
.delete-btn:hover{ background:#FBEAE8; color:var(--alert); }
.delete-btn:disabled{ opacity:0.5; cursor:not-allowed; }

.hint{ color:var(--ink-soft); font-size:14px; }
.error-msg{ color:var(--alert); font-size:13.5px; margin:8px 0; }

@media (max-width:700px){
  .field-grid{ grid-template-columns:1fr 1fr; }
  .metas{ padding:20px 16px 40px 16px; }
}
@media (max-width:460px){
  .field-grid{ grid-template-columns:1fr; }
}
`;
