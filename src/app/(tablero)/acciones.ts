"use server";

import { cookies } from "next/headers";
import { COOKIE_SESION, sesionValida } from "@/lib/auth/sesion";
import { obtenerTablero } from "@/lib/datos/tablero";
import type { DatosTablero } from "@/lib/datos/tipos";

/**
 * Vuelve a leer la base para el botón «Actualizar» del encabezado.
 *
 * Una server action es un POST alcanzable por fuera de la interfaz: valida la sesión ella misma,
 * no confía en que `proxy.ts` ya lo hizo.
 */
export async function actualizarTablero(): Promise<DatosTablero | null> {
  const sesion = (await cookies()).get(COOKIE_SESION)?.value;
  // `null` = sesión vencida; el cliente lleva al acceso.
  if (!(await sesionValida(sesion))) return null;
  return obtenerTablero();
}
