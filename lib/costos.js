// Costos de materia prima por lote, a partir del consumo FIFO (lote_consumos_mp)
// y el precio por kg de cada recepción (recepciones_mp.precio_kg).
// Solo coordinadores y administradores deben ver estos valores.

export const cop = (n) =>
  n == null ? "—" : Number(n).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export const puedeVerCostos = (sesion) => sesion?.rol === "admin" || sesion?.rol === "coordinador";

// Devuelve { [lote_id]: { costo, kg, kgConPrecio, precioProm } }
export async function costosPorLote(supabase, loteIds) {
  const out = {};
  const ids = [...new Set(loteIds)];
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabase
      .from("lote_consumos_mp")
      .select("lote_id, cantidad_kg, recepciones_mp(precio_kg)")
      .in("lote_id", ids.slice(i, i + 150));
    (data || []).forEach((c) => {
      const o = (out[c.lote_id] = out[c.lote_id] || { costo: 0, kg: 0, kgConPrecio: 0, precioProm: null });
      const kg = Number(c.cantidad_kg) || 0;
      o.kg += kg;
      const p = c.recepciones_mp?.precio_kg;
      if (p != null) {
        o.costo += kg * Number(p);
        o.kgConPrecio += kg;
      }
    });
  }
  Object.values(out).forEach((o) => {
    o.precioProm = o.kgConPrecio > 0 ? o.costo / o.kgConPrecio : null;
  });
  return out;
}
