import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { TABLAS_ADMIN, limpiarBody } from "@/lib/adminTablas";

async function requiereAdmin() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (sesion.rol !== "admin") return { error: NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 }) };
  return { sesion };
}

export async function GET(request, { params }) {
  const { error } = await requiereAdmin();
  if (error) return error;

  const { tabla } = params;
  if (!TABLAS_ADMIN[tabla]) {
    return NextResponse.json({ error: "Tabla no permitida." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin.from(tabla).select("*").order("id");
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ registros: data });
}

export async function POST(request, { params }) {
  const { sesion, error } = await requiereAdmin();
  if (error) return error;

  const { tabla } = params;
  if (!TABLAS_ADMIN[tabla]) {
    return NextResponse.json({ error: "Tabla no permitida." }, { status: 400 });
  }

  const body = await request.json();
  const datos = limpiarBody(tabla, body);

  const { data, error: dbError } = await supabaseAdmin.from(tabla).insert(datos).select("*").single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await registrarAuditoria({ sesion, accion: "crear", entidad: tabla, entidadId: data.id, detalle: `Alta en ${tabla}`, datos: datos });

  return NextResponse.json({ ok: true, registro: data });
}
