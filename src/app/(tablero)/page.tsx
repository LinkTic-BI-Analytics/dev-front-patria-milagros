import { connection } from "next/server";
import { preconnect } from "react-dom";
import { Tablero } from "@/components/tablero/Tablero";
import { obtenerTablero } from "@/lib/datos/tablero";
import { leerEstado } from "@/lib/datos/estadoUrl";

export default async function PaginaTablero({ searchParams }: PageProps<"/">) {
  // El mapa pedirá teselas a Mapbox en cuanto hidrate: se abre la conexión desde ya.
  preconnect("https://api.mapbox.com");
  // Datos vivos en cada solicitud.
  await connection();
  const [datos, params] = await Promise.all([obtenerTablero(), searchParams]);
  // La URL puede traer una vista compartida: territorio, métrica, filtros y pestaña.
  return <Tablero datos={datos} inicial={leerEstado(params, datos.pnd)} />;
}
