import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crearSesion } from "@/lib/session";

export async function POST(request) {
  const { usuario, password } = await request.json();

  if (!usuario || !password) {
    return NextResponse.json(
      { error: "Usuario y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  // Busca el usuario por email (o cambia a un campo "usuario" si prefieres
  // login por nombre de usuario en vez de correo).
  const { data: user, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre, email, rol, password_hash, activo")
    .eq("email", usuario)
    .single();

  if (error || !user || !user.activo) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const passwordValida = await bcrypt.compare(password, user.password_hash);
  if (!passwordValida) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const token = await crearSesion({
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
  });

  const response = NextResponse.json({
    ok: true,
    usuario: { nombre: user.nombre, rol: user.rol },
  });

  response.cookies.set("sesion", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });

  return response;
}
