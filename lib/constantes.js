export const TIPOS_PARADA = [
  { value: "mecanica", label: "Mecánica" },
  { value: "electrica", label: "Eléctrica" },
  { value: "falta_materia_prima", label: "Falta de materia prima" },
  { value: "cambio_formato", label: "Cambio de formato" },
  { value: "mantenimiento_programado", label: "Mantenimiento programado" },
  { value: "calidad", label: "Calidad" },
  { value: "otro", label: "Otro" },
];

export const TIPO_PARADA_LABEL = Object.fromEntries(
  TIPOS_PARADA.map((t) => [t.value, t.label])
);
