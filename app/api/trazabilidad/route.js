import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { costosPorLote, puedeVerCostos } from "@/lib/costos";

// GET /api/trazabilidad?q=Mol01   -> búsqueda (parcial) de lotes
// GET /api/trazabilidad?codigo=Mol01-07092615 -> historia completa del lote
export async function GET(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const codigo = (searchParams.get("codigo") || "").trim();
  const q = (searchParams.get("q") || "").trim().replace(/[%,()]/g, "");

  // ---------- Búsqueda / últimos lotes ----------
  if (!codigo) {
    let query = supabaseAdmin
      .from("lotes_produccion")
      .select("codigo_lote, fecha, cantidad_botellas_terminadas, maquinas(nombre), turnos(nombre)")
      .order("creado_en", { ascending: false })
      .limit(15);
    if (q) query = query.ilike("codigo_lote", `%${q}%`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resultados: data || [] });
  }

  // ---------- Detalle del lote ----------
  const { data: lote, error } = await supabaseAdmin
    .from("lotes_produccion")
    .select(
      "id, codigo_lote, fecha, creado_en, maquina_id, turno_id, operario_id, cantidad_materia_prima_kg, cantidad_preformas, cantidad_botellas_terminadas, maquinas(nombre), turnos(nombre, hora_inicio, hora_fin), moldes(codigo, nombre), presentaciones(nombre, capacidad_ml, peso_preforma_g, peso_botella_g), materia_prima(nombre)"
    )
    .eq("codigo_lote", codigo)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!lote) return NextResponse.json({ error: "No existe un lote con ese código." }, { status: 404 });

  const [mermaRes, movRes, paradasRes, operarioRes, origenRes] = await Promise.all([
    supabaseAdmin
      .from("merma")
      .select("id, etapa, tipo, peso_kg, observacion, creado_en")
      .eq("lote_id", lote.id)
      .order("creado_en"),
    supabaseAdmin
      .from("movimientos_materia_prima")
      .select("tipo, cantidad_kg, creado_en, observacion")
      .ilike("observacion", `%${lote.codigo_lote}%`),
    supabaseAdmin
      .from("paradas_maquina")
      .select("tipo_parada, hora_inicio, hora_fin, duracion_minutos, observacion")
      .eq("maquina_id", lote.maquina_id)
      .eq("turno_id", lote.turno_id)
      .eq("fecha", lote.fecha)
      .order("hora_inicio"),
    lote.operario_id
      ? supabaseAdmin.from("usuarios").select("nombre").eq("id", lote.operario_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from("lote_consumos_mp")
      .select("cantidad_kg, recepciones_mp(id, fecha, lote_proveedor, factura, precio_kg, proveedores(nombre))")
      .eq("lote_id", lote.id),
  ]);

  const merma = mermaRes.data || [];
  const mermaKg = merma.filter((m) => m.tipo === "merma").reduce((s, m) => s + (m.peso_kg || 0), 0);
  const danadoKg = merma.filter((m) => m.tipo === "producto_danado").reduce((s, m) => s + (m.peso_kg || 0), 0);
  const mp = lote.cantidad_materia_prima_kg || 0;
  const pre = lote.cantidad_preformas || 0;

  const resumen = {
    mermaKg,
    danadoKg,
    mermaPctMp: mp > 0 ? ((mermaKg + danadoKg) / mp) * 100 : null,
    rendimientoPct: pre > 0 ? (lote.cantidad_botellas_terminadas / pre) * 100 : null,
    preformasNoConvertidas: Math.max(0, pre - (lote.cantidad_botellas_terminadas || 0)),
  };

  let costos = null;
  let origen = origenRes.data || [];
  if (puedeVerCostos(sesion)) {
    const c = (await costosPorLote(supabaseAdmin, [lote.id]))[lote.id];
    if (c && c.costo > 0) {
      const perdida = c.precioProm != null ? (mermaKg + danadoKg) * c.precioProm : null;
      costos = {
        costoMp: Math.round(c.costo),
        perdida: perdida == null ? null : Math.round(perdida),
        porBotella: lote.cantidad_botellas_terminadas > 0 ? c.costo / lote.cantidad_botellas_terminadas : null,
        completo: c.kgConPrecio >= c.kg - 1e-6,
      };
    }
  } else {
    // El operario no ve precios
    origen = origen.map((o) => ({ ...o, recepciones_mp: o.recepciones_mp ? { ...o.recepciones_mp, precio_kg: undefined } : null }));
  }

  return NextResponse.json({
    costos,
    lote: { ...lote, operario: operarioRes.data?.nombre || null },
    merma,
    movimientos: movRes.data || [],
    paradas: paradasRes.data || [],
    origen,
    resumen,
  });
}
