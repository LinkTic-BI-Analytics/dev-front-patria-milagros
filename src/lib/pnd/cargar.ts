import "server-only";
import catalogo from "./catalogo.json";

// Catálogo del PND: ejes, líneas, sectores y vocabulario para relacionar narrativas.
//
// Se importa con el código del servidor para que viaje con el despliegue. Solo sale al
// navegador lo que `obtenerTablero()` elige (nombres); el vocabulario de búsqueda se queda aquí.
// El documento del que se derivó no se versiona: vive en `top_secret/` en el equipo local.

export type PndLinea = { id: string; nombre: string; sectores: string[]; claves: string[] };
export type PndEje = {
  id: string;
  numero: number;
  nombre: string;
  vision: string;
  indicadores: number | null;
  area: string;
  lineas: PndLinea[];
};
export type PndCatalogo = { fuente: string; ejes: PndEje[] };

const esTextos = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

function esCatalogo(v: unknown): v is PndCatalogo {
  const c = v as PndCatalogo;
  return (
    typeof c?.fuente === "string" &&
    Array.isArray(c.ejes) &&
    c.ejes.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.numero === "number" &&
        typeof e.nombre === "string" &&
        typeof e.vision === "string" &&
        (typeof e.indicadores === "number" || e.indicadores === null) &&
        typeof e.area === "string" &&
        Array.isArray(e.lineas) &&
        e.lineas.every(
          (l) =>
            typeof l.id === "string" &&
            typeof l.nombre === "string" &&
            esTextos(l.sectores) &&
            esTextos(l.claves),
        ),
    )
  );
}

/** El catálogo, o `null` si alguien lo dejó con una forma inválida: el tablero sigue sin el módulo. */
export async function cargarPnd(): Promise<PndCatalogo | null> {
  if (esCatalogo(catalogo)) return catalogo;
  console.warn("El catálogo del PND no tiene la forma esperada: se omite el módulo.");
  return null;
}
