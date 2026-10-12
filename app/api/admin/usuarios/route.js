import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";

const ROLES_VALIDOS = ["admin", "coordinador", "operario"];

async function requiereAdmin() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (sesion.rol !== "admin") return { error: NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 }) };
  return { sesion };
}

export async function GET() {
  const { error } = await requiereAdmin();
  if (error) return error;

  const { data, error: dbError } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre, email, rol, activo, creado_en")
    .order("id");

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ registros: data });
}

export async function POST(request) {
  const { sesion, error } = await requiereAdmin();
  if (error) return error;

  const { nombre, email, rol, password, activo } = await request.json();

  if (!nombre || !email || !rol || !password) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error: dbError } = await supabaseAdmin
    .from("usuarios")
    .insert({ nombre, email, rol, password_hash, activo: activo ?? true })
    .select("id, nombre, email, rol, activo")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  await registrarAuditoria({ sesion, accion: "crear", entidad: "usuario", entidadId: data.id, detalle: `Creó usuario ${data.nombre} (${data.rol})`, datos: { nombre: data.nombre, email: data.email, rol: data.rol } });
  return NextResponse.json({ ok: true, registro: data });
}
