"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESION,
  DURACION_SESION_S,
  crearSesion,
  igualesSeguro,
} from "@/lib/auth/sesion";

export type EstadoAcceso = { error: string | null; intento: number };

export async function ingresar(previo: EstadoAcceso, formData: FormData): Promise<EstadoAcceso> {
  const token = String(formData.get("token") ?? "");
  const esperado = process.env.ACCESS_TOKEN;

  if (!esperado) {
    return { error: "El acceso no está configurado en el servidor.", intento: previo.intento + 1 };
  }

  if (!token || !igualesSeguro(token, esperado)) {
    // Pausa corta para desalentar la fuerza bruta.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Token de acceso inválido. Verifíquelo e intente de nuevo.", intento: previo.intento + 1 };
  }

  (await cookies()).set(COOKIE_SESION, await crearSesion(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  });

  redirect("/");
}

export async function salir() {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/acceso");
}
