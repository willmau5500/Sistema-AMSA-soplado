import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function haceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = fechaHoy();
  const desde7dias = haceNDias(6).toISOString().slice(0, 10); // incluye hoy = 7 días

  const [
    materiaPrimaRes,
    productoTerminadoRes,
    metasHoyRes,
    lotesHoyRes,
    lotes7diasRes,
    mermaHoyRes,
    maquinasRes,
    paradasMesRes,
    lotesRecientesRes,
  ] = await Promise.all([
    supabaseAdmin.from("materia_prima").select("id, nombre, stock_actual_kg, stock_minimo_kg"),
    supabaseAdmin.from("producto_terminado").select("cantidad_disponible"),
    supabaseAdmin.from("metas_produccion").select("meta_botellas").eq("fecha", hoy),
    supabaseAdmin.from("lotes_produccion").select("cantidad_botellas_terminadas, maquina_id").eq("fecha", hoy),
    supabaseAdmin
      .from("lotes_produccion")
      .select("fecha, cantidad_botellas_terminadas")
      .gte("fecha", desde7dias),
    supabaseAdmin.from("merma").select("peso_kg").gte("creado_en", inicioDeHoy()),
    supabaseAdmin.from("maquinas").select("id, nombre").eq("activo", true),
    supabaseAdmin
      .from("paradas_maquina")
      .select("tipo_parada, duracion_minutos")
      .gte("fecha", desde7dias),
    supabaseAdmin
      .from("lotes_produccion")
      .select("codigo_lote, cantidad_botellas_terminadas, creado_en, maquinas(nombre), turnos(nombre)")
      .order("creado_en", { ascending: false })
      .limit(8),
  ]);

  // ---------- Alertas de stock ----------
  const materiaPrima = materiaPrimaRes.data || [];
  const alertasStock = materiaPrima.filter((m) => m.stock_actual_kg < m.stock_minimo_kg);

  // ---------- Botellas en bodega ----------
  const botellasEnBodega = (productoTerminadoRes.data || []).reduce(
    (sum, p) => sum + (p.cantidad_disponible || 0),
    0
  );

  // ---------- Cumplimiento global de hoy ----------
  const metaHoy = (metasHoyRes.data || []).reduce((sum, m) => sum + (m.meta_botellas || 0), 0);
  const lotesHoy = lotesHoyRes.data || [];
  const producidoHoy = lotesHoy.reduce((sum, l) => sum + (l.cantidad_botellas_terminadas || 0), 0);
  const cumplimiento = metaHoy > 0 ? Math.round((producidoHoy / metaHoy) * 100) : null;

  // ---------- Merma acumulada hoy ----------
  const mermaHoyKg = (mermaHoyRes.data || []).reduce((sum, m) => sum + (m.peso_kg || 0), 0);

  // ---------- Tendencia de producción (últimos 7 días) ----------
  const porDia = {};
  for (let i = 6; i >= 0; i--) {
    const d = haceNDias(i);
    const key = d.toISOString().slice(0, 10);
    porDia[key] = 0;
  }
  (lotes7diasRes.data || []).forEach((l) => {
    if (porDia[l.fecha] !== undefined) {
      porDia[l.fecha] += l.cantidad_botellas_terminadas || 0;
    }
  });
  const tendencia = Object.entries(porDia).map(([fecha, botellas]) => ({ fecha, botellas }));

  // ---------- Estado de máquinas (hoy) ----------
  const maquinas = (maquinasRes.data || []).map((m) => {
    const lotesDeMaquina = lotesHoy.filter((l) => l.maquina_id === m.id);
    const botellasHoy = lotesDeMaquina.reduce((s, l) => s + (l.cantidad_botellas_terminadas || 0), 0);
    return { id: m.id, nombre: m.nombre, botellasHoy, activa: lotesDeMaquina.length > 0 };
  });

  // ---------- Paradas por tipo (últimos 7 días) ----------
  const minutosPorTipo = {};
  (paradasMesRes.data || []).forEach((p) => {
    minutosPorTipo[p.tipo_parada] = (minutosPorTipo[p.tipo_parada] || 0) + (p.duracion_minutos || 0);
  });
  const paradas = Object.entries(minutosPorTipo)
    .map(([tipo, minutos]) => ({ tipo, minutos }))
    .sort((a, b) => b.minutos - a.minutos);

  // ---------- Lotes recientes ----------
  const lotesRecientes = (lotesRecientesRes.data || []).map((l) => ({
    codigo_lote: l.codigo_lote,
    botellas: l.cantidad_botellas_terminadas,
    maquina: l.maquinas?.nombre || "—",
    turno: l.turnos?.nombre || "—",
    creado_en: l.creado_en,
  }));

  return NextResponse.json({
    alertasStock: { count: alertasStock.length, items: alertasStock },
    botellasEnBodega,
    cumplimiento,
    mermaHoyKg,
    tendencia,
    maquinas,
    paradas,
    lotesRecientes,
  });
}
