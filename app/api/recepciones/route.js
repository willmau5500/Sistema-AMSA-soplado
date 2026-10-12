import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { puedeVerCostos } from "@/lib/costos";

async function sesionActual() {
  const token = cookies().get("sesion")?.value;
  return token ? await leerSesion(token) : null;
}

export async function GET() {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const verCostos = puedeVerCostos(sesion);
  const [recep, prov, mp] = await Promise.all([
    supabaseAdmin
      .from("recepciones_mp")
      .select("id, creado_en, fecha, lote_proveedor, factura, cantidad_kg, saldo_kg, observacion, proveedores(nombre), materia_prima(nombre)" + (verCostos ? ", precio_kg" : ""))
      .order("creado_en", { ascending: false })
      .limit(40),
    supabaseAdmin.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    supabaseAdmin.from("materia_prima").select("id, nombre").order("nombre"),
  ]);
  const error = recep.error || prov.error || mp.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recepciones: recep.data, proveedores: prov.data, materiaPrima: mp.data, verCostos });
}

export async function POST(request) {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (sesion.rol === "operario") {
    return NextResponse.json({ error: "Solo coordinadores y administradores registran recepciones." }, { status: 403 });
  }

  const { materia_prima_id, proveedor_id, lote_proveedor, factura, cantidad_kg, observacion, precio_kg } = await request.json();
  const precio = precio_kg === "" || precio_kg == null ? null : Number(precio_kg);
  if (precio !== null && (!(precio >= 0) || Number.isNaN(precio))) {
    return NextResponse.json({ error: "El precio por kg no es válido." }, { status: 400 });
  }
  const kg = Number(cantidad_kg);
  if (!materia_prima_id || !proveedor_id || !(kg > 0)) {
    return NextResponse.json({ error: "Materia prima, proveedor y una cantidad mayor a cero son obligatorios." }, { status: 400 });
  }

  const { data: mp } = await supabaseAdmin
    .from("materia_prima").select("id, nombre, stock_actual_kg").eq("id", materia_prima_id).maybeSingle();
  if (!mp) return NextResponse.json({ error: "No se encontró la materia prima." }, { status: 400 });

  const { data: rec, error } = await supabaseAdmin
    .from("recepciones_mp")
    .insert({
      materia_prima_id, proveedor_id,
      lote_proveedor: lote_proveedor?.trim() || null,
      factura: factura?.trim() || null,
      cantidad_kg: kg, saldo_kg: kg, precio_kg: precio,
      usuario_id: String(sesion.id),
      observacion: observacion?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Suma al inventario y deja el movimiento de entrada
  await supabaseAdmin
    .from("materia_prima")
    .update({ stock_actual_kg: Number(mp.stock_actual_kg) + kg })
    .eq("id", materia_prima_id);

  await supabaseAdmin.from("movimientos_materia_prima").insert({
    materia_prima_id,
    tipo: "entrada",
    cantidad_kg: kg,
    usuario_id: sesion.id,
    observacion: `Recepción #${rec.id}${factura ? " · factura " + factura : ""}${lote_proveedor ? " · lote prov. " + lote_proveedor : ""}`,
  });

  await registrarAuditoria({
    sesion, accion: "crear", entidad: "recepcion", entidadId: rec.id,
    detalle: `Recepción de ${kg} kg de ${mp.nombre}`,
    datos: { materia_prima_id, proveedor_id, lote_proveedor: lote_proveedor || null, factura: factura || null, cantidad_kg: kg, precio_kg: precio },
  });

  return NextResponse.json({ ok: true, id: rec.id });
}
