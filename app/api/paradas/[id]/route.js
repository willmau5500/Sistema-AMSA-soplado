import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

export async function PATCH(request, { params }) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = params;

  const { data: parada, error: buscarError } = await supabaseAdmin
    .from("paradas_maquina")
    .select("id, hora_inicio, hora_fin")
    .eq("id", id)
    .single();

  if (buscarError || !parada) {
    return NextResponse.json({ error: "No se encontró la parada." }, { status: 404 });
  }
  if (parada.hora_fin) {
    return NextResponse.json({ error: "Esta parada ya fue finalizada." }, { status: 400 });
  }

  const horaFin = new Date();
  const horaInicio = new Date(parada.hora_inicio);
  const duracionMinutos = Math.max(1, Math.round((horaFin - horaInicio) / 60000));

  const { error } = await supabaseAdmin
    .from("paradas_maquina")
    .update({ hora_fin: horaFin.toISOString(), duracion_minutos: duracionMinutos })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, duracion_minutos: duracionMinutos });
}
