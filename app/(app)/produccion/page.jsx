import { cookies } from "next/headers";
import { leerSesion } from "@/lib/session";
import ProduccionWizard from "./ProduccionWizard";

export default async function ProduccionPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = await leerSesion(token);
  return <ProduccionWizard nombreOperario={sesion.nombre} />;
}
