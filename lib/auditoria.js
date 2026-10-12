import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Registra una acción en la bitácora. NUNCA debe romper la operación principal:
// si la bitácora falla, se ignora el error.
export async function registrarAuditoria({ sesion, usuarioNombre, accion, entidad, entidadId, detalle, datos }) {
  try {
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: sesion?.id != null ? String(sesion.id) : null,
      usuario_nombre: sesion?.nombre || usuarioNombre || null,
      rol: sesion?.rol || null,
      accion,
      entidad,
      entidad_id: entidadId != null ? String(entidadId) : null,
      detalle: detalle || null,
      datos: datos || null,
    });
  } catch {
    /* sin efecto */
  }
}

// Devuelve solo los campos que cambiaron: { campo: { antes, despues } }
export function diferencias(antes, despues) {
  const out = {};
  for (const k of Object.keys(despues || {})) {
    if (String(antes?.[k] ?? "") !== String(despues[k] ?? "")) {
      out[k] = { antes: antes?.[k] ?? null, despues: despues[k] };
    }
  }
  return out;
}
