import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { TIPO_PARADA_LABEL } from "@/lib/constantes";

const NAVY = "FF123B7A";
const TEAL = "FF3FC6B8";
const LIGHT = "FFF4F6F8";
const WHITE = "FFFFFFFF";

function headerRow(sheet, row, labels) {
  const r = sheet.getRow(row);
  labels.forEach((label, i) => {
    const cell = r.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
  });
  r.height = 20;
}

function styleDataRow(row, striped) {
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: "FFE2E6EA" } } };
    if (striped) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    }
  });
}

export async function GET(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Faltan las fechas del periodo." }, { status: 400 });
  }

  const hastaFin = hasta + "T23:59:59.999Z";
  const desdeInicio = desde + "T00:00:00.000Z";

  const [lotesRes, mermaRes, paradasRes, metasRes] = await Promise.all([
    supabaseAdmin
      .from("lotes_produccion")
      .select(
        "codigo_lote, fecha, cantidad_materia_prima_kg, cantidad_preformas, cantidad_botellas_terminadas, maquinas(nombre), turnos(nombre), moldes(codigo, nombre), presentaciones(nombre), materia_prima(nombre)"
      )
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha"),
    supabaseAdmin
      .from("merma")
      .select("etapa, tipo, peso_kg, observacion, creado_en, lotes_produccion(codigo_lote)")
      .gte("creado_en", desdeInicio)
      .lte("creado_en", hastaFin)
      .order("creado_en"),
    supabaseAdmin
      .from("paradas_maquina")
      .select("fecha, tipo_parada, duracion_minutos, observacion, maquinas(nombre), turnos(nombre)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha"),
    supabaseAdmin
      .from("metas_produccion")
      .select("meta_botellas")
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);

  const lotes = lotesRes.data || [];
  const merma = mermaRes.data || [];
  const paradas = paradasRes.data || [];
  const metas = metasRes.data || [];

  const totalBotellas = lotes.reduce((s, l) => s + (l.cantidad_botellas_terminadas || 0), 0);
  const totalPreformas = lotes.reduce((s, l) => s + (l.cantidad_preformas || 0), 0);
  const totalMermaKg = merma.reduce((s, m) => s + (m.peso_kg || 0), 0);
  const totalMinutosParada = paradas.reduce((s, p) => s + (p.duracion_minutos || 0), 0);
  const totalMeta = metas.reduce((s, m) => s + (m.meta_botellas || 0), 0);
  const cumplimiento = totalMeta > 0 ? Math.round((totalBotellas / totalMeta) * 100) : null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Multisoplado";
  workbook.created = new Date();

  // ================= RESUMEN =================
  const resumen = workbook.addWorksheet("Resumen");
  resumen.mergeCells("A1:B1");
  resumen.getCell("A1").value = "Reporte de Producción — Multisoplado S.A.S.";
  resumen.getCell("A1").font = { bold: true, size: 15, color: { argb: NAVY } };
  resumen.mergeCells("A2:B2");
  resumen.getCell("A2").value = `Periodo: ${desde} a ${hasta}`;
  resumen.getCell("A2").font = { italic: true, color: { argb: "FF5B6B7A" }, size: 11 };

  const kpis = [
    ["Botellas producidas", totalBotellas],
    ["Preformas utilizadas", totalPreformas],
    ["Merma acumulada (kg)", Math.round(totalMermaKg * 10) / 10],
    ["Minutos perdidos por paradas", totalMinutosParada],
    ["Cumplimiento vs. meta", cumplimiento === null ? "Sin metas definidas" : `${cumplimiento}%`],
  ];
  let row = 4;
  kpis.forEach(([label, value]) => {
    resumen.getCell(`A${row}`).value = label;
    resumen.getCell(`A${row}`).font = { bold: true, color: { argb: "FF5B6B7A" } };
    resumen.getCell(`B${row}`).value = value;
    resumen.getCell(`B${row}`).font = { bold: true, size: 13, color: { argb: NAVY } };
    resumen.getCell(`B${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    row++;
  });
  resumen.getColumn(1).width = 28;
  resumen.getColumn(2).width = 22;

  // ================= PRODUCCIÓN =================
  const prod = workbook.addWorksheet("Producción");
  const prodCols = ["Código de lote", "Fecha", "Máquina", "Turno", "Molde", "Presentación", "Materia prima", "MP usada (kg)", "Preformas", "Botellas terminadas"];
  headerRow(prod, 1, prodCols);
  lotes.forEach((l, i) => {
    const r = prod.getRow(i + 2);
    r.values = [
      l.codigo_lote,
      l.fecha,
      l.maquinas?.nombre || "—",
      l.turnos?.nombre || "—",
      l.moldes ? `${l.moldes.codigo} — ${l.moldes.nombre}` : "—",
      l.presentaciones?.nombre || "—",
      l.materia_prima?.nombre || "—",
      l.cantidad_materia_prima_kg,
      l.cantidad_preformas,
      l.cantidad_botellas_terminadas,
    ];
    styleDataRow(r, i % 2 === 1);
  });
  prodCols.forEach((_, i) => (prod.getColumn(i + 1).width = 18));
  prod.views = [{ state: "frozen", ySplit: 1 }];

  // ================= MERMA =================
  const merSheet = workbook.addWorksheet("Merma");
  const merCols = ["Lote", "Fecha", "Etapa", "Tipo", "Peso (kg)", "Observación"];
  headerRow(merSheet, 1, merCols);
  merma.forEach((m, i) => {
    const r = merSheet.getRow(i + 2);
    r.values = [
      m.lotes_produccion?.codigo_lote || "—",
      new Date(m.creado_en).toLocaleDateString("es-CO"),
      m.etapa === "preforma" ? "Preforma" : "Soplado",
      m.tipo === "producto_danado" ? "Producto dañado" : "Merma",
      m.peso_kg,
      m.observacion || "",
    ];
    styleDataRow(r, i % 2 === 1);
  });
  merCols.forEach((_, i) => (merSheet.getColumn(i + 1).width = 20));
  merSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ================= PARADAS =================
  const parSheet = workbook.addWorksheet("Paradas");
  const parCols = ["Fecha", "Máquina", "Turno", "Tipo de parada", "Duración (min)", "Observación"];
  headerRow(parSheet, 1, parCols);
  paradas.forEach((p, i) => {
    const r = parSheet.getRow(i + 2);
    r.values = [
      p.fecha,
      p.maquinas?.nombre || "—",
      p.turnos?.nombre || "—",
      TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada,
      p.duracion_minutos,
      p.observacion || "",
    ];
    styleDataRow(r, i % 2 === 1);
  });
  parCols.forEach((_, i) => (parSheet.getColumn(i + 1).width = 20));
  parSheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_multisoplado_${desde}_a_${hasta}.xlsx"`,
    },
  });
}
