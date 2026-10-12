// Lista blanca de tablas editables desde el panel de administración genérico.
// CRÍTICO: nunca se debe permitir que un parámetro de la URL toque
// supabaseAdmin.from(tabla) sin pasar primero por esta lista.

export const TABLAS_ADMIN = {
  maquinas: {
    columnas: ["nombre", "capacidad_teorica_hora", "activo"],
    numericas: ["capacidad_teorica_hora"],
    booleanas: ["activo"],
  },
  turnos: {
    columnas: ["nombre", "hora_inicio", "hora_fin"],
    numericas: [],
    booleanas: [],
  },
  materia_prima: {
    columnas: ["nombre", "unidad_medida", "stock_actual_kg", "stock_minimo_kg"],
    numericas: ["stock_actual_kg", "stock_minimo_kg"],
    booleanas: [],
  },
  presentaciones: {
    columnas: ["nombre", "capacidad_ml", "peso_preforma_g", "peso_botella_g", "activo"],
    numericas: ["capacidad_ml", "peso_preforma_g", "peso_botella_g"],
    booleanas: ["activo"],
  },
  proveedores: {
    columnas: ["nombre", "nit", "contacto", "telefono", "activo"],
    numericas: [],
    booleanas: ["activo"],
  },
  moldes: {
    columnas: ["codigo", "nombre", "presentacion_id", "activo"],
    numericas: ["presentacion_id"],
    booleanas: ["activo"],
  },
};

export function limpiarBody(tabla, body) {
  const config = TABLAS_ADMIN[tabla];
  const limpio = {};
  for (const col of config.columnas) {
    if (body[col] === undefined) continue;
    if (config.numericas.includes(col)) {
      limpio[col] = body[col] === "" || body[col] === null ? null : Number(body[col]);
    } else if (config.booleanas.includes(col)) {
      limpio[col] = Boolean(body[col]);
    } else {
      limpio[col] = body[col];
    }
  }
  return limpio;
}
