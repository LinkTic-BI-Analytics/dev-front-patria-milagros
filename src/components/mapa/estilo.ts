import type mapboxgl from "mapbox-gl";
import { RAMPA_MAPA } from "@/lib/datos/catalogos";

// Lo que comparten las capas del mapa: la escala de color y los atajos de expresiones.

export const RELLENO_VACIO = "rgba(78, 139, 224, 0.16)";

export const exp = (e: unknown) => e as mapboxgl.ExpressionSpecification;

export const estado = (clave: string) => exp(["boolean", ["feature-state", clave], false]);

/** Escala secuencial dorada sobre `feature-state.t` (0–1); `-1` = sin registros. */
export const colorPorT = exp([
  "case",
  ["<", ["coalesce", ["feature-state", "t"], -1], 0],
  RELLENO_VACIO,
  [
    "interpolate-lab",
    ["linear"],
    ["feature-state", "t"],
    0,
    RAMPA_MAPA[0],
    0.25,
    RAMPA_MAPA[1],
    0.5,
    RAMPA_MAPA[2],
    0.75,
    RAMPA_MAPA[3],
    1,
    RAMPA_MAPA[4],
  ],
]);

export { reducirMovimiento } from "@/lib/ui/movimiento";
