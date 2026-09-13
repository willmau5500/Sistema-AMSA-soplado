import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import ProduccionWizard from "./ProduccionWizard";

export default async function ProduccionPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;

  if (!sesion) {
    redirect("/login");
  }

  return <ProduccionWizard nombreOperario={sesion.nombre} />;
}
