// La vista en la URL: sirve para compartir «lo que estoy viendo» sin explicarlo.
//
// Solo viaja lo que decide el Tablero (ámbito, territorio, métrica, filtros, 2D/3D y pestaña).
// La búsqueda y la vista de la tabla se quedan en el componente de narrativas: son de lectura,
// no de contexto, y alargarían el enlace sin aportar.

import type { Filtros } from "./agregar";
import { CANALES, TEMAS, SIN_TEMA, type Metrica } from "./catalogos";
import type { Canal, PndResumen } from "./tipos";

export type Pestana = "panorama" | "plan" | "narrativas";

export type EstadoVista = {
  ambito: "nacional" | "internacional";
  departamento: string | null;
  seleccion: string | null;
  metrica: Metrica;
  modo3d: boolean;
  filtros: Filtros;
  pestana: Pestana;
};

export const ESTADO_INICIAL: EstadoVista = {
  ambito: "nacional",
  departamento: null,
  seleccion: null,
  metrica: "aportes",
  modo3d: false,
  filtros: { temas: [], canales: [], ejes: [] },
  pestana: "panorama",
};

const METRICA_CORTA: Record<Metrica, string> = { aportes: "a", necesidades: "n", alertas: "l" };
const PESTANA_CORTA: Record<Pestana, string> = { panorama: "p", plan: "n", narrativas: "t" };
const divipola = (v: string | null) => (v && /^\d{2}(\d{3})?$/.test(v) ? v : null);

/** Lee el estado de una URL. Cualquier valor que no reconozca se ignora: nunca lanza. */
export function leerEstado(
  params: Record<string, string | string[] | undefined>,
  pnd: PndResumen | null,
): EstadoVista {
  const uno = (clave: string) => {
    const v = params[clave];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const lista = (clave: string) => (uno(clave) ?? "").split(",").filter(Boolean);

  const metrica = (Object.keys(METRICA_CORTA) as Metrica[]).find(
    (m) => METRICA_CORTA[m] === uno("m"),
  );
  const pestana = (Object.keys(PESTANA_CORTA) as Pestana[]).find(
    (p) => PESTANA_CORTA[p] === uno("p"),
  );
  const departamento = divipola(uno("d") ?? null);
  const seleccion = divipola(uno("s") ?? null);

  return {
    ambito: uno("a") === "m" ? "internacional" : "nacional",
    departamento: departamento?.length === 2 ? departamento : null,
    seleccion,
    metrica: metrica ?? ESTADO_INICIAL.metrica,
    modo3d: uno("v") === "3d",
    filtros: {
      temas: lista("t").filter((t) => t === SIN_TEMA || t in TEMAS),
      canales: lista("c").filter((c): c is Canal => c in CANALES),
      // El eje va por número: `e=3,4` es más legible y más corto que sus identificadores.
      ejes: lista("e")
        .map((n) => pnd?.ejes.find((x) => String(x.numero) === n)?.id)
        .filter((id): id is string => Boolean(id)),
    },
    pestana: pestana ?? ESTADO_INICIAL.pestana,
  };
}

/** Escribe el estado como query string («» cuando es la vista por defecto). */
export function escribirEstado(estado: EstadoVista, pnd: PndResumen | null): string {
  const p = new URLSearchParams();
  if (estado.ambito === "internacional") p.set("a", "m");
  if (estado.departamento) p.set("d", estado.departamento);
  if (estado.seleccion) p.set("s", estado.seleccion);
  if (estado.metrica !== "aportes") p.set("m", METRICA_CORTA[estado.metrica]);
  if (estado.modo3d) p.set("v", "3d");
  if (estado.filtros.temas.length) p.set("t", estado.filtros.temas.join(","));
  if (estado.filtros.canales.length) p.set("c", estado.filtros.canales.join(","));
  if (estado.filtros.ejes.length) {
    const numeros = estado.filtros.ejes
      .map((id) => pnd?.ejes.find((e) => e.id === id)?.numero)
      .filter(Boolean);
    if (numeros.length) p.set("e", numeros.join(","));
  }
  if (estado.pestana !== "panorama") p.set("p", PESTANA_CORTA[estado.pestana]);
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}
