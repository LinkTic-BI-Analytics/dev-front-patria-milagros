// Vista internacional: cuántas participaciones tiene cada país.
//
// La base todavía no registra país: hoy lo único con datos es Colombia, con sus totales
// nacionales, y el resto del mundo queda en cero. Cuando la base traiga países, este archivo
// es el único punto a cambiar: el mapa y el tooltip ya leen de aquí.

import type { Filtrados } from "./agregar";
import type { Metrica } from "./catalogos";

export const COLOMBIA_ISO = "COL";

export type CifrasPais = Record<Metrica, number>;

export function cifrasPorPais(f: Filtrados): Map<string, CifrasPais> {
  return new Map([
    [
      COLOMBIA_ISO,
      {
        aportes: f.aportes.length,
        necesidades: f.expedientes.length,
        alertas: f.alertas.filter((a) => !a.devuelta).length,
      },
    ],
  ]);
}

export const SIN_DATOS: CifrasPais = { aportes: 0, necesidades: 0, alertas: 0 };
