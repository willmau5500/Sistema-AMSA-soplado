import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import AppShell from "@/app/components/AppShell";
import AdminTable from "@/app/components/AdminTable";

export default async function AdminProveedoresPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/dashboard");

  return (
    <AppShell nombre={sesion.nombre} rol={sesion.rol} paginaActual="/admin/proveedores">
      <div style={{ padding: "28px 32px 60px 32px", maxWidth: 900, margin: "0 auto" }}>
        <AdminTable
          tabla="proveedores"
          titulo="Proveedores de materia prima"
          campos={[
            { key: "nombre", label: "Nombre", type: "text" },
            { key: "nit", label: "NIT", type: "text" },
            { key: "contacto", label: "Contacto", type: "text" },
            { key: "telefono", label: "Teléfono", type: "text" },
            { key: "activo", label: "Activo", type: "checkbox", default: true },
          ]}
        />
      </div>
    </AppShell>
  );
}
