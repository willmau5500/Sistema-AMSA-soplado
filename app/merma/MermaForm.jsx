"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ETAPAS = [
  { value: "preforma", label: "Preforma" },
  { value: "soplado", label: "Soplado" },
];
const TIPOS = [
  { value: "merma", label: "Merma" },
  { value: "producto_danado", label: "Producto dañado" },
];

export default function MermaForm({ nombreOperario }) {
  const router = useRouter();

  const [lotes, setLotes] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [form, setForm] = useState({
    lote_id: "",
    etapa: "preforma",
    tipo: "merma",
    peso_kg: "",
    observacion: "",
  });

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [creado, setCreado] = useState(false);

  useEffect(() => {
    cargarLotes();
  }, []);

  function cargarLotes() {
    setLoadingLotes(true);
    fetch("/api/lotes")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los lotes.");
        return res.json();
      })
      .then((data) => setLotes(data.lotes))
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setLoadingLotes(false));
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const formValido = form.lote_id && form.etapa && form.tipo && Number(form.peso_kg) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorGuardar("");
    try {
      const res = await fetch("/api/merma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lote_id: Number(form.lote_id),
          etapa: form.etapa,
          tipo: form.tipo,
          peso_kg: Number(form.peso_kg),
          observacion: form.observacion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorGuardar(data.error || "No se pudo registrar la merma.");
        setGuardando(false);
        return;
      }
      setCreado(true);
    } catch {
      setErrorGuardar("Error de conexión. Intenta de nuevo.");
    }
    setGuardando(false);
  }

  function registrarOtra() {
    setForm({ lote_id: "", etapa: "preforma", tipo: "merma", peso_kg: "", observacion: "" });
    setCreado(false);
    cargarLotes();
  }

  return (
    <>
      <style>{css}</style>
      <div className="wizard-screen">
        <div className="wizard-card">
          <div className="wizard-header">
            <div>
              <h1>Registro de Merma</h1>
              <p className="sub">Operario: {nombreOperario}</p>
            </div>
            <button className="link-btn" onClick={() => router.push("/dashboard")}>
              ← Volver al tablero
            </button>
          </div>

          {loadingLotes && <p className="hint">Cargando lotes...</p>}
          {errorCarga && <p className="error-msg">{errorCarga}</p>}

          {!loadingLotes && !errorCarga && !creado && (
            <form onSubmit={handleSubmit}>
              <div className="field-grid">
                <div className="field">
                  <label>Lote</label>
                  <select value={form.lote_id} onChange={(e) => update("lote_id", e.target.value)}>
                    <option value="">Selecciona el lote</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>{l.codigo_lote}</option>
                    ))}
                  </select>
                  {lotes.length === 0 && (
                    <span className="field-hint">No hay lotes registrados todavía — registra un lote de producción primero.</span>
                  )}
                </div>

                <div className="field">
                  <label>Etapa</label>
                  <div className="segmented">
                    {ETAPAS.map((op) => (
                      <button
                        type="button"
                        key={op.value}
                        className={"segment" + (form.etapa === op.value ? " active" : "")}
                        onClick={() => update("etapa", op.value)}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>Tipo</label>
                  <div className="segmented">
                    {TIPOS.map((op) => (
                      <button
                        type="button"
                        key={op.value}
                        className={"segment" + (form.tipo === op.value ? " active" : "")}
                        onClick={() => update("tipo", op.value)}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.peso_kg}
                    onChange={(e) => update("peso_kg", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Observación (opcional)</label>
                  <textarea
                    rows={3}
                    value={form.observacion}
                    onChange={(e) => update("observacion", e.target.value)}
                    placeholder="Ej: burbuja en el cuello, falla del molde..."
                  />
                </div>
              </div>

              {errorGuardar && <p className="error-msg">{errorGuardar}</p>}

              <div className="wizard-nav">
                <button type="submit" className="btn-primary" disabled={!formValido || guardando}>
                  {guardando ? "Guardando..." : "Registrar merma"}
                </button>
              </div>
            </form>
          )}

          {creado && (
            <div className="success-box">
              <div className="success-icon">✓</div>
              <h2>Merma registrada</h2>
              <p className="hint">Se guardó correctamente el registro.</p>
              <button className="btn-primary" onClick={registrarOtra}>Registrar otra</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const css = `
:root{
  --brand-dark:#123B7A; --brand:#2A6FE0; --brand-light:#3FC6B8;
  --ink:#16211D; --ink-soft:#5B6B7A; --surface:#F4F5F2; --line:#D8DCE0; --white:#fff;
}
*{ box-sizing:border-box; }
.wizard-screen{ min-height:100vh; background:var(--surface); display:flex; align-items:flex-start; justify-content:center; padding:48px 20px; font-family:'Inter',sans-serif; color:var(--ink); }
.wizard-card{ width:100%; max-width:560px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:36px; }
.wizard-header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.wizard-header h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:0 0 4px 0; }
.wizard-header .sub{ margin:0; color:var(--ink-soft); font-size:13.5px; }
.link-btn{ background:none; border:none; color:var(--brand-dark); font-size:13px; cursor:pointer; padding:0; }
.link-btn:hover{ text-decoration:underline; }

.field-grid{ display:flex; flex-direction:column; gap:18px; margin-bottom:24px; }
.field label{ display:block; font-size:13px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; }
.field select, .field input, .field textarea{ width:100%; padding:11px 12px; font-size:14.5px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; color:var(--ink); background:#fff; resize:vertical; }
.field select:focus, .field input:focus, .field textarea:focus{ border-color:var(--brand); }
.field-hint{ display:block; margin-top:5px; font-size:12.5px; color:var(--ink-soft); }

.segmented{ display:flex; border:1.5px solid var(--line); border-radius:4px; overflow:hidden; }
.segment{ flex:1; padding:10px 12px; background:#fff; border:none; font-size:13.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; border-right:1px solid var(--line); transition:background 0.15s ease, color 0.15s ease; }
.segment:last-child{ border-right:none; }
.segment.active{ background:var(--brand-dark); color:#fff; }

.wizard-nav{ display:flex; justify-content:flex-end; }
.btn-primary{ padding:11px 22px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }

.hint{ color:var(--ink-soft); font-size:14px; }
.error-msg{ color:#C0392B; font-size:13.5px; margin-top:8px; margin-bottom:8px; }

.success-box{ text-align:center; padding:20px 0; }
.success-icon{ width:56px; height:56px; border-radius:50%; background:var(--brand-light); color:#fff; font-size:28px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; }
.success-box h2{ font-family:'Space Grotesk',sans-serif; margin:0 0 8px 0; }
`;
