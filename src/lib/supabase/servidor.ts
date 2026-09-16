import "server-only";
import { createClient } from "@supabase/supabase-js";

// El esquema `participacion` no da permisos a anon/authenticated: solo la
// llave secreta lee, y por eso este cliente nunca sale del servidor.
export function clienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !llave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");

  return createClient(url, llave, {
    db: { schema: "participacion" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
