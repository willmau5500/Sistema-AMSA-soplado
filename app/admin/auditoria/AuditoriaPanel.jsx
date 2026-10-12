"use client";

import { Fragment, useEffect, useState } from "react";

const ACCIONES = [
  ["", "Todas las acciones"], ["crear", "Crear"], ["editar", "Editar"], ["eliminar", "Eliminar"],
  ["finalizar", "Finalizar"], ["login", "Inicio de sesión"], ["login_fallido", "Login fallido"],
];
const ENTIDADES = [
  ["", "Todos los módulos"], ["lote", "Lotes"], ["merma", "Merma"], ["parada", "Paradas"], ["meta", "Metas"],
  ["usuario", "Usuarios"], ["maquinas", "Máquinas"], ["turnos", "Turnos"], ["materia_prima", "Materia prima"],
  ["presentaciones", "Presentaciones"], ["moldes", "Moldes"], ["sesion", "Sesiones"],
];
const etiquetaAccion = Object.fromEntries(ACCIONES);
const cuando = (iso) => new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Bogota" });

export default function AuditoriaPanel() {
  const [f, setF] = useState({ q: "", accion: "", entidad: "", desde: "", hasta: "" });
  const [pagina, setPagina] = useState(0);
  const [data, setData] = useState({ registros: [], total: 0, porPagina: 50 });
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams({ ...f, pagina });
      [...p.keys()].forEach((k) => !p.get(k) && p.delete(k));
      fetch(`/api/admin/auditoria?${p}`)
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => (ok ? (setData(d), setError("")) : setError(d.error || "Error al cargar.")))
        .catch(() => setError("No se pudo cargar la auditoría."));
    }, 250);
    return () => clearTimeout(t);
  }, [f, pagina]);

  const set = (k, v) => { setPagina(0); setF((x) => ({ ...x, [k]: v })); };
  const paginas = Math.max(1, Math.ceil(data.total / data.porPagina));

  return (
    <>
      <style>{css}</style>
      <div className="au">
        <h1>Auditoría</h1>
        <p className="sub">Bitácora de quién hizo qué y cuándo. Solo visible para administradores. Los registros no se pueden editar desde la aplicación.</p>

        <div className="filtros">
          <input placeholder="Buscar usuario o detalle…" value={f.q} onChange={(e) => set("q", e.target.value)} />
          <select value={f.accion} onChange={(e) => set("accion", e.target.value)}>{ACCIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={f.entidad} onChange={(e) => set("entidad", e.target.value)}>{ENTIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input type="date" value={f.desde} onChange={(e) => set("desde", e.target.value)} />
          <input type="date" value={f.hasta} onChange={(e) => set("hasta", e.target.value)} />
        </div>

        {error && <p className="err">{error}</p>}

        <div className="card">
          {data.registros.length === 0 ? (
            <p className="muted pad">No hay registros con estos filtros.</p>
          ) : (
            <table>
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Detalle</th></tr></thead>
              <tbody>
                {data.registros.map((r) => (
                  <Fragment key={r.id}>
                    <tr className={r.datos ? "click" : ""} onClick={() => r.datos && setAbierto(abierto === r.id ? null : r.id)}>
                      <td className="nowrap muted">{cuando(r.creado_en)}</td>
                      <td><b>{r.usuario_nombre || "—"}</b>{r.rol ? <span className="rol"> {r.rol}</span> : null}</td>
                      <td><span className={"tag " + r.accion}>{etiquetaAccion[r.accion] || r.accion}</span></td>
                      <td>{r.entidad}</td>
                      <td>{r.detalle || ""}{r.datos ? <span className="mas"> ▾</span> : null}</td>
                    </tr>
                    {abierto === r.id && (
                      <tr><td colSpan={5}><pre>{JSON.stringify(r.datos, null, 2)}</pre></td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pager">
          <button disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina + 1} de {paginas} · {data.total} registros</span>
          <button disabled={pagina + 1 >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      </div>
    </>
  );
}

const css = `
.au{ font-family:'Inter',sans-serif; color:#16211D; padding:28px 32px 60px; max-width:1200px; margin:0 auto; }
.au h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:0 0 4px; }
.sub{ color:#5B6B7A; font-size:14px; margin:0 0 16px; }
.filtros{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
.filtros input,.filtros select{ padding:9px 12px; border:1px solid #D5DBE2; border-radius:8px; font:inherit; font-size:13.5px; background:#fff; }
.filtros input:first-child{ min-width:240px; flex:1; }
.card{ background:#fff; border:1px solid #E2E6EA; border-radius:8px; padding:6px 16px; overflow-x:auto; }
table{ width:100%; border-collapse:collapse; font-size:13.5px; }
th{ text-align:left; padding:12px 8px; color:#5B6B7A; font-size:12px; border-bottom:1px solid #E2E6EA; }
td{ padding:10px 8px; border-bottom:1px solid #F4F6F8; vertical-align:top; }
tr.click{ cursor:pointer; } tr.click:hover{ background:#F8FAFC; }
.nowrap{ white-space:nowrap; } .muted{ color:#5B6B7A; } .pad{ padding:18px 0; } .err{ color:#C0392B; }
.rol{ color:#8B98A8; font-size:11.5px; text-transform:capitalize; }
.mas{ color:#8B98A8; }
.tag{ display:inline-block; padding:2px 9px; border-radius:10px; font-size:11.5px; font-weight:600; background:#EEF3FC; color:#123B7A; }
.tag.eliminar{ background:#FBEAE8; color:#B42318; } .tag.editar{ background:#FDF1E6; color:#B25E1E; }
.tag.login_fallido{ background:#FBEAE8; color:#B42318; } .tag.login{ background:#EEF1F4; color:#5B6B7A; } .tag.crear{ background:#E6F6F3; color:#1B6F66; }
pre{ margin:0; background:#F4F6F8; padding:12px; border-radius:6px; font-size:12px; overflow-x:auto; }
.pager{ display:flex; justify-content:center; align-items:center; gap:16px; margin-top:16px; font-size:13px; color:#5B6B7A; }
.pager button{ padding:8px 14px; border:1px solid #D5DBE2; background:#fff; border-radius:8px; cursor:pointer; font:inherit; font-size:13px; }
.pager button:disabled{ opacity:0.4; cursor:default; }
@media (max-width:700px){ .au{ padding:20px 16px 40px; } }
`;
