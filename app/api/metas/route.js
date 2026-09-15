import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

export async function GET(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") || new Date().toISOString().slice(0, 10);

  const { data: metas, error } = await supabaseAdmin
    .from("metas_produccion")
    .select("id, fecha, meta_botellas, maquina_id, turno_id, maquinas(nombre), turnos(nombre)")
    .eq("fecha", fecha)
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ---------- Producido real por máquina+turno ese día, para calcular cumplimiento ----------
  const { data: lotes } = await supabaseAdmin
    .from("lotes_produccion")
    .select("maquina_id, turno_id, cantidad_botellas_terminadas")
    .eq("fecha", fecha);

  const metasConProgreso = (metas || []).map((m) => {
    const producido = (lotes || [])
      .filter((l) => l.maquina_id === m.maquina_id && l.turno_id === m.turno_id)
      .reduce((sum, l) => sum + (l.cantidad_botellas_terminadas || 0), 0);
    const porcentaje = m.meta_botellas > 0 ? Math.round((producido / m.meta_botellas) * 100) : 0;
    return { ...m, producido, porcentaje };
  });

  return NextResponse.json({ metas: metasConProgreso });
}

export async function POST(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { maquina_id, turno_id, fecha, meta_botellas } = await request.json();

  if (!maquina_id || !turno_id || !fecha || meta_botellas == null) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (Number(meta_botellas) <= 0) {
    return NextResponse.json({ error: "La meta debe ser mayor a cero." }, { status: 400 });
  }

  // ---------- Si ya existe una meta para esa máquina+turno+fecha, la actualiza en vez de duplicar ----------
  const { data: existente } = await supabaseAdmin
    .from("metas_produccion")
    .select("id")
    .eq("maquina_id", maquina_id)
    .eq("turno_id", turno_id)
    .eq("fecha", fecha)
    .maybeSingle();

  if (existente) {
    const { error } = await supabaseAdmin
      .from("metas_produccion")
      .update({ meta_botellas: Number(meta_botellas) })
      .eq("id", existente.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, actualizado: true });
  }

  const { error } = await supabaseAdmin.from("metas_produccion").insert({
    maquina_id,
    turno_id,
    fecha,
    meta_botellas: Number(meta_botellas),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, actualizado: false });
}
