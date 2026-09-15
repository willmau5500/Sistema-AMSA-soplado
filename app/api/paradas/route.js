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

  const [activasRes, recientesRes] = await Promise.all([
    supabaseAdmin
      .from("paradas_maquina")
      .select("id, hora_inicio, tipo_parada, observacion, maquinas(nombre), turnos(nombre)")
      .is("hora_fin", null)
      .order("hora_inicio", { ascending: false }),
    supabaseAdmin
      .from("paradas_maquina")
      .select("id, hora_inicio, hora_fin, duracion_minutos, tipo_parada, maquinas(nombre)")
      .not("hora_fin", "is", null)
      .order("hora_fin", { ascending: false })
      .limit(8),
  ]);

  if (activasRes.error || recientesRes.error) {
    return NextResponse.json(
      { error: (activasRes.error || recientesRes.error).message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    activas: activasRes.data,
    recientes: recientesRes.data,
  });
}

export async function POST(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { maquina_id, turno_id, tipo_parada, observacion } = await request.json();

  if (!maquina_id || !turno_id || !tipo_parada) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  // ---------- No permitir dos paradas activas para la misma máquina ----------
  const { data: existente } = await supabaseAdmin
    .from("paradas_maquina")
    .select("id")
    .eq("maquina_id", maquina_id)
    .is("hora_fin", null)
    .maybeSingle();

  if (existente) {
    return NextResponse.json(
      { error: "Esta máquina ya tiene una parada activa. Finalízala antes de iniciar otra." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("paradas_maquina")
    .insert({
      maquina_id,
      turno_id,
      operario_id: sesion.id,
      tipo_parada,
      observacion: observacion || null,
      hora_inicio: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, parada: data });
}
