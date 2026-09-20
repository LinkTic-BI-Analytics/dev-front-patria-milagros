// Lo cualitativo: las narrativas (síntesis vigentes) de un territorio y su generalidad.
//
// La generalidad NO la escribe un modelo: sale de contar. Qué temas predominan, qué
// relatos se repiten y qué términos aparecen en el territorio más que en el país.
// Así cualquiera puede verificarla contra la tabla que tiene debajo.

import { enTerritorio, type Filtrados } from "./agregar";
import { SIN_TEMA } from "./catalogos";
import type { AporteResumen, Canal, DatosTablero, NarrativaResumen, PndResumen } from "./tipos";

export type FilaNarrativa = NarrativaResumen & { aporte: AporteResumen; cuerpo: string };

export type GrupoNarrativo = {
  clave: string;
  cuerpo: string;
  veces: number;
  temas: string[];
  /** Municipios del territorio donde se cuenta, del que más lo repite al que menos. */
  municipios: string[];
  /** Lo mismo con su cuenta, para «Sobre todo en El Tarra (9)». */
  conteoMunicipios: [string, number][];
  departamentos: string[];
  canales: Canal[];
  ultima: string;
  primera: string;
  confirmadas: number;
  /** Las narrativas que lo componen: las necesita la fila desplegada. */
  filas: FilaNarrativa[];
  /** Palabras del relato que lo conectaron con el Plan. */
  claves: string[];
  /** Línea del PND más frecuente entre sus narrativas (`null` si ninguna se relaciona). */
  pnd: string | null;
};

export type Termino = {
  termino: string;
  /** Narrativas que lo mencionan. */
  veces: number;
  /** Relatos distintos que lo mencionan: es lo que mide de verdad si atraviesa el territorio. */
  relatos: number;
  /** Cuántas veces más frecuente es aquí que en el país. */
  razon: number;
  peso: number;
};

export type Generalidad = {
  total: number;
  distintas: number;
  confirmadas: number;
  sinClasificar: number;
  /** porcentaje sobre las narrativas CON tema: las sin clasificar se informan aparte. */
  temas: { tema: string; total: number; porcentaje: number }[];
  recurrentes: GrupoNarrativo[];
  terminos: Termino[];
  /**
   * Tema en el que el territorio se sale de la media nacional. `null` cuando no hay base
   * suficiente: sin eso, «aquí se habla más de salud» sería ruido con 7 narrativas.
   */
  distintivo: { tema: string; porcentaje: number; razon: number } | null;
};

const SUFIJO_CORRECCION = /\s*\(corregido por quien lo contó\)\s*$/i;
// Rótulos del formulario asistido: estorban al contar términos, su contenido no.
const ROTULOS = /(^|\n)\s*(problema|lo que se espera|solución sugerida|solucion sugerida)\s*:\s*/gi;

/** "Salud en Concepción: El puesto…" → "El puesto…". El tema y el lugar ya son columnas. */
export function cuerpoDe(texto: string): string {
  const limpio = texto.replace(SUFIJO_CORRECCION, "").replace(ROTULOS, "$1").trim();
  const i = limpio.indexOf(": ");
  // El prefijo "Tema en Municipio:" ya es columna; el resto del texto se conserva.
  return i > 0 && i < 90 && !limpio.slice(0, i).includes("\n") ? limpio.slice(i + 2) : limpio;
}

export const normalizar = (s: string) =>
  s.toLocaleLowerCase("es-CO").normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Narrativas de los aportes filtrados que caen en el territorio (`null` = país), más recientes primero. */
export function narrativasDe(
  datos: DatosTablero,
  filtrados: Filtrados,
  codigo: string | null,
): FilaNarrativa[] {
  const aportes = new Map(filtrados.aportes.map((a) => [a.id, a]));
  const filas: FilaNarrativa[] = [];
  for (const n of datos.narrativas) {
    const aporte = aportes.get(n.aporteId);
    if (!aporte || !enTerritorio(aporte.municipios, codigo)) continue;
    filas.push({ ...n, aporte, cuerpo: cuerpoDe(n.texto) });
  }
  return filas.sort((a, b) => b.aporte.fecha.localeCompare(a.aporte.fecha));
}

const porFrecuencia = (conteo: Map<string, number>) =>
  [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

/** Relatos iguales juntos: cuántas veces, en qué temas y municipios del territorio. */
export function agruparNarrativas(filas: FilaNarrativa[], codigo: string | null): GrupoNarrativo[] {
  const grupos = new Map<
    string,
    {
      cuerpo: string;
      filas: FilaNarrativa[];
      temas: Map<string, number>;
      municipios: Map<string, number>;
      canales: Map<Canal, number>;
      lineas: Map<string, number>;
      claves: Map<string, number>;
    }
  >();
  for (const f of filas) {
    const clave = normalizar(f.cuerpo).replace(/[^\p{L}\p{N} ]/gu, "").trim();
    let g = grupos.get(clave);
    if (!g) {
      g = {
        cuerpo: f.cuerpo,
        filas: [],
        temas: new Map(),
        municipios: new Map(),
        canales: new Map(),
        lineas: new Map(),
        claves: new Map(),
      };
      grupos.set(clave, g);
    }
    g.filas.push(f);
    const tema = f.aporte.tema ?? SIN_TEMA;
    g.temas.set(tema, (g.temas.get(tema) ?? 0) + 1);
    g.canales.set(f.aporte.canal, (g.canales.get(f.aporte.canal) ?? 0) + 1);
    if (f.pnd) {
      g.lineas.set(f.pnd.linea, (g.lineas.get(f.pnd.linea) ?? 0) + 1);
      for (const c of f.pnd.claves) g.claves.set(c, (g.claves.get(c) ?? 0) + 1);
    }
    for (const m of f.aporte.municipios)
      if (codigo === null || m.startsWith(codigo)) g.municipios.set(m, (g.municipios.get(m) ?? 0) + 1);
  }
  return [...grupos.entries()]
    .map(([clave, g]) => ({
      clave,
      cuerpo: g.cuerpo,
      veces: g.filas.length,
      temas: porFrecuencia(g.temas),
      municipios: porFrecuencia(g.municipios),
      conteoMunicipios: [...g.municipios.entries()].sort((a, b) => b[1] - a[1]),
      departamentos: [...new Set([...g.municipios.keys()].map((m) => m.slice(0, 2)))],
      canales: porFrecuencia(g.canales) as Canal[],
      ultima: g.filas.reduce((u, f) => (f.aporte.fecha > u ? f.aporte.fecha : u), ""),
      primera: g.filas.reduce((u, f) => (!u || f.aporte.fecha < u ? f.aporte.fecha : u), ""),
      confirmadas: g.filas.filter((f) => f.confirmada).length,
      filas: g.filas,
      claves: porFrecuencia(g.claves),
      pnd: porFrecuencia(g.lineas)[0] ?? null,
    }))
    .sort((a, b) => b.veces - a.veces || b.ultima.localeCompare(a.ultima));
}

// Palabras que no dicen de qué se habla. Las de menos de 3 letras se descartan solas.
const VACIAS = new Set(
  (
    "que los las del por con sin una uno unos unas hay nos les son era fue muy mas ese esa eso " +
    "esto este esta estos estas esos esas para pero porque cuando donde desde hasta hace hacen " +
    "sobre entre cada como todo toda todos todas otro otra otros otras mismo misma solo tambien " +
    "tiene tienen tenemos esta estan estamos ser sido han has hemos toca tocar quien quienes " +
    "nadie nada algo alguien sus nuestro nuestra nuestros nuestras ellos ellas ahora aqui alla " +
    "ya asi dia dias vez veces bien mal tan tanto sigue siguen puede pueden queda quedo llega " +
    "llegan lleva van hacer dos tres cual cuales mientras aunque despues antes luego ademas " +
    "ninguna ninguno ningun hubo habia haber sea sean fueron estaba estaban dice dicen pasa " +
    "pasan pone ponen gente vamos ano anos usted ustedes nosotros tener decir dijo dicho " +
    "gracias favor senor senora buenas buenos hola parte manera forma cosa cosas hacia segun"
  ).split(" "),
);
// Solo "de"/"del" arman pares con sentido ("puesto de salud", "capital del departamento").
// Dos palabras seguidas sin conector dan pares como "salud abre", que no dicen nada.
const CONECTORES = new Set(["de", "del"]);

type Documento = Map<string, string>; // clave normalizada → forma legible

function terminosDe(texto: string): Documento {
  const doc: Documento = new Map();
  const palabras = texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  let previa: string | null = null;
  let hueco: string[] = [];

  for (const forma of palabras) {
    const clave = normalizar(forma);
    if (CONECTORES.has(clave)) {
      if (previa && hueco.length === 0) hueco.push(forma.toLowerCase());
      else previa = null;
      continue;
    }
    if (clave.length < 3 || VACIAS.has(clave) || /^\d+$/.test(clave)) {
      previa = null;
      hueco = [];
      continue;
    }
    const legible = forma.toLocaleLowerCase("es-CO");
    doc.set(clave, legible);
    if (previa && hueco.length === 1) {
      const par = [previa, ...hueco, legible].join(" ");
      doc.set(normalizar(par), par);
    }
    previa = legible;
    hueco = [];
  }
  return doc;
}

/**
 * Términos que caracterizan las filas frente a una referencia (el país con los mismos filtros).
 *
 * Se cuentan por RELATO DISTINTO, no por narrativa: un mismo relato repetido 30 veces aportaría
 * todas sus palabras con el mismo peso y el resultado repetiría la lista de relatos. Así ganan
 * los términos que atraviesan varios relatos.
 * peso = relatos con el término × log2(1 + cuánto más frecuente es aquí que en la referencia).
 */
export function terminosClave(
  filas: FilaNarrativa[],
  referencia: FilaNarrativa[],
  maximo = 8,
): Termino[] {
  const contar = (lista: FilaNarrativa[]) => {
    const relatos = new Map<string, { cuerpo: string; veces: number }>();
    for (const f of lista) {
      const clave = normalizar(f.cuerpo);
      const r = relatos.get(clave);
      if (r) r.veces++;
      else relatos.set(clave, { cuerpo: f.cuerpo, veces: 1 });
    }
    const conteo = new Map<string, { forma: string; relatos: number; narrativas: number }>();
    for (const { cuerpo, veces } of relatos.values())
      for (const [clave, forma] of terminosDe(cuerpo)) {
        const c = conteo.get(clave);
        if (c) {
          c.relatos++;
          c.narrativas += veces;
        } else conteo.set(clave, { forma, relatos: 1, narrativas: veces });
      }
    return { conteo, relatos: relatos.size };
  };
  if (!filas.length) return [];

  const aqui = contar(filas);
  const alla = contar(referencia);
  const minimo = aqui.relatos >= 4 ? 2 : 1;

  const candidatos = [...aqui.conteo.entries()]
    .filter(([, c]) => c.relatos >= minimo && (filas.length < 6 || c.narrativas >= 2))
    .map(([clave, c]) => {
      const enReferencia = alla.conteo.get(clave)?.relatos ?? c.relatos;
      const lift = c.relatos / aqui.relatos / (enReferencia / Math.max(alla.relatos, 1));
      const esPar = clave.includes(" ");
      return {
        clave,
        termino: c.forma,
        veces: c.narrativas,
        relatos: c.relatos,
        razon: lift,
        // Desempate por narrativas: entre dos términos igual de transversales, el más dicho.
        peso: c.relatos * Math.log2(1 + lift) * (esPar ? 1.35 : 1) + c.narrativas / 1e4,
      };
    })
    .sort((a, b) => b.peso - a.peso);

  // Sin repetir: si "puesto de salud" entra, "puesto" y "salud" sobran.
  const elegidos: typeof candidatos = [];
  const contiene = (a: string, b: string) => ` ${a} `.includes(` ${b} `);
  for (const c of candidatos) {
    if (elegidos.some((e) => contiene(e.clave, c.clave) || contiene(c.clave, e.clave))) continue;
    elegidos.push(c);
    if (elegidos.length === maximo) break;
  }
  const max = elegidos[0]?.peso ?? 1;
  return elegidos.map(({ termino, veces, relatos, razon, peso }) => ({
    termino,
    veces,
    relatos,
    razon,
    peso: peso / max,
  }));
}

export function generalidad(
  filas: FilaNarrativa[],
  referencia: FilaNarrativa[],
  codigo: string | null,
): Generalidad {
  const grupos = agruparNarrativas(filas, codigo);
  const temas = new Map<string, number>();
  for (const f of filas) {
    const t = f.aporte.tema ?? SIN_TEMA;
    temas.set(t, (temas.get(t) ?? 0) + 1);
  }
  const conTema = Math.max(filas.length - (temas.get(SIN_TEMA) ?? 0), 1);

  // Lo que distingue al territorio del país. Con poca base no se dice nada: un tema que aparece
  // 2 de 7 veces no es una característica, es azar.
  let distintivo: Generalidad["distintivo"] = null;
  if (codigo && filas.length >= 20) {
    const pais = new Map<string, number>();
    for (const f of referencia) {
      const t = f.aporte.tema ?? SIN_TEMA;
      pais.set(t, (pais.get(t) ?? 0) + 1);
    }
    const paisConTema = Math.max(referencia.length - (pais.get(SIN_TEMA) ?? 0), 1);
    for (const [tema, n] of temas) {
      if (tema === SIN_TEMA || n < 5) continue;
      const aqui = n / conTema;
      const alla = (pais.get(tema) ?? 0) / paisConTema;
      const razon = alla > 0 ? aqui / alla : 0;
      if (razon >= 1.3 && (!distintivo || razon > distintivo.razon))
        distintivo = { tema, porcentaje: aqui * 100, razon };
    }
  }

  return {
    total: filas.length,
    distintas: grupos.length,
    confirmadas: filas.filter((f) => f.confirmada).length,
    sinClasificar: temas.get(SIN_TEMA) ?? 0,
    temas: [...temas.entries()]
      .filter(([t]) => t !== SIN_TEMA)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tema, total]) => ({ tema, total, porcentaje: (total * 100) / conTema })),
    recurrentes: grupos.slice(0, 3),
    terminos: terminosClave(filas, referencia),
    distintivo,
  };
}

export type LineaConVoces = {
  id: string;
  nombre: string;
  eje: { id: string; numero: number; nombre: string };
  total: number;
  relato: string;
  veces: number;
  claves: string[];
};

export type AlineacionPnd = {
  total: number;
  relacionadas: number;
  ejes: { id: string; numero: number; nombre: string; vision: string; total: number; porcentaje: number }[];
  lineas: LineaConVoces[];
  sinRelacion: { total: number; porcentaje: number; relato: string | null; veces: number };
};

/**
 * Cómo se reparten las narrativas entre los ejes y líneas del PND. Cada narrativa tiene a lo sumo
 * una línea, así que los conteos por eje suman, con las "sin relación", el total.
 */
export function alineacionPnd(filas: FilaNarrativa[], pnd: PndResumen): AlineacionPnd {
  const total = filas.length;
  const pct = (n: number) => (total ? (n * 100) / total : 0);

  const porLinea = new Map<string, FilaNarrativa[]>();
  const sinRelacion: FilaNarrativa[] = [];
  for (const f of filas) {
    if (!f.pnd) sinRelacion.push(f);
    else porLinea.set(f.pnd.linea, [...(porLinea.get(f.pnd.linea) ?? []), f]);
  }

  const masRepetido = (lista: FilaNarrativa[]) => agruparNarrativas(lista, null)[0] ?? null;

  const lineas: LineaConVoces[] = pnd.ejes
    .flatMap((eje) =>
      eje.lineas.map((l) => ({ l, eje, suyas: porLinea.get(l.id) ?? [] })),
    )
    .filter(({ suyas }) => suyas.length > 0)
    .map(({ l, eje, suyas }) => {
      const grupo = masRepetido(suyas)!;
      const claves = new Map<string, number>();
      for (const f of suyas)
        for (const c of f.pnd!.claves) claves.set(c, (claves.get(c) ?? 0) + 1);
      return {
        id: l.id,
        nombre: l.nombre,
        eje: { id: eje.id, numero: eje.numero, nombre: eje.nombre },
        total: suyas.length,
        relato: grupo.cuerpo,
        veces: grupo.veces,
        claves: porFrecuencia(claves).slice(0, 4),
      };
    })
    .sort((a, b) => b.total - a.total);

  const ejes = pnd.ejes.map(({ id, numero, nombre, vision }) => {
    const n = filas.filter((f) => f.pnd?.eje === id).length;
    return { id, numero, nombre, vision, total: n, porcentaje: pct(n) };
  });

  const sinGrupo = masRepetido(sinRelacion);
  return {
    total,
    relacionadas: total - sinRelacion.length,
    ejes,
    lineas,
    sinRelacion: {
      total: sinRelacion.length,
      porcentaje: pct(sinRelacion.length),
      relato: sinGrupo?.cuerpo ?? null,
      veces: sinGrupo?.veces ?? 0,
    },
  };
}
