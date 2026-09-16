import type { Metadata } from "next";
import { FormularioAcceso } from "./FormularioAcceso";

export const metadata: Metadata = {
  title: "Acceso · Sistema de Planeación Nacional",
};

export default function PaginaAcceso() {
  return <FormularioAcceso />;
}
