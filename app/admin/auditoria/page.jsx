import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import AuditoriaPanel from "./AuditoriaPanel";

export default async function AdminAuditoriaPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/dashboard");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/admin/auditoria">
      <AuditoriaPanel />
    </AppShell>
  );
}
