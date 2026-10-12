"use client";

import { useEffect, useState } from "react";

function valorInicial(campos) {
  const obj = {};
  campos.forEach((c) => {
    obj[c.key] = c.type === "checkbox" ? (c.default ?? true) : "";
  });
  return obj;
}

export default function AdminTable({ tabla, titulo, campos }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nuevo, setNuevo] = useState(valorInicial(campos));
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    cargar();
  }, [tabla]);

  function cargar() {
    setLoading(true);
    fetch(`/api/admin/${tabla}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRegistros(data.registros || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function crear(e) {
    e.preventDefault();
    setCreando(true);
    setErrorCrear("");
    try {
      const res = await fetch(`/api/admin/${tabla}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear.");
      setNuevo(valorInicial(campos));
      cargar();
    } catch (e) {
      setErrorCrear(e.message);
    }
    setCreando(false);
  }

  function empezarEdicion(r) {
    setEditandoId(r.id);
    const form = {};
    campos.forEach((c) => (form[c.key] = r[c.key]));
    setEditForm(form);
  }

  async function guardarEdicion(id) {
    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/admin/${tabla}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setEditandoId(null);
      cargar();
    } catch (e) {
      setError(e.message);
    }
    setGuardandoEdicion(false);
  }

  async function borrar(id) {
    setBorrandoId(id);
    try {
      const res = await fetch(`/api/admin/${tabla}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar.");
      cargar();
    } catch (e) {
      setError(e.message);
    }
    setBorrandoId(null);
  }

  function renderCampo(campo, valor, onChange) {
    if (campo.type === "checkbox") {
      return <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} />;
    }
    if (campo.type === "select") {
      return (
        <select value={valor ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecciona</option>
          {campo.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if (campo.type === "time") {
      return <input type="time" value={valor ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
    return (
      <input
        type={campo.type === "number" ? "number" : "text"}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  function labelValor(campo, valor) {
    if (campo.type === "checkbox") return valor ? "Sí" : "No";
    if (campo.type === "select") {
      const opt = campo.options.find((o) => String(o.value) === String(valor));
      return opt ? opt.label : valor;
    }
    return valor ?? "—";
  }

  return (
    <>
      <style>{css}</style>
      <div className="admin-table-block">
        <div className="section-title">{titulo}</div>

        <form className="add-form" onSubmit={crear}>
          {campos.map((c) => (
            <div key={c.key} className={"field" + (c.type === "checkbox" ? " field-check" : "")}>
              <label>{c.label}</label>
              {renderCampo(c, nuevo[c.key], (v) => setNuevo((f) => ({ ...f, [c.key]: v })))}
            </div>
          ))}
          <button className="btn-primary" disabled={creando}>
            {creando ? "Agregando..." : "Agregar"}
          </button>
        </form>
        {errorCrear && <p className="error-msg">{errorCrear}</p>}

        {error && <p className="error-msg">{error}</p>}
        {loading ? (
          <p className="hint">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="hint">No hay registros todavía.</p>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  {campos.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    {campos.map((c) => (
                      <td key={c.key}>
                        {editandoId === r.id
                          ? renderCampo(c, editForm[c.key], (v) => setEditForm((f) => ({ ...f, [c.key]: v })))
                          : labelValor(c, r[c.key])}
                      </td>
                    ))}
                    <td className="actions">
                      {editandoId === r.id ? (
                        <>
                          <button className="link-btn" onClick={() => guardarEdicion(r.id)} disabled={guardandoEdicion}>
                            Guardar
                          </button>
                          <button className="link-btn muted" onClick={() => setEditandoId(null)}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button className="link-btn" onClick={() => empezarEdicion(r)}>Editar</button>
                          <button
                            className="link-btn danger"
                            onClick={() => borrar(r.id)}
                            disabled={borrandoId === r.id}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const css = `
:root{
  --brand-dark:#123B7A; --brand:#2A6FE0; --ink:#16211D; --ink-soft:#5B6B7A;
  --surface:#F4F6F8; --line:#E2E6EA; --alert:#C0392B;
}
.admin-table-block{ margin-bottom:36px; font-family:'Inter',sans-serif; color:var(--ink); }
.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin-bottom:14px; }
.add-form{ display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; margin-bottom:8px; }
.field{ display:flex; flex-direction:column; min-width:130px; }
.field-check{ flex-direction:row; align-items:center; gap:8px; min-width:auto; }
.field label{ font-size:12px; font-weight:600; color:var(--ink-soft); margin-bottom:5px; }
.field input, .field select{ padding:9px 10px; font-size:13.5px; border:1.5px solid var(--line); border-radius:4px; outline:none; font-family:'Inter',sans-serif; }
.field input:focus, .field select:focus{ border-color:var(--brand); }
.btn-primary{ padding:10px 18px; background:var(--brand-dark); color:#fff; border:none; border-radius:4px; font-size:13.5px; font-weight:600; cursor:pointer; height:38px; }
.btn-primary:hover{ background:var(--brand); }
.btn-primary:disabled{ background:#B8C2D4; cursor:not-allowed; }

.table-card{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:4px 16px; overflow-x:auto; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:11px 8px; color:var(--ink-soft); font-weight:600; font-size:12px; border-bottom:1px solid var(--line); white-space:nowrap; }
td{ padding:9px 8px; border-bottom:1px solid var(--surface); white-space:nowrap; }
tr:last-child td{ border-bottom:none; }
td input, td select{ padding:6px 8px; font-size:13px; border:1.5px solid var(--line); border-radius:4px; }
.actions{ display:flex; gap:10px; }
.link-btn{ background:none; border:none; color:var(--brand-dark); font-size:12.5px; font-weight:600; cursor:pointer; padding:4px; }
.link-btn:hover{ text-decoration:underline; }
.link-btn.danger{ color:var(--alert); }
.link-btn.muted{ color:var(--ink-soft); }
.link-btn:disabled{ opacity:0.5; cursor:not-allowed; }

.hint{ color:var(--ink-soft); font-size:13.5px; padding:8px 0; }
.error-msg{ color:var(--alert); font-size:13px; margin:6px 0; }
`;
