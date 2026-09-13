"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Datos del lote", "Resultados", "Confirmación"];

export default function ProduccionWizard({ nombreOperario }) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [catalogos, setCatalogos] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");

  const [form, setForm] = useState({
    turno_id: "",
    maquina_id: "",
    molde_id: "",
    materia_prima_id: "",
    cantidad_materia_prima_kg: "",
    cantidad_preformas: "",
    cantidad_botellas_terminadas: "",
  });

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [loteCreado, setLoteCreado] = useState(null);

  useEffect(() => {
    fetch("/api/catalogos")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los catálogos.");
        return res.json();
      })
      .then((data) => setCatalogos(data))
      .catch((err) => setErrorCarga(err.message))
      .finally(() => setLoadingCatalogos(false));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const moldeSeleccionado = catalogos?.moldes.find((m) => String(m.id) === String(form.molde_id));
  const materiaSeleccionada = catalogos?.materiaPrima.find((m) => String(m.id) === String(form.materia_prima_id));
  const turnoSeleccionado = catalogos?.turnos.find((t) => String(t.id) === String(form.turno_id));
  const maquinaSeleccionada = catalogos?.maquinas.find((m) => String(m.id) === String(form.maquina_id));

  const paso1Completo = form.turno_id && form.maquina_id && form.molde_id && form.materia_prima_id && Number(form.cantidad_materia_prima_kg) > 0;
  const paso2Completo = Number(form.cantidad_preformas) > 0 && Number(form.cantidad_botellas_terminadas) > 0;

  const excedeStock = materiaSeleccionada && Number(form.cantidad_materia_prima_kg) > materiaSeleccionada.stock_actual_kg;
  const excedeBotellas = Number(form.cantidad_botellas_terminadas) > Number(form.cantidad_preformas) && form.cantidad_preformas !== "";

  async function handleGuardar() {
    setGuardando(true);
    setErrorGuardar("");
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turno_id: Number(form.turno_id),
          maquina_id: Number(form.maquina_id),
          molde_id: Number(form.molde_id),
          materia_prima_id: Number(form.materia_prima_id),
          cantidad_materia_prima_kg: Number(form.cantidad_materia_prima_kg),
          cantidad_preformas: Number(form.cantidad_preformas),
          cantidad_botellas_terminadas: Number(form.cantidad_botellas_terminadas),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorGuardar(data.error || "No se pudo guardar el lote.");
        setGuardando(false);
        return;
      }
      setLoteCreado(data.lote);
    } catch {
      setErrorGuardar("Error de conexión. Intenta de nuevo.");
    }
    setGuardando(false);
  }

  function nuevoLote() {
    setForm({
      turno_id: "",
      maquina_id: "",
      molde_id: "",
      materia_prima_id: "",
      cantidad_materia_prima_kg: "",
      cantidad_preformas: "",
      cantidad_botellas_terminadas: "",
    });
    setLoteCreado(null);
    setStep(0);
    // refresca catálogos para reflejar el stock actualizado
    setLoadingCatalogos(true);
    fetch("/api/catalogos")
      .then((res) => res.json())
      .then((data) => setCatalogos(data))
      .finally(() => setLoadingCatalogos(false));
  }

  return (
    <>
      <style>{css}</style>
      <div className="wizard-screen">
        <div className="wizard-card">
          <div className="wizard-header">
            <div>
              <h1>Registro de Producción</h1>
              <p className="sub">Operario: {nombreOperario}</p>
            </div>
            <button className="link-btn" onClick={() => router.push("/dashboard")}>
              ← Volver al tablero
            </button>
          </div>

          {!loteCreado && (
            <div className="stepper">
              {STEPS.map((label, i) => (
                <div key={label} className={"step-dot-wrap" + (i === step ? " active" : i < step ? " done" : "")}>
                  <div className="step-dot">{i < step ? "✓" : i + 1}</div>
                  <span className="step-label">{label}</span>
                  {i < STEPS.length - 1 && <div className="step-line" />}
                </div>
              ))}
            </div>
          )}

          {loadingCatalogos && <p className="hint">Cargando catálogos...</p>}
          {errorCarga && <p className="error-msg">{errorCarga}</p>}

          {!loadingCatalogos && !errorCarga && !loteCreado && (
            <>
              {step === 0 && (
                <div className="step-body">
                  <div className="field-grid">
                    <div className="field">
                      <label>Turno</label>
                      <select value={form.turno_id} onChange={(e) => update("turno_id", e.target.value)}>
                        <option value="">Selecciona un turno</option>
                        {catalogos.turnos.map((t) => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Máquina</label>
                      <select value={form.maquina_id} onChange={(e) => update("maquina_id", e.target.value)}>
                        <option value="">Selecciona una máquina</option>
                        {catalogos.maquinas.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Molde</label>
                      <select value={form.molde_id} onChange={(e) => update("molde_id", e.target.value)}>
                        <option value="">Selecciona un molde</option>
                        {catalogos.moldes.map((m) => (
                          <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>
                        ))}
                      </select>
                      {moldeSeleccionado && (
                        <span className="field-hint">
                          Presentación: {moldeSeleccionado.presentaciones?.nombre || "—"}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Materia prima</label>
                      <select value={form.materia_prima_id} onChange={(e) => update("materia_prima_id", e.target.value)}>
                        <option value="">Selecciona la materia prima</option>
                        {catalogos.materiaPrima.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                      {materiaSeleccionada && (
                        <span className="field-hint">
                          Stock disponible: {materiaSeleccionada.stock_actual_kg} {materiaSeleccionada.unidad_medida}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Cantidad de materia prima usada (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.cantidad_materia_prima_kg}
                        onChange={(e) => update("cantidad_materia_prima_kg", e.target.value)}
                      />
                      {excedeStock && (
                        <span className="field-error">
                          Supera el stock disponible ({materiaSeleccionada.stock_actual_kg} {materiaSeleccionada.unidad_medida}).
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="step-body">
                  <div className="field-grid">
                    <div className="field">
                      <label>Cantidad de preformas</label>
                      <input
                        type="number"
                        min="0"
                        value={form.cantidad_preformas}
                        onChange={(e) => update("cantidad_preformas", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Cantidad de botellas terminadas</label>
                      <input
                        type="number"
                        min="0"
                        value={form.cantidad_botellas_terminadas}
                        onChange={(e) => update("cantidad_botellas_terminadas", e.target.value)}
                      />
                      {excedeBotellas && (
                        <span className="field-error">
                          No puede haber más botellas terminadas que preformas usadas.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-body">
                  <div className="summary">
                    <div className="summary-row"><span>Turno</span><b>{turnoSeleccionado?.nombre}</b></div>
                    <div className="summary-row"><span>Máquina</span><b>{maquinaSeleccionada?.nombre}</b></div>
                    <div className="summary-row"><span>Molde</span><b>{moldeSeleccionado?.codigo} — {moldeSeleccionado?.nombre}</b></div>
                    <div className="summary-row"><span>Presentación</span><b>{moldeSeleccionado?.presentaciones?.nombre}</b></div>
                    <div className="summary-row"><span>Materia prima</span><b>{materiaSeleccionada?.nombre}</b></div>
                    <div className="summary-row"><span>Cantidad usada</span><b>{form.cantidad_materia_prima_kg} kg</b></div>
                    <div className="summary-row"><span>Preformas</span><b>{form.cantidad_preformas}</b></div>
                    <div className="summary-row"><span>Botellas terminadas</span><b>{form.cantidad_botellas_terminadas}</b></div>
                  </div>
                  {errorGuardar && <p className="error-msg">{errorGuardar}</p>}
                </div>
              )}

              <div className="wizard-nav">
                {step > 0 && (
                  <button className="btn-secondary" onClick={() => setStep(step - 1)} disabled={guardando}>
                    Atrás
                  </button>
                )}
                {step < 2 && (
                  <button
                    className="btn-primary"
                    disabled={(step === 0 && (!paso1Completo || excedeStock)) || (step === 1 && (!paso2Completo || excedeBotellas))}
                    onClick={() => setStep(step + 1)}
                  >
                    Siguiente
                  </button>
                )}
                {step === 2 && (
                  <button className="btn-primary" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar lote"}
                  </button>
                )}
              </div>
            </>
          )}

          {loteCreado && (
            <div className="success-box">
              <div className="success-icon">✓</div>
              <h2>Lote registrado</h2>
              <p className="codigo">{loteCreado.codigo_lote}</p>
              <button className="btn-primary" onClick={nuevoLote}>Registrar otro lote</button>
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
.wizard-card{ width:100%; max-width:640px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:36px; }
.wizard-header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.wizard-header h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:0 0 4px 0; }
.wizard-header .sub{ margin:0; color:var(--ink-soft); font-size:13.5px; }
.link-btn{ background:none; border:none; color:var(--brand-dark); font-size:13px; cursor:pointer; padding:0; }
.link-btn:hover{ text-decoration:underline; }

.stepper{ display:flex; align-items:center; margin-bottom:32px; }
.step-dot-wrap{ display:flex; align-items:center; flex:1; }
.step-dot-wrap:last-child{ flex:0; }
.step-dot{ width:28px; height:28px; border-radius:50%; background:var(--line); color:#8b98a8; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; transition:background 0.2s ease, color 0.2s ease; }
.step-dot-wrap.active .step-dot{ background:var(--brand-dark); color:#fff; }
.step-dot-wrap.done .step-dot{ background:var(--brand-light); color:#fff; }
.step-label{ font-size:12px; color:var(--ink-soft); margin-left:8px; white-space:nowrap; }
.step-dot-wrap.active .step-label{ color:var(--ink); font-weight:600; }
.step-line{ flex:1; height:1.5px; background:var(--line); margin:0 12px; }

.step-body{ margin-bottom:28px; }
.field-grid{ display:flex; flex-direction:column; gap:18px; }
.field label{ display:block; font-size:13px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; }
.field select, .field input{ width:100%; padding:11px 12px; font-size:14.5px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; color:var(--ink); background:#fff; }
.field select:focus, .field input:focus{ border-color:var(--brand); }
.field-hint{ display:block; margin-top:5px; font-size:12.5px; color:var(--ink-soft); }
.field-error{ display:block; margin-top:5px; font-size:12.5px; color:#C0392B; }

.summary{ border:1px solid var(--line); border-radius:6px; padding:8px 16px; }
.summary-row{ display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--surface); font-size:14px; }
.summary-row:last-child{ border-bottom:none; }
.summary-row span{ color:var(--ink-soft); }

.wizard-nav{ display:flex; justify-content:flex-end; gap:12px; }
.btn-primary{ padding:11px 22px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }
.btn-secondary{ padding:11px 22px; background:#fff; color:var(--ink-soft); border:1.5px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }

.hint{ color:var(--ink-soft); font-size:14px; }
.error-msg{ color:#C0392B; font-size:13.5px; margin-top:8px; }

.success-box{ text-align:center; padding:20px 0; }
.success-icon{ width:56px; height:56px; border-radius:50%; background:var(--brand-light); color:#fff; font-size:28px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; }
.success-box h2{ font-family:'Space Grotesk',sans-serif; margin:0 0 8px 0; }
.success-box .codigo{ font-family:'Space Grotesk',sans-serif; font-size:18px; color:var(--brand-dark); font-weight:700; margin:0 0 24px 0; }
`;
