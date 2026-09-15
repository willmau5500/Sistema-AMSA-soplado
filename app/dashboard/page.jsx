import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/dashboard">
      <DashboardContent />
    </AppShell>
  );
}
