import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

export async function GET() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [turnos, maquinas, moldes, materiaPrima] = await Promise.all([
    supabaseAdmin.from("turnos").select("id, nombre").order("id"),
    supabaseAdmin.from("maquinas").select("id, nombre").eq("activo", true).order("id"),
    supabaseAdmin
      .from("moldes")
      .select("id, codigo, nombre, presentacion_id, presentaciones(nombre)")
      .eq("activo", true)
      .order("id"),
    supabaseAdmin
      .from("materia_prima")
      .select("id, nombre, unidad_medida, stock_actual_kg")
      .order("id"),
  ]);

  const error = turnos.error || maquinas.error || moldes.error || materiaPrima.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    turnos: turnos.data,
    maquinas: maquinas.data,
    moldes: moldes.data,
    materiaPrima: materiaPrima.data,
  });
}
