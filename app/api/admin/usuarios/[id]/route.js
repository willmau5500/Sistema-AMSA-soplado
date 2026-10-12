import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria, diferencias } from "@/lib/auditoria";

const ROLES_VALIDOS = ["admin", "coordinador", "operario"];

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

  const { id } = params;
  const { nombre, email, rol, activo, password } = await request.json();

  if (rol && !ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }
  if (password && password.length > 0 && password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const datos = {};
  if (nombre !== undefined) datos.nombre = nombre;
  if (email !== undefined) datos.email = email;
  if (rol !== undefined) datos.rol = rol;
  if (activo !== undefined) datos.activo = Boolean(activo);
  if (password) datos.password_hash = await bcrypt.hash(password, 12);

  const { data: antes } = await supabaseAdmin.from("usuarios").select("nombre, email, rol, activo").eq("id", id).maybeSingle();
  const { error: dbError } = await supabaseAdmin.from("usuarios").update(datos).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Nunca se registra la contraseña ni su hash: solo que fue cambiada.
  const { password_hash, ...visibles } = datos;
  const cambios = diferencias(antes, visibles);
  if (password_hash) cambios.contraseña = { antes: "***", despues: "cambiada" };
  if (Object.keys(cambios).length > 0) {
    await registrarAuditoria({ sesion, accion: "editar", entidad: "usuario", entidadId: id, detalle: `Modificó usuario ${antes?.nombre || id}: ${Object.keys(cambios).join(", ")}`, datos: cambios });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { sesion, error } = await requiereAdmin();
  if (error) return error;

  const { id } = params;
  if (String(sesion.id) === String(id)) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario." }, { status: 400 });
  }

  const { data: antes } = await supabaseAdmin.from("usuarios").select("nombre, email, rol").eq("id", id).maybeSingle();
  const { error: dbError } = await supabaseAdmin.from("usuarios").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await registrarAuditoria({ sesion, accion: "eliminar", entidad: "usuario", entidadId: id, detalle: `Eliminó usuario ${antes?.nombre || id}`, datos: antes || null });

  return NextResponse.json({ ok: true });
}
