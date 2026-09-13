import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

const ETAPAS_VALIDAS = ["preforma", "soplado"];
const TIPOS_VALIDOS = ["merma", "producto_danado"];

export async function POST(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { lote_id, etapa, tipo, peso_kg, observacion } = await request.json();

  if (!lote_id || !etapa || !tipo || peso_kg == null) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (!ETAPAS_VALIDAS.includes(etapa)) {
    return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }
  if (Number(peso_kg) <= 0) {
    return NextResponse.json({ error: "El peso debe ser mayor a cero." }, { status: 400 });
  }

  const { data: lote, error: loteError } = await supabaseAdmin
    .from("lotes_produccion")
    .select("id")
    .eq("id", lote_id)
    .single();

  if (loteError || !lote) {
    return NextResponse.json({ error: "El lote seleccionado no existe." }, { status: 400 });
  }

  const { data: merma, error } = await supabaseAdmin
    .from("merma")
    .insert({
      lote_id,
      etapa,
      tipo,
      peso_kg: Number(peso_kg),
      observacion: observacion || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, merma });
}
