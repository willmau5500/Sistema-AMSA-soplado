import { createClient } from "@supabase/supabase-js";

// OJO: este cliente usa la service role key y SE SALTA todas las políticas
// de RLS. Solo se importa desde archivos dentro de app/api/ (backend),
// nunca desde un componente de cliente ("use client") ni desde el navegador.

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
