// Relaciona un texto con la línea de un catálogo de líneas temáticas, por palabras clave.
//
// Es genérico a propósito: no sabe nada del Plan, recibe las líneas ya cargadas.
// Las reglas, en orden, para que el resultado se pueda explicar:
//   1. Las claves más largas se leen primero y "ocupan" su tramo de texto: si coincide
//      "animales de cría", la clave "animales" de otra línea ya no cuenta ahí.
//   2. Cada clave distinta suma 2 puntos, y 1 más si es una frase (es más específica).
//   3. Gana la línea con más puntos; empata el sector del aporte, luego lo que se
//      menciona primero en el texto y, por último, el orden del catálogo.
//   4. Sin ninguna clave, no hay relación: nunca se asigna por descarte.
// Las claves que se devuelven son las palabras tal como aparecen en el texto original.

export type LineaParaAlinear = { id: string; eje: string; sectores: string[]; claves: string[] };
export type Alineacion = { linea: string; eje: string; claves: string[] };

const normalizar = (s: string) =>
  s
    .toLocaleLowerCase("es-CO")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

/** Texto normalizado + de qué carácter del original viene cada carácter normalizado. */
function normalizarConMapa(original: string): { texto: string; origen: number[] } {
  let texto = "";
  const origen: number[] = [];
  let i = 0;
  for (const c of original) {
    const forma = /\s/.test(c) ? (texto.endsWith(" ") ? "" : " ") : normalizar(c);
    for (let k = 0; k < forma.length; k++) {
      texto += forma[k];
      origen.push(i);
    }
    i += c.length;
  }
  return { texto, origen };
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Patron = { linea: number; clave: string; re: RegExp; frase: boolean };

export function crearAlineador(lineas: LineaParaAlinear[]) {
  const patrones: Patron[] = lineas.flatMap((l, linea) =>
    l.claves.map((clave) => {
      const forma = normalizar(clave.trim());
      return {
        linea,
        clave: forma,
        re: new RegExp(`(?<![a-z0-9])${escapar(forma)}(?![a-z0-9])`, "g"),
        frase: forma.includes(" "),
      };
    }),
  );

  return function alinear(texto: string, sector: string | null): Alineacion | null {
    const { texto: t, origen } = normalizarConMapa(texto);
    const literal = (ini: number, fin: number) =>
      texto.slice(origen[ini], origen[fin - 1] + 1).toLocaleLowerCase("es-CO");

    // 1. Todas las coincidencias, de la más larga a la más corta, sin solaparse.
    const coincidencias: { p: Patron; ini: number; fin: number }[] = [];
    for (const p of patrones) {
      p.re.lastIndex = 0;
      for (let m = p.re.exec(t); m; m = p.re.exec(t))
        coincidencias.push({ p, ini: m.index, fin: m.index + m[0].length });
    }
    coincidencias.sort((a, b) => b.fin - b.ini - (a.fin - a.ini) || a.ini - b.ini);
    const ocupados: [number, number][] = [];
    const aceptadas = coincidencias.filter(({ ini, fin }) => {
      if (ocupados.some(([a, b]) => ini < b && fin > a)) return false;
      ocupados.push([ini, fin]);
      return true;
    });
    if (!aceptadas.length) return null;

    // 2. Puntos por línea (cada clave distinta cuenta una vez).
    const porLinea = new Map<
      number,
      { puntos: number; primera: number; vistas: string[]; claves: { ini: number; texto: string }[] }
    >();
    for (const { p, ini, fin } of aceptadas) {
      const r = porLinea.get(p.linea) ?? { puntos: 0, primera: Infinity, vistas: [], claves: [] };
      if (!r.vistas.includes(p.clave)) {
        r.vistas.push(p.clave);
        r.claves.push({ ini, texto: literal(ini, fin) });
        r.puntos += p.frase ? 3 : 2;
      }
      r.primera = Math.min(r.primera, ini);
      porLinea.set(p.linea, r);
    }

    // 3. Desempates.
    const [ganadora] = [...porLinea.entries()].sort(([ia, a], [ib, b]) => {
      const sectorA = sector !== null && lineas[ia].sectores.includes(sector) ? 1 : 0;
      const sectorB = sector !== null && lineas[ib].sectores.includes(sector) ? 1 : 0;
      return b.puntos - a.puntos || sectorB - sectorA || a.primera - b.primera || ia - ib;
    });
    const [indice, { claves }] = ganadora;
    return {
      linea: lineas[indice].id,
      eje: lineas[indice].eje,
      // En el orden en que aparecen en el texto.
      claves: claves.sort((a, b) => a.ini - b.ini).map((c) => c.texto),
    };
  };
}
