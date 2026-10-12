import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import AdminTable from "@/app/components/AdminTable";

export default async function AdminMaquinasPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/dashboard");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/admin/maquinas">
      <div style={{ padding: "28px 32px 60px 32px", maxWidth: 900, margin: "0 auto" }}>
        <AdminTable
          tabla="maquinas"
          titulo="Máquinas sopladoras"
          campos={[
            { key: "nombre", label: "Nombre", type: "text" },
            { key: "capacidad_teorica_hora", label: "Capacidad (botellas/hora)", type: "number" },
            { key: "activo", label: "Activo", type: "checkbox", default: true },
          ]}
        />
      </div>
    </AppShell>
  );
}
