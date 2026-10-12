"use client";

import { useEffect, useState } from "react";

const fmt = (n, d = 1) => Number(n ?? 0).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const vacio = { materia_prima_id: "", proveedor_id: "", lote_proveedor: "", factura: "", cantidad_kg: "", precio_kg: "", observacion: "" };

export default function RecepcionesPanel({ puedeRegistrar }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function cargar() {
    fetch("/api/recepciones")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("No se pudo cargar."));
  }
  useEffect(cargar, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valido = form.materia_prima_id && form.proveedor_id && Number(form.cantidad_kg) > 0;

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setError(""); setOk("");
    try {
      const res = await fetch("/api/recepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, materia_prima_id: Number(form.materia_prima_id), proveedor_id: Number(form.proveedor_id) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      setForm(vacio);
      setOk(`Recepción #${d.id} registrada. El inventario ya se actualizó.`);
      cargar();
    } catch (err) {
      setError(err.message);
    }
    setGuardando(false);
  }

  return (
    <>
      <style>{css}</style>
      <div className="rc">
        <h1>Recepción de materia prima</h1>
        <p className="sub">Cada entrada suma al inventario y queda ligada a su proveedor. Los lotes consumen las entradas más antiguas primero (FIFO), así sabes de qué proveedor salió cada botella.</p>

        {puedeRegistrar ? (
          <form className="card" onSubmit={guardar}>
            <div className="grid">
              <div className="field">
                <label>Materia prima</label>
                <select value={form.materia_prima_id} onChange={(e) => set("materia_prima_id", e.target.value)}>
                  <option value="">Selecciona</option>
                  {data?.materiaPrima.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Proveedor</label>
                <select value={form.proveedor_id} onChange={(e) => set("proveedor_id", e.target.value)}>
                  <option value="">Selecciona</option>
                  {data?.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {data && data.proveedores.length === 0 && <span className="hint">No hay proveedores. Un administrador debe crearlos en Admin. Proveedores.</span>}
              </div>
              <div className="field">
                <label>Cantidad recibida (kg)</label>
                <input type="number" min="0" step="0.1" value={form.cantidad_kg} onChange={(e) => set("cantidad_kg", e.target.value)} />
              </div>
              <div className="field">
                <label>Precio por kg (COP)</label>
                <input type="number" min="0" step="1" value={form.precio_kg} onChange={(e) => set("precio_kg", e.target.value)} placeholder="Para calcular costos" />
              </div>
              <div className="field">
                <label>Lote del proveedor</label>
                <input value={form.lote_proveedor} onChange={(e) => set("lote_proveedor", e.target.value)} placeholder="Opcional" />
              </div>
              <div className="field">
                <label>Factura / remisión</label>
                <input value={form.factura} onChange={(e) => set("factura", e.target.value)} placeholder="Opcional" />
              </div>
              <div className="field">
                <label>Observación</label>
                <input value={form.observacion} onChange={(e) => set("observacion", e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            {error && <p className="err">{error}</p>}
            {ok && <p className="okmsg">{ok}</p>}
            <button className="btn" disabled={!valido || guardando}>{guardando ? "Guardando…" : "Registrar recepción"}</button>
          </form>
        ) : (
          <p className="hint">Solo coordinadores y administradores pueden registrar recepciones. Aquí puedes consultarlas.</p>
        )}
        {!puedeRegistrar && error && <p className="err">{error}</p>}

        <h2>Últimas recepciones</h2>
        <div className="card tabla">
          {!data ? <p className="hint">Cargando…</p> : data.recepciones.length === 0 ? <p className="hint">Aún no hay recepciones registradas.</p> : (
            <table>
              <thead><tr><th>Fecha</th><th>Materia prima</th><th>Proveedor</th><th>Lote prov.</th><th>Factura</th><th>Recibido</th>{data.verCostos && <th>Precio/kg</th>}<th>Saldo</th></tr></thead>
              <tbody>
                {data.recepciones.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{r.fecha}</td>
                    <td>{r.materia_prima?.nombre}</td>
                    <td>{r.proveedores?.nombre || "—"}</td>
                    <td>{r.lote_proveedor || "—"}</td>
                    <td>{r.factura || "—"}</td>
                    <td>{fmt(r.cantidad_kg)} kg</td>
                    {data.verCostos && <td>{r.precio_kg != null ? Number(r.precio_kg).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }) : "—"}</td>}
                    <td><span className={"saldo" + (Number(r.saldo_kg) === 0 ? " agotado" : "")}>{Number(r.saldo_kg) === 0 ? "agotado" : fmt(r.saldo_kg) + " kg"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

const css = `
.rc{ font-family:'Inter',sans-serif; color:#16211D; padding:28px 32px 60px; max-width:1100px; margin:0 auto; }
.rc h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:0 0 4px; }
.rc h2{ font-family:'Space Grotesk',sans-serif; font-size:15px; margin:30px 0 12px; }
.sub{ color:#5B6B7A; font-size:14px; margin:0 0 18px; max-width:760px; }
.card{ background:#fff; border:1px solid #E2E6EA; border-radius:8px; padding:20px; }
.card.tabla{ padding:6px 16px; overflow-x:auto; }
.grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; }
.field{ display:flex; flex-direction:column; gap:6px; }
.field label{ font-size:12.5px; color:#5B6B7A; font-weight:600; }
.field input,.field select{ padding:10px 12px; border:1px solid #D5DBE2; border-radius:8px; font:inherit; font-size:14px; background:#fff; }
.field input:focus,.field select:focus{ outline:2px solid #2A6FE0; border-color:transparent; }
.hint{ color:#5B6B7A; font-size:12.5px; }
.btn{ background:#123B7A; color:#fff; border:none; border-radius:8px; padding:11px 20px; font:inherit; font-size:14px; cursor:pointer; }
.btn:disabled{ opacity:0.45; cursor:default; }
.err{ color:#C0392B; font-size:13.5px; } .okmsg{ color:#1B6F66; font-size:13.5px; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:12px 8px; color:#5B6B7A; font-size:12px; border-bottom:1px solid #E2E6EA; }
td{ padding:10px 8px; border-bottom:1px solid #F4F6F8; } .nowrap{ white-space:nowrap; }
.saldo{ font-weight:600; color:#123B7A; } .saldo.agotado{ color:#8B98A8; font-weight:500; }
@media (max-width:800px){ .grid{ grid-template-columns:1fr; } .rc{ padding:20px 16px 40px; } }
`;
