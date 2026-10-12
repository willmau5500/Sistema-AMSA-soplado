"use client";

import { useEffect, useState } from "react";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "coordinador", label: "Coordinador" },
  { value: "operario", label: "Operario" },
];

export default function UsuariosPanel({ usuarioActualId }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nuevo, setNuevo] = useState({ nombre: "", email: "", rol: "operario", password: "" });
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  function cargar() {
    setLoading(true);
    fetch("/api/admin/usuarios")
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
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear.");
      setNuevo({ nombre: "", email: "", rol: "operario", password: "" });
      cargar();
    } catch (e) {
      setErrorCrear(e.message);
    }
    setCreando(false);
  }

  function empezarEdicion(u) {
    setEditandoId(u.id);
    setEditForm({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, password: "" });
  }

  async function guardarEdicion(id) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
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
    setGuardando(false);
  }

  async function borrar(id) {
    setBorrandoId(id);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar.");
      cargar();
    } catch (e) {
      setError(e.message);
    }
    setBorrandoId(null);
  }

  return (
    <>
      <style>{css}</style>
      <div className="usuarios-panel">
        <div className="section-title">Nuevo usuario</div>
        <form className="add-form" onSubmit={crear}>
          <div className="field">
            <label>Nombre</label>
            <input value={nuevo.nombre} onChange={(e) => setNuevo((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="field">
            <label>Usuario / correo</label>
            <input value={nuevo.email} onChange={(e) => setNuevo((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={nuevo.rol} onChange={(e) => setNuevo((f) => ({ ...f, rol: e.target.value }))}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={nuevo.password} onChange={(e) => setNuevo((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <button className="btn-primary" disabled={creando}>
            {creando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
        {errorCrear && <p className="error-msg">{errorCrear}</p>}

        <div className="section-title">Usuarios</div>
        {error && <p className="error-msg">{error}</p>}
        {loading ? (
          <p className="hint">Cargando...</p>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario / correo</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th>Nueva contraseña</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((u) => (
                  <tr key={u.id}>
                    {editandoId === u.id ? (
                      <>
                        <td><input value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))} /></td>
                        <td><input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></td>
                        <td>
                          <select value={editForm.rol} onChange={(e) => setEditForm((f) => ({ ...f, rol: e.target.value }))}>
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <input type="checkbox" checked={editForm.activo} onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))} />
                        </td>
                        <td>
                          <input
                            type="password"
                            placeholder="Dejar en blanco para no cambiar"
                            value={editForm.password}
                            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                          />
                        </td>
                        <td className="actions">
                          <button className="link-btn" onClick={() => guardarEdicion(u.id)} disabled={guardando}>Guardar</button>
                          <button className="link-btn muted" onClick={() => setEditandoId(null)}>Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.nombre}</td>
                        <td>{u.email}</td>
                        <td className="capitalize">{u.rol}</td>
                        <td>{u.activo ? "Sí" : "No"}</td>
                        <td className="muted">—</td>
                        <td className="actions">
                          <button className="link-btn" onClick={() => empezarEdicion(u)}>Editar</button>
                          {String(u.id) !== String(usuarioActualId) && (
                            <button className="link-btn danger" onClick={() => borrar(u.id)} disabled={borrandoId === u.id}>
                              Eliminar
                            </button>
                          )}
                        </td>
                      </>
                    )}
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
.usuarios-panel{ padding:28px 32px 60px 32px; max-width:1000px; margin:0 auto; font-family:'Inter',sans-serif; color:var(--ink); }
.section-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; margin:28px 0 14px 0; }
.section-title:first-child{ margin-top:0; }
.add-form{ display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; margin-bottom:8px; }
.field{ display:flex; flex-direction:column; min-width:150px; }
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
.capitalize{ text-transform:capitalize; }
.actions{ display:flex; gap:10px; }
.link-btn{ background:none; border:none; color:var(--brand-dark); font-size:12.5px; font-weight:600; cursor:pointer; padding:4px; }
.link-btn:hover{ text-decoration:underline; }
.link-btn.danger{ color:var(--alert); }
.link-btn.muted{ color:var(--ink-soft); }
.link-btn:disabled{ opacity:0.5; cursor:not-allowed; }
.muted{ color:var(--ink-soft); }

.hint{ color:var(--ink-soft); font-size:13.5px; }
.error-msg{ color:var(--alert); font-size:13px; margin:6px 0; }
`;
