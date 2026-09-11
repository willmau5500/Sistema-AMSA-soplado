import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;

  if (!sesion) {
    redirect("/login");
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 48 }}>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Hola, {sesion.nombre} 👋
      </h1>
      <p>
        Sesión iniciada como <strong>{sesion.rol}</strong>.
      </p>
      <p style={{ color: "#8B948C" }}>
        Este es un placeholder — aquí va el Tablero de Control Gerencial
        (KPIs, estado de máquinas, cumplimiento de metas) que armamos
        siguiendo el patrón de AMSA.
      </p>

      <LogoutButton />
    </div>
  );
}
