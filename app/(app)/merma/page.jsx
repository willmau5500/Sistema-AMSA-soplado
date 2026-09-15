import { cookies } from "next/headers";
import { leerSesion } from "@/lib/session";
import MermaForm from "./MermaForm";

export default async function MermaPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = await leerSesion(token);
  return <MermaForm nombreOperario={sesion.nombre} />;
}
