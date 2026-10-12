import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria, diferencias } from "@/lib/auditoria";
import { TABLAS_ADMIN, limpiarBody } from "@/lib/adminTablas";

async function requiereAdmin() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (sesion.rol !== "admin") return { error: NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 }) };
  return { sesion };
}

export async function PATCH(request, { params }) {
  const { sesion, error } = await requiereAdmin();
  if (error) return error;

  const { tabla, id } = params;
  if (!TABLAS_ADMIN[tabla]) {
    return NextResponse.json({ error: "Tabla no permitida." }, { status: 400 });
  }

  const body = await request.json();
  const datos = limpiarBody(tabla, body);

  const { data: antes } = await supabaseAdmin.from(tabla).select("*").eq("id", id).maybeSingle();
  const { error: dbError } = await supabaseAdmin.from(tabla).update(datos).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const cambios = diferencias(antes, datos);
  if (Object.keys(cambios).length > 0) {
    await registrarAuditoria({ sesion, accion: "editar", entidad: tabla, entidadId: id, detalle: `Modificó ${Object.keys(cambios).join(", ")} en ${tabla}`, datos: cambios });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { sesion, error } = await requiereAdmin();
  if (error) return error;

  const { tabla, id } = params;
  if (!TABLAS_ADMIN[tabla]) {
    return NextResponse.json({ error: "Tabla no permitida." }, { status: 400 });
  }

  const { data: antes } = await supabaseAdmin.from(tabla).select("*").eq("id", id).maybeSingle();
  const { error: dbError } = await supabaseAdmin.from(tabla).delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await registrarAuditoria({ sesion, accion: "eliminar", entidad: tabla, entidadId: id, detalle: `Eliminó registro de ${tabla}`, datos: antes || null });

  return NextResponse.json({ ok: true });
}
