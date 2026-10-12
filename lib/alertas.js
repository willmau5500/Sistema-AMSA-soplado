// Reglas de alerta del dashboard. Umbrales ajustables aquí.
export const UMBRALES = {
  mermaLotePct: 3,        // % de merma (kg) sobre materia prima del lote
  paradaLargaMin: 60,     // minutos de una sola parada
  cumplimientoMinPct: 50, // cumplimiento mínimo esperado ...
  horaCorteCumplimiento: 14, // ... a partir de esta hora (Bogotá)
  horaSinRegistro: 10,    // máquina activa sin lotes después de esta hora
};

export function generarAlertas({ stock, lotes7d, merma7d, paradasHoy, maquinas, lotesHoy, cumplimiento, horaBogota }) {
  const out = [];

  stock.forEach((m) =>
    out.push({
      nivel: "critica", tipo: "stock",
      titulo: `Stock bajo: ${m.nombre}`,
      detalle: `${m.stock_actual_kg} kg disponibles, mínimo ${m.stock_minimo_kg} kg`,
    })
  );

  const mermaPorLote = {};
  merma7d.forEach((m) => (mermaPorLote[m.lote_id] = (mermaPorLote[m.lote_id] || 0) + (m.peso_kg || 0)));
  lotes7d.forEach((l) => {
    const kg = mermaPorLote[l.id];
    if (!kg || !l.cantidad_materia_prima_kg) return;
    const pct = (kg / l.cantidad_materia_prima_kg) * 100;
    if (pct >= UMBRALES.mermaLotePct)
      out.push({
        nivel: pct >= UMBRALES.mermaLotePct * 2 ? "critica" : "aviso", tipo: "merma",
        titulo: `Merma alta en lote ${l.codigo_lote}`,
        detalle: `${pct.toFixed(1)} % (${kg.toFixed(1)} kg) sobre la materia prima del lote`,
      });
  });

  paradasHoy.forEach((p) => {
    if ((p.duracion_minutos || 0) >= UMBRALES.paradaLargaMin)
      out.push({
        nivel: "aviso", tipo: "parada",
        titulo: `Parada larga en ${p.maquinas?.nombre || "máquina"}`,
        detalle: `${p.duracion_minutos} min por ${p.tipo_parada}`,
      });
  });

  if (cumplimiento !== null && horaBogota >= UMBRALES.horaCorteCumplimiento && cumplimiento < UMBRALES.cumplimientoMinPct)
    out.push({
      nivel: "aviso", tipo: "meta",
      titulo: "Meta del día en riesgo",
      detalle: `Cumplimiento de ${cumplimiento} % pasadas las ${UMBRALES.horaCorteCumplimiento}:00`,
    });

  if (horaBogota >= UMBRALES.horaSinRegistro)
    maquinas.forEach((m) => {
      if (!lotesHoy.some((l) => l.maquina_id === m.id))
        out.push({
          nivel: "info", tipo: "sin_registro",
          titulo: `${m.nombre} sin producción registrada hoy`,
          detalle: "No hay lotes registrados en el día",
        });
    });

  const orden = { critica: 0, aviso: 1, info: 2 };
  return out.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}
