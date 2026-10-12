import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import BaseDatosPanel from "./BaseDatosPanel";

export default async function AdminBaseDatosPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/dashboard");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/admin/base-datos">
      <BaseDatosPanel />
    </AppShell>
  );
}
