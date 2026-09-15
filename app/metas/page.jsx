import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import MetasPanel from "./MetasPanel";

export default async function MetasPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/metas">
      <MetasPanel />
    </AppShell>
  );
}
