import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

export async function POST(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const {
    turno_id,
    maquina_id,
    molde_id,
    materia_prima_id,
    cantidad_materia_prima_kg,
    cantidad_preformas,
    cantidad_botellas_terminadas,
  } = body;

  // ---------- Validaciones de campos obligatorios ----------
  if (
    !turno_id || !maquina_id || !molde_id || !materia_prima_id ||
    cantidad_materia_prima_kg == null ||
    cantidad_preformas == null ||
    cantidad_botellas_terminadas == null
  ) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  if (
    cantidad_materia_prima_kg <= 0 ||
    cantidad_preformas <= 0 ||
    cantidad_botellas_terminadas <= 0
  ) {
    return NextResponse.json(
      { error: "Las cantidades deben ser mayores a cero." },
      { status: 400 }
    );
  }

  // ---------- Regla: botellas terminadas no puede superar preformas usadas ----------
  if (cantidad_botellas_terminadas > cantidad_preformas) {
    return NextResponse.json(
      { error: "La cantidad de botellas terminadas no puede ser mayor que la cantidad de preformas." },
      { status: 400 }
    );
  }

  // ---------- Regla: debe haber suficiente materia prima en stock ----------
  const { data: mp, error: mpError } = await supabaseAdmin
    .from("materia_prima")
    .select("stock_actual_kg, nombre")
    .eq("id", materia_prima_id)
    .single();

  if (mpError || !mp) {
    return NextResponse.json(
      { error: "No se encontró la materia prima seleccionada." },
      { status: 400 }
    );
  }

  if (cantidad_materia_prima_kg > mp.stock_actual_kg) {
    return NextResponse.json(
      {
        error: `No hay suficiente stock de ${mp.nombre}. Disponible: ${mp.stock_actual_kg} kg.`,
      },
      { status: 400 }
    );
  }

  // ---------- Obtener la presentación desde el molde ----------
  const { data: molde, error: moldeError } = await supabaseAdmin
    .from("moldes")
    .select("presentacion_id")
    .eq("id", molde_id)
    .single();

  if (moldeError || !molde) {
    return NextResponse.json(
      { error: "No se encontró el molde seleccionado." },
      { status: 400 }
    );
  }

  // ---------- Crear el lote (el código se genera solo con el trigger de la BD) ----------
  const { data: lote, error: loteError } = await supabaseAdmin
    .from("lotes_produccion")
    .insert({
      turno_id,
      maquina_id,
      molde_id,
      operario_id: sesion.id,
      presentacion_id: molde.presentacion_id,
      materia_prima_id,
      cantidad_materia_prima_kg,
      cantidad_preformas,
      cantidad_botellas_terminadas,
    })
    .select("id, codigo_lote")
    .single();

  if (loteError) {
    return NextResponse.json({ error: loteError.message }, { status: 500 });
  }

  // ---------- Descontar materia prima del inventario ----------
  await supabaseAdmin
    .from("materia_prima")
    .update({ stock_actual_kg: mp.stock_actual_kg - cantidad_materia_prima_kg })
    .eq("id", materia_prima_id);

  // ---------- Registrar el movimiento de salida de materia prima ----------
  await supabaseAdmin.from("movimientos_materia_prima").insert({
    materia_prima_id,
    tipo: "salida",
    cantidad_kg: cantidad_materia_prima_kg,
    usuario_id: sesion.id,
    observacion: `Consumo del lote ${lote.codigo_lote}`,
  });

  // ---------- Sumar al stock de producto terminado ----------
  const { data: existente } = await supabaseAdmin
    .from("producto_terminado")
    .select("id, cantidad_disponible")
    .eq("presentacion_id", molde.presentacion_id)
    .maybeSingle();

  if (existente) {
    await supabaseAdmin
      .from("producto_terminado")
      .update({
        cantidad_disponible: existente.cantidad_disponible + cantidad_botellas_terminadas,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", existente.id);
  } else {
    await supabaseAdmin.from("producto_terminado").insert({
      presentacion_id: molde.presentacion_id,
      cantidad_disponible: cantidad_botellas_terminadas,
    });
  }

  return NextResponse.json({ ok: true, lote });
}
