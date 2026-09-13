import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/session";
import MermaForm from "./MermaForm";

export default async function MermaPage() {
  const token = cookies().get("sesion")?.value;
  const sesion = token ? await leerSesion(token) : null;

  if (!sesion) {
    redirect("/login");
  }

  return <MermaForm nombreOperario={sesion.nombre} />;
}
