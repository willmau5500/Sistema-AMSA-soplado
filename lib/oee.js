// Cálculo de OEE = Disponibilidad x Rendimiento x Calidad, por máquina.
//  - Disponibilidad: (tiempo planificado - minutos de parada) / tiempo planificado.
//    El tiempo planificado es la duración de cada turno en que la máquina
//    produjo o tuvo paradas (por día).
//  - Rendimiento: preformas procesadas / (capacidad teórica por hora x horas operativas).
//  - Calidad: botellas terminadas / preformas procesadas.
// Todos los factores se limitan a 100 %.

export function minutosDeTurno(inicio, fin) {
  if (!inicio || !fin) return 0;
  const aMin = (h) => {
    const [hh, mm] = String(h).split(":");
    return Number(hh) * 60 + Number(mm || 0);
  };
  let d = aMin(fin) - aMin(inicio);
  if (d <= 0) d += 24 * 60; // turno nocturno que cruza medianoche
  return d;
}

const clamp = (x) => Math.max(0, Math.min(1, x));

export function calcularOEE({ maquinas, turnos, lotes, paradas }) {
  const duracionTurno = {};
  turnos.forEach((t) => (duracionTurno[t.id] = minutosDeTurno(t.hora_inicio, t.hora_fin)));

  const porMaquina = {};
  const get = (id) =>
    (porMaquina[id] = porMaquina[id] || { combos: new Set(), paradaMin: 0, preformas: 0, botellas: 0 });

  lotes.forEach((l) => {
    const m = get(l.maquina_id);
    m.combos.add(`${l.fecha}|${l.turno_id}`);
    m.preformas += l.cantidad_preformas || 0;
    m.botellas += l.cantidad_botellas_terminadas || 0;
  });
  paradas.forEach((p) => {
    const m = get(p.maquina_id);
    m.combos.add(`${p.fecha}|${p.turno_id}`);
    m.paradaMin += p.duracion_minutos || 0;
  });

  return maquinas.map((mq) => {
    const m = porMaquina[mq.id];
    if (!m) return { id: mq.id, nombre: mq.nombre, sinDatos: true };
    let planificado = 0;
    m.combos.forEach((c) => (planificado += duracionTurno[c.split("|")[1]] || 0));
    if (planificado <= 0) return { id: mq.id, nombre: mq.nombre, sinDatos: true };

    const operativo = Math.max(0, planificado - m.paradaMin);
    const disp = clamp(operativo / planificado);
    const teorico = mq.capacidad_teorica_hora ? mq.capacidad_teorica_hora * (operativo / 60) : 0;
    const rend = teorico > 0 ? clamp(m.preformas / teorico) : null;
    const cal = m.preformas > 0 ? clamp(m.botellas / m.preformas) : null;
    const oee = rend !== null && cal !== null ? disp * rend * cal : null;
    return {
      id: mq.id, nombre: mq.nombre, disponibilidad: disp, rendimiento: rend, calidad: cal, oee,
      botellas: m.botellas, paradaMin: m.paradaMin, planificadoMin: planificado,
    };
  });
}

export function oeeGlobal(filas) {
  const v = filas.filter((f) => f.oee != null);
  if (!v.length) return null;
  const w = v.reduce((s, f) => s + f.planificadoMin, 0);
  const avg = (k) => v.reduce((s, f) => s + f[k] * f.planificadoMin, 0) / w;
  return { oee: avg("oee"), disponibilidad: avg("disponibilidad"), rendimiento: avg("rendimiento"), calidad: avg("calidad") };
}
