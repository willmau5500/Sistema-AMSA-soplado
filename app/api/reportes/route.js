import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { TIPO_PARADA_LABEL } from "@/lib/constantes";
import { costosPorLote, puedeVerCostos } from "@/lib/costos";

const BRAND = "FF123B7A";
const BLUE = "FF2A6FE0";
const TEAL = "FF3FC6B8";
const AMBER = "FFE8823A";
const INK = "FF1F2937";
const INK_SOFT = "FF6B7280";
const LINE = "FFE5E7EB";
const ROW_ALT = "FFF9FAFB";
const WHITE = "FFFFFFFF";
const WARN = "FFB7791F";
const CRIT = "FFB42318";

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function pagina(sheet, titulosFila) {
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    ...(titulosFila ? { printTitlesRow: titulosFila } : {}),
  };
  sheet.headerFooter = { oddFooter: "&LMultisoplado S.A.S.&CPágina &P de &N&R&D" };
}

function encabezado(sheet, titulo, subtitulo, ncols) {
  sheet.mergeCells(1, 1, 1, ncols);
  const t = sheet.getCell(1, 1);
  t.value = titulo;
  t.font = { bold: true, size: 15, color: { argb: WHITE } };
  t.fill = fill(BRAND);
  t.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 30;
  sheet.mergeCells(2, 1, 2, ncols);
  const s = sheet.getCell(2, 1);
  s.value = subtitulo;
  s.font = { italic: true, size: 10, color: { argb: INK_SOFT } };
  s.alignment = { indent: 1 };
}

function cabecera(sheet, fila, labels) {
  const r = sheet.getRow(fila);
  labels.forEach((label, i) => {
    const c = r.getCell(i + 1);
    c.value = label;
    c.font = { bold: true, color: { argb: WHITE }, size: 10 };
    c.fill = fill(BLUE);
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  r.height = 22;
  sheet.autoFilter = { from: { row: fila, column: 1 }, to: { row: fila, column: labels.length } };
}

function estiloFila(row, i, ncols) {
  for (let c = 1; c <= ncols; c++) {
    const cell = row.getCell(c);
    cell.border = { bottom: { style: "thin", color: { argb: LINE } } };
    cell.font = { ...(cell.font || {}), size: 10, color: cell.font?.color || { argb: INK } };
    if (i % 2 === 1) cell.fill = fill(ROW_ALT);
  }
}

function fila_total(sheet, fila, valores, ncols) {
  const r = sheet.getRow(fila);
  r.values = valores;
  for (let c = 1; c <= ncols; c++) {
    const cell = r.getCell(c);
    cell.font = { bold: true, size: 10, color: { argb: BRAND } };
    cell.border = { top: { style: "medium", color: { argb: BRAND } } };
  }
}

function kpi(sheet, col, fila, etiqueta, valor, color, formato) {
  const l = sheet.getCell(fila, col);
  l.value = etiqueta.toUpperCase();
  l.font = { bold: true, size: 8, color: { argb: INK_SOFT } };
  l.alignment = { vertical: "bottom", indent: 1 };
  const v = sheet.getCell(fila + 1, col);
  v.value = valor;
  v.font = { bold: true, size: 20, color: { argb: INK } };
  v.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  if (formato) v.numFmt = formato;
  v.border = { bottom: { style: "thick", color: { argb: color } } };
  l.fill = fill(ROW_ALT);
  v.fill = fill(ROW_ALT);
  sheet.getRow(fila + 1).height = 34;
}

function top(obj) {
  const e = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
  return e || null;
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
        "id, codigo_lote, fecha, cantidad_materia_prima_kg, cantidad_preformas, cantidad_botellas_terminadas, maquinas(nombre), turnos(nombre), moldes(codigo, nombre), presentaciones(nombre), materia_prima(nombre)"
      )
      .gte("fecha", desde).lte("fecha", hasta).order("fecha"),
    supabaseAdmin
      .from("merma")
      .select("lote_id, etapa, tipo, peso_kg, observacion, creado_en, lotes_produccion(codigo_lote)")
      .gte("creado_en", desdeInicio).lte("creado_en", hastaFin).order("creado_en"),
    supabaseAdmin
      .from("paradas_maquina")
      .select("fecha, tipo_parada, duracion_minutos, observacion, maquinas(nombre), turnos(nombre)")
      .gte("fecha", desde).lte("fecha", hasta).order("fecha"),
    supabaseAdmin
      .from("metas_produccion")
      .select("meta_botellas")
      .gte("fecha", desde).lte("fecha", hasta),
  ]);

  const lotes = lotesRes.data || [];
  const merma = mermaRes.data || [];
  const paradas = paradasRes.data || [];
  const metas = metasRes.data || [];

  // Costos (solo coordinador y administrador)
  const verCostos = puedeVerCostos(sesion);
  const costoLote = verCostos ? await costosPorLote(supabaseAdmin, lotes.map((l) => l.id)) : {};
  const perdidaMerma = (m) => {
    const p = costoLote[m.lote_id]?.precioProm;
    return p != null ? (m.peso_kg || 0) * p : null;
  };
  const totalCostoMp = Object.values(costoLote).reduce((s, c) => s + c.costo, 0);
  const totalPerdida = merma.reduce((s, m) => s + (perdidaMerma(m) || 0), 0);

  const totalBotellas = lotes.reduce((s, l) => s + (l.cantidad_botellas_terminadas || 0), 0);
  const totalPreformas = lotes.reduce((s, l) => s + (l.cantidad_preformas || 0), 0);
  const totalMermaKg = merma.reduce((s, m) => s + (m.peso_kg || 0), 0);
  const totalMin = paradas.reduce((s, p) => s + (p.duracion_minutos || 0), 0);
  const totalMeta = metas.reduce((s, m) => s + (m.meta_botellas || 0), 0);
  const cumplimiento = totalMeta > 0 ? totalBotellas / totalMeta : null;
  const tasaMerma = totalPreformas > 0 ? totalMermaKg / totalPreformas : null; // kg por preforma (referencial)

  const porMaquina = {};
  lotes.forEach((l) => {
    const n = l.maquinas?.nombre || "Sin máquina";
    porMaquina[n] = porMaquina[n] || { lotes: 0, preformas: 0, botellas: 0, minutos: 0, paradas: 0 };
    porMaquina[n].lotes++;
    porMaquina[n].preformas += l.cantidad_preformas || 0;
    porMaquina[n].botellas += l.cantidad_botellas_terminadas || 0;
  });
  paradas.forEach((p) => {
    const n = p.maquinas?.nombre || "Sin máquina";
    porMaquina[n] = porMaquina[n] || { lotes: 0, preformas: 0, botellas: 0, minutos: 0, paradas: 0 };
    porMaquina[n].minutos += p.duracion_minutos || 0;
    porMaquina[n].paradas++;
  });

  const porDia = {};
  lotes.forEach((l) => {
    porDia[l.fecha] = porDia[l.fecha] || { lotes: 0, botellas: 0, preformas: 0 };
    porDia[l.fecha].lotes++;
    porDia[l.fecha].botellas += l.cantidad_botellas_terminadas || 0;
    porDia[l.fecha].preformas += l.cantidad_preformas || 0;
  });

  const minPorTipo = {};
  paradas.forEach((p) => {
    const t = TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada;
    minPorTipo[t] = (minPorTipo[t] || 0) + (p.duracion_minutos || 0);
  });
  const mermaPorTipo = { Merma: 0, "Producto dañado": 0 };
  merma.forEach((m) => {
    mermaPorTipo[m.tipo === "producto_danado" ? "Producto dañado" : "Merma"] += m.peso_kg || 0;
  });

  const maquinaTop = top(Object.fromEntries(Object.entries(porMaquina).map(([k, v]) => [k, v.botellas])));
  const paradaTop = top(minPorTipo);
  const generado = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const sub = `Periodo: ${desde} a ${hasta}   |   Generado: ${generado}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema Multisoplado";
  wb.created = new Date();

  // ============ RESUMEN ============
  const rs = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  rs.getColumn(1).width = 2;
  for (let c = 2; c <= 9; c++) rs.getColumn(c).width = 16;
  encabezado(rs, "Reporte de Producción — Multisoplado S.A.S.", sub, 9);
  // KPI cards: cada una ocupa 2 columnas (B-C, D-E, F-G, H-I)
  const tarjeta = (col, fila, et, val, color, fmt) => {
    kpi(rs, col, fila, et, val, color, fmt);
    rs.mergeCells(fila, col, fila, col + 1);
    rs.mergeCells(fila + 1, col, fila + 1, col + 1);
    rs.getCell(fila + 1, col + 1).border = { bottom: { style: "thick", color: { argb: color } } };
  };
  tarjeta(2, 4, "Botellas producidas", totalBotellas, BLUE, "#,##0");
  tarjeta(4, 4, "Preformas utilizadas", totalPreformas, BLUE, "#,##0");
  tarjeta(6, 4, "Merma acumulada (kg)", Math.round(totalMermaKg * 10) / 10, AMBER, "#,##0.0");
  tarjeta(8, 4, "Minutos perdidos", totalMin, CRIT, "#,##0");
  tarjeta(2, 7, "Cumplimiento vs. meta", cumplimiento === null ? "Sin metas" : cumplimiento, TEAL, "0%");
  tarjeta(4, 7, "Lotes registrados", lotes.length, TEAL, "#,##0");
  tarjeta(6, 7, "Botellas por lote", lotes.length ? Math.round(totalBotellas / lotes.length) : 0, TEAL, "#,##0");
  tarjeta(8, 7, "Merma (kg / 1.000 preformas)", tasaMerma === null ? "—" : Math.round(tasaMerma * 10000) / 10, AMBER, "#,##0.0");

  if (verCostos) {
    tarjeta(2, 10, "Costo de materia prima", Math.round(totalCostoMp), BLUE, '"$"#,##0');
    tarjeta(4, 10, "Pérdida por merma", Math.round(totalPerdida), CRIT, '"$"#,##0');
    tarjeta(6, 10, "Costo MP por botella", totalBotellas > 0 && totalCostoMp > 0 ? Math.round(totalCostoMp / totalBotellas) : "—", TEAL, '"$"#,##0');
  }
  let f = verCostos ? 13 : 10;
  const nota = (txt) => {
    rs.mergeCells(f, 2, f, 9);
    const c = rs.getCell(f, 2);
    c.value = txt;
    c.font = { size: 10, color: { argb: INK } };
    c.alignment = { indent: 1 };
    f++;
  };
  if (maquinaTop) nota(`Máquina de mayor producción: ${maquinaTop[0]} (${maquinaTop[1].toLocaleString("es-CO")} botellas)`);
  if (paradaTop) nota(`Principal causa de parada: ${paradaTop[0]} (${paradaTop[1]} min)`);
  if (!lotes.length) nota("No hay lotes registrados en el periodo seleccionado.");

  // Tabla: causas de parada
  f += 1;
  const tablaSimple = (titulo, labels, filas, colInicio) => {
    const t = rs.getCell(f, colInicio);
    t.value = titulo;
    t.font = { bold: true, size: 11, color: { argb: BRAND } };
    labels.forEach((l, i) => {
      const c = rs.getCell(f + 1, colInicio + i);
      c.value = l;
      c.font = { bold: true, size: 9, color: { argb: WHITE } };
      c.fill = fill(BLUE);
      c.alignment = { horizontal: i ? "right" : "left", indent: 1 };
    });
    filas.forEach((fila, k) => {
      fila.forEach((v, i) => {
        const c = rs.getCell(f + 2 + k, colInicio + i);
        c.value = v;
        c.font = { size: 10, color: { argb: INK } };
        c.alignment = { horizontal: i ? "right" : "left", indent: 1 };
        c.border = { bottom: { style: "thin", color: { argb: LINE } } };
        if (k % 2 === 1) c.fill = fill(ROW_ALT);
        if (i && typeof v === "number") c.numFmt = "#,##0.0";
      });
    });
  };
  const filasParadas = Object.entries(minPorTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]);
  const filasMerma = Object.entries(mermaPorTipo).map(([k, v]) => [k, Math.round(v * 10) / 10]);
  tablaSimple("Paradas por causa", ["Causa", "Minutos"], filasParadas.length ? filasParadas : [["Sin paradas", 0]], 2);
  tablaSimple("Merma por tipo", ["Tipo", "Kg"], filasMerma, 6);
  pagina(rs);

  // ============ POR MÁQUINA ============
  const mq = wb.addWorksheet("Por máquina", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const mqCols = ["Máquina", "Lotes", "Preformas", "Botellas", "Rendimiento", "Paradas", "Minutos parada"];
  encabezado(mq, "Desempeño por máquina", sub, mqCols.length);
  cabecera(mq, 4, mqCols);
  const maqs = Object.entries(porMaquina).sort((a, b) => b[1].botellas - a[1].botellas);
  maqs.forEach(([n, v], i) => {
    const r = mq.getRow(5 + i);
    r.values = [n, v.lotes, v.preformas, v.botellas, v.preformas ? v.botellas / v.preformas : null, v.paradas, v.minutos];
    estiloFila(r, i, mqCols.length);
    r.getCell(5).numFmt = "0.0%";
    [2, 3, 4, 6, 7].forEach((c) => (r.getCell(c).numFmt = "#,##0"));
    if (v.minutos >= 60) r.getCell(7).font = { bold: true, size: 10, color: { argb: CRIT } };
  });
  if (maqs.length) {
    const fin = 4 + maqs.length;
    fila_total(mq, fin + 1, ["Total", { formula: `SUM(B5:B${fin})` }, { formula: `SUM(C5:C${fin})` }, { formula: `SUM(D5:D${fin})` }, totalPreformas ? totalBotellas / totalPreformas : null, { formula: `SUM(F5:F${fin})` }, { formula: `SUM(G5:G${fin})` }], mqCols.length);
    mq.getCell(fin + 1, 5).numFmt = "0.0%";
    [2, 3, 4, 6, 7].forEach((c) => (mq.getCell(fin + 1, c).numFmt = "#,##0"));
  }
  [24, 12, 16, 16, 14, 12, 16].forEach((w, i) => (mq.getColumn(i + 1).width = w));
  pagina(mq, "4:4");

  // ============ DIARIO ============
  const dr = wb.addWorksheet("Diario", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const drCols = ["Fecha", "Lotes", "Preformas", "Botellas", "Rendimiento"];
  encabezado(dr, "Producción diaria", sub, drCols.length);
  cabecera(dr, 4, drCols);
  const dias = Object.keys(porDia).sort();
  dias.forEach((d, i) => {
    const v = porDia[d];
    const r = dr.getRow(5 + i);
    r.values = [d, v.lotes, v.preformas, v.botellas, v.preformas ? v.botellas / v.preformas : null];
    estiloFila(r, i, drCols.length);
    r.getCell(5).numFmt = "0.0%";
    [2, 3, 4].forEach((c) => (r.getCell(c).numFmt = "#,##0"));
  });
  if (dias.length) {
    const fin = 4 + dias.length;
    fila_total(dr, fin + 1, ["Total", { formula: `SUM(B5:B${fin})` }, { formula: `SUM(C5:C${fin})` }, { formula: `SUM(D5:D${fin})` }, totalPreformas ? totalBotellas / totalPreformas : null], drCols.length);
    dr.getCell(fin + 1, 5).numFmt = "0.0%";
    [2, 3, 4].forEach((c) => (dr.getCell(fin + 1, c).numFmt = "#,##0"));
  }
  [16, 12, 16, 16, 14].forEach((w, i) => (dr.getColumn(i + 1).width = w));
  pagina(dr, "4:4");

  // ============ PRODUCCIÓN ============
  const pr = wb.addWorksheet("Producción", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const prCols = ["Código de lote", "Fecha", "Máquina", "Turno", "Molde", "Presentación", "Materia prima", "MP usada (kg)", "Preformas", "Botellas", ...(verCostos ? ["Costo MP ($)"] : [])];
  encabezado(pr, "Detalle de producción", sub, prCols.length);
  cabecera(pr, 4, prCols);
  lotes.forEach((l, i) => {
    const r = pr.getRow(5 + i);
    r.values = [
      l.codigo_lote, l.fecha, l.maquinas?.nombre || "—", l.turnos?.nombre || "—",
      l.moldes ? `${l.moldes.codigo} — ${l.moldes.nombre}` : "—",
      l.presentaciones?.nombre || "—", l.materia_prima?.nombre || "—",
      l.cantidad_materia_prima_kg, l.cantidad_preformas, l.cantidad_botellas_terminadas,
      ...(verCostos ? [costoLote[l.id]?.costo ? Math.round(costoLote[l.id].costo) : null] : []),
    ];
    estiloFila(r, i, prCols.length);
    if (verCostos) r.getCell(11).numFmt = '"$"#,##0';
    r.getCell(8).numFmt = "#,##0.0";
    r.getCell(9).numFmt = "#,##0";
    r.getCell(10).numFmt = "#,##0";
  });
  [20, 12, 16, 14, 24, 16, 18, 14, 14, 14, 16].forEach((w, i) => (pr.getColumn(i + 1).width = w));
  pagina(pr, "4:4");

  // ============ MERMA ============
  const me = wb.addWorksheet("Merma", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const meCols = ["Lote", "Fecha", "Etapa", "Tipo", "Peso (kg)", "Observación", ...(verCostos ? ["Pérdida ($)"] : [])];
  encabezado(me, "Merma y producto dañado (kg)", sub, meCols.length);
  cabecera(me, 4, meCols);
  merma.forEach((m, i) => {
    const r = me.getRow(5 + i);
    const dan = m.tipo === "producto_danado";
    r.values = [
      m.lotes_produccion?.codigo_lote || "—",
      new Date(m.creado_en).toLocaleDateString("es-CO", { timeZone: "America/Bogota" }),
      m.etapa === "preforma" ? "Preforma" : "Soplado",
      dan ? "Producto dañado" : "Merma",
      m.peso_kg, m.observacion || "",
      ...(verCostos ? [perdidaMerma(m) != null ? Math.round(perdidaMerma(m)) : null] : []),
    ];
    estiloFila(r, i, meCols.length);
    if (verCostos) r.getCell(7).numFmt = '"$"#,##0';
    r.getCell(5).numFmt = "#,##0.0";
    if (dan) r.getCell(4).font = { bold: true, size: 10, color: { argb: CRIT } };
  });
  if (merma.length) {
    const fin = 4 + merma.length;
    fila_total(me, fin + 1, ["Total", "", "", "", { formula: `SUM(E5:E${fin})` }, "", ...(verCostos ? [{ formula: `SUM(G5:G${fin})` }] : [])], meCols.length);
    if (verCostos) me.getCell(fin + 1, 7).numFmt = '"$"#,##0';
    me.getCell(fin + 1, 5).numFmt = "#,##0.0";
  }
  [20, 14, 14, 18, 12, 40, 16].forEach((w, i) => (me.getColumn(i + 1).width = w));
  pagina(me, "4:4");

  // ============ PARADAS ============
  const pa = wb.addWorksheet("Paradas", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const paCols = ["Fecha", "Máquina", "Turno", "Tipo de parada", "Duración (min)", "Observación"];
  encabezado(pa, "Paradas de máquina", sub, paCols.length);
  cabecera(pa, 4, paCols);
  paradas.forEach((p, i) => {
    const r = pa.getRow(5 + i);
    r.values = [
      p.fecha, p.maquinas?.nombre || "—", p.turnos?.nombre || "—",
      TIPO_PARADA_LABEL[p.tipo_parada] || p.tipo_parada, p.duracion_minutos, p.observacion || "",
    ];
    estiloFila(r, i, paCols.length);
    const d = p.duracion_minutos || 0;
    if (d >= 60) r.getCell(5).font = { bold: true, size: 10, color: { argb: CRIT } };
    else if (d >= 20) r.getCell(5).font = { bold: true, size: 10, color: { argb: WARN } };
  });
  if (paradas.length) {
    const fin = 4 + paradas.length;
    fila_total(pa, fin + 1, ["Total", "", "", "", { formula: `SUM(E5:E${fin})` }, ""], paCols.length);
  }
  [14, 18, 14, 24, 16, 40].forEach((w, i) => (pa.getColumn(i + 1).width = w));
  pagina(pa, "4:4");

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_multisoplado_${desde}_a_${hasta}.xlsx"`,
    },
  });
}
