import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leerSesion } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";

export async function DELETE(request, { params }) {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: antes } = await supabaseAdmin.from("metas_produccion").select("*").eq("id", params.id).maybeSingle();

  const { error } = await supabaseAdmin
    .from("metas_produccion")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await registrarAuditoria({ sesion, accion: "eliminar", entidad: "meta", entidadId: params.id, detalle: antes ? `Meta ${antes.fecha} de ${antes.meta_botellas} botellas eliminada` : "Meta eliminada", datos: antes || null });

  return NextResponse.json({ ok: true });
}
