import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { calcularOEE, oeeGlobal } from "@/lib/oee";
import { generarAlertas } from "@/lib/alertas";
import { costosPorLote, puedeVerCostos } from "@/lib/costos";

const TZ = "America/Bogota";

// Fecha (YYYY-MM-DD) en hora de Bogotá, para no desfasar el "hoy" en el servidor (UTC).
function fechaBogota(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function horaBogota() {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()));
}

function inicioDeHoy() {
  return fechaBogota() + "T00:00:00-05:00";
}

function fechaHoy() {
  return fechaBogota();
}

function haceNDias(n) {
  return new Date(Date.now() - n * 86400000);
}

export async function GET() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = fechaHoy();
  const desde7dias = fechaBogota(haceNDias(6)); // incluye hoy = 7 días

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
    maquinasOeeRes,
    turnosRes,
    lotesOeeRes,
    paradasOeeRes,
    merma7Res,
    paradasHoyRes,
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
    supabaseAdmin.from("maquinas").select("id, nombre, capacidad_teorica_hora").eq("activo", true),
    supabaseAdmin.from("turnos").select("id, nombre, hora_inicio, hora_fin"),
    supabaseAdmin
      .from("lotes_produccion")
      .select("id, codigo_lote, fecha, maquina_id, turno_id, cantidad_materia_prima_kg, cantidad_preformas, cantidad_botellas_terminadas")
      .gte("fecha", desde7dias),
    supabaseAdmin
      .from("paradas_maquina")
      .select("fecha, maquina_id, turno_id, duracion_minutos")
      .gte("fecha", desde7dias),
    supabaseAdmin.from("merma").select("lote_id, peso_kg").gte("creado_en", desde7dias + "T00:00:00-05:00"),
    supabaseAdmin
      .from("paradas_maquina")
      .select("tipo_parada, duracion_minutos, maquinas(nombre)")
      .eq("fecha", hoy),
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
    const key = fechaBogota(d);
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

  // ---------- OEE (últimos 7 días) ----------
  const oeePorMaquina = calcularOEE({
    maquinas: maquinasOeeRes.data || [],
    turnos: turnosRes.data || [],
    lotes: lotesOeeRes.data || [],
    paradas: paradasOeeRes.data || [],
  });
  const oee = { global: oeeGlobal(oeePorMaquina), maquinas: oeePorMaquina };

  // ---------- Merma por máquina (últimos 7 días, kg) ----------
  const maquinaDeLote = {};
  (lotesOeeRes.data || []).forEach((l) => (maquinaDeLote[l.id] = l.maquina_id));
  const nombreMaquina = {};
  (maquinasOeeRes.data || []).forEach((m) => (nombreMaquina[m.id] = m.nombre));
  const mermaMaq = {};
  (merma7Res.data || []).forEach((m) => {
    const nombre = nombreMaquina[maquinaDeLote[m.lote_id]] || "Sin máquina";
    mermaMaq[nombre] = (mermaMaq[nombre] || 0) + (m.peso_kg || 0);
  });
  const mermaPorMaquina = Object.entries(mermaMaq)
    .map(([nombre, kg]) => ({ nombre, kg: Math.round(kg * 100) / 100 }))
    .sort((a, b) => b.kg - a.kg);

  // ---------- Costos (últimos 7 días; solo coordinador y administrador) ----------
  let costos = null;
  if (puedeVerCostos(sesion)) {
    const lotes7 = lotesOeeRes.data || [];
    const porLote = await costosPorLote(supabaseAdmin, lotes7.map((l) => l.id));
    let costoMp = 0, kgTotal = 0, kgConPrecio = 0, botellasConCosto = 0, perdida = 0;
    lotes7.forEach((l) => {
      kgTotal += Number(l.cantidad_materia_prima_kg) || 0;
      const c = porLote[l.id];
      if (c && c.costo > 0) {
        costoMp += c.costo;
        kgConPrecio += c.kgConPrecio;
        botellasConCosto += l.cantidad_botellas_terminadas || 0;
      }
    });
    (merma7Res.data || []).forEach((m) => {
      const p = porLote[m.lote_id]?.precioProm;
      if (p != null) perdida += (m.peso_kg || 0) * p;
    });
    costos = {
      costoMp: Math.round(costoMp),
      perdidaMerma: Math.round(perdida),
      costoPorBotella: botellasConCosto > 0 ? costoMp / botellasConCosto : null,
      coberturaPct: kgTotal > 0 ? Math.round((kgConPrecio / kgTotal) * 100) : null,
    };
  }

  // ---------- Alertas ----------
  const alertas = generarAlertas({
    stock: alertasStock,
    lotes7d: lotesOeeRes.data || [],
    merma7d: merma7Res.data || [],
    paradasHoy: paradasHoyRes.data || [],
    maquinas: maquinasRes.data || [],
    lotesHoy,
    cumplimiento,
    horaBogota: horaBogota(),
  });

  return NextResponse.json({
    oee,
    costos,
    mermaPorMaquina,
    alertas,
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
