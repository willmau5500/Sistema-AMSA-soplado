import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";

const POR_PAGINA = 50;

export async function GET(request) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (sesion.rol !== "admin") return NextResponse.json({ error: "Solo un administrador puede ver la auditoría." }, { status: 403 });

  const sp = new URL(request.url).searchParams;
  const pagina = Math.max(0, Number(sp.get("pagina") || 0));
  const accion = sp.get("accion");
  const entidad = sp.get("entidad");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const q = (sp.get("q") || "").trim().replace(/[%,()]/g, "");

  let query = supabaseAdmin
    .from("auditoria")
    .select("id, creado_en, usuario_nombre, rol, accion, entidad, entidad_id, detalle, datos", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

  if (accion) query = query.eq("accion", accion);
  if (entidad) query = query.eq("entidad", entidad);
  if (desde) query = query.gte("creado_en", desde + "T00:00:00-05:00");
  if (hasta) query = query.lte("creado_en", hasta + "T23:59:59-05:00");
  if (q) query = query.or(`usuario_nombre.ilike.%${q}%,detalle.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registros: data || [], total: count || 0, porPagina: POR_PAGINA });
}
