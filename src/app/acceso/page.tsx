import type { Metadata } from "next";
import { FormularioAcceso } from "./FormularioAcceso";
import { rutaInterna } from "@/lib/auth/sesion";

export const metadata: Metadata = {
  title: "Acceso · Sistema de Escucha y Planeación Nacional",
};

export default async function PaginaAcceso({ searchParams }: PageProps<"/acceso">) {
  const { vencida, volver } = await searchParams;
  return (
    <FormularioAcceso
      vencida={vencida === "1"}
      volver={rutaInterna(typeof volver === "string" ? volver : null)}
    />
  );
}
