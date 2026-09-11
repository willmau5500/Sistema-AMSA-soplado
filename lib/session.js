import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function crearSesion({ id, nombre, rol }) {
  return await new SignJWT({ id, nombre, rol })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function leerSesion(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { id, nombre, rol, iat, exp }
  } catch {
    return null; // token inválido, vencido o inexistente
  }
}
