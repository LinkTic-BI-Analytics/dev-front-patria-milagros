import { connection } from "next/server";
import { Tablero } from "@/components/tablero/Tablero";
import { obtenerTablero } from "@/lib/datos/tablero";

export default async function PaginaTablero() {
  // Datos vivos en cada solicitud.
  await connection();
  const datos = await obtenerTablero();
  return <Tablero datos={datos} />;
}
