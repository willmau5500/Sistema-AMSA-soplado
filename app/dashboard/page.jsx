import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import Dashboard from "./Dashboard";

export default async function DashboardPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;

  if (!sesion) {
    redirect("/login");
  }

  return <Dashboard nombre={sesion.nombre} rol={sesion.rol} />;
}

