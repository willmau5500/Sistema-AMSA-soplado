# Sistema Multisoplado

Sistema de producción de multisoplado de botellas para MULTISOPLADO S.A.S.
— de materia prima a producto terminado, con control de merma, metas de
producción y paradas de máquina.

## Stack

- **Frontend + Backend:** Next.js (App Router) — todo en un solo proyecto.
  Las páginas viven en `app/`, y las rutas de backend (funciones
  serverless) viven en `app/api/`.
- **Base de datos:** Supabase (Postgres), con Row Level Security activado.
  El backend usa la *service role key* para leer/escribir; el navegador
  nunca habla directo con Supabase.
- **Autenticación:** propia y simple — tabla `usuarios` con contraseña
  encriptada (bcrypt) y una cookie de sesión firmada (JWT con `jose`).
- **Despliegue:** Vercel, conectado a este repositorio de GitHub. Cada
  `git push` a `main` publica automáticamente.

## Cómo correrlo localmente

```bash
npm install
cp .env.local.example .env.local
# llena .env.local con la URL de Supabase, la service role key,
# y un SESSION_SECRET aleatorio (ver el propio archivo .env.local.example)
npm run dev
```

Abre `http://localhost:3000` — te va a redirigir a `/login`.

## Variables de entorno en Vercel

En el panel de Vercel: **Settings → Environment Variables**, agrega las
mismas tres variables de `.env.local.example` con sus valores reales.
Nunca subas `.env.local` a GitHub (ya está en `.gitignore`).

## Estructura

```
app/
  login/page.jsx        → pantalla de inicio de sesión
  dashboard/page.jsx     → placeholder del tablero (pendiente: KPIs y métricas)
  api/
    login/route.js       → valida usuario/contraseña, crea la cookie de sesión
    logout/route.js       → borra la cookie de sesión
lib/
  supabaseAdmin.js       → cliente de Supabase con la service role key (solo backend)
  session.js             → firma y verifica la cookie de sesión (JWT)
public/
  logo-multisoplado-white.png  → logo completo (texto en blanco, para fondos oscuros)
  logo-multisoplado-icon.png   → solo el ícono a color, recortado con transparencia real
```

## Pendiente

- Módulo de Registro de Producción (formulario del operario)
- Módulo de Registro de Merma
- Dashboard con KPIs (cumplimiento, merma acumulada, estado de máquinas)
- Módulos de administración (máquinas, usuarios, base de datos)
