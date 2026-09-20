// Cuentas del tablero sobre el dataset compacto.
//
// Siguen las reglas del esquema (`07_conteo.sql`):
//   R1  una necesidad en N municipios es UNA necesidad en el departamento y en el país.
//   R2  un aporte sin ubicación cuenta en el total nacional, pero no en ningún territorio;
//       un aporte con dos municipios no suma dos.
// Por eso todo se cuenta como elementos DISTINTOS por nivel, nunca sumando subtotales.

import { SIN_TEMA, etiquetaDia, etiquetaMes, type Metrica } from "./catalogos";
import type {
  AlertaResumen,
  AporteResumen,
  Canal,
  DatosTablero,
  EstadoAtencion,
  EtapaAlerta,
  ExpedienteResumen,
} from "./tipos";

export type Filtros = { temas: string[]; canales: Canal[]; ejes: string[] };

export type Filtrados = {
  aportes: AporteResumen[];
  expedientes: ExpedienteResumen[];
  alertas: AlertaResumen[];
};

const cruza = <T,>(lista: T[], seleccion: T[]) =>
  seleccion.length === 0 || lista.some((x) => seleccion.includes(x));

export function filtrar(datos: DatosTablero, { temas, canales, ejes }: Filtros): Filtrados {
  // Un aporte sin eje del PND no pasa el filtro por eje: no se asigna por descarte.
  const ejeCruza = (propios: (string | null)[]) =>
    ejes.length === 0 || propios.some((e) => e !== null && ejes.includes(e));

  return {
    aportes: datos.aportes.filter(
      (a) => cruza([a.tema ?? SIN_TEMA], temas) && cruza([a.canal], canales) && ejeCruza([a.eje]),
    ),
    expedientes: datos.expedientes.filter(
      (e) => cruza(e.temas, temas) && cruza(e.canales, canales) && ejeCruza(e.ejes),
    ),
    alertas: datos.alertas.filter(
      (a) => cruza([a.tema ?? SIN_TEMA], temas) && cruza([a.canal], canales) && ejeCruza([a.eje]),
    ),
  };
}

/** ¿Alguno de los municipios cae en el territorio? `null` = país. */
export const enTerritorio = (municipios: string[], codigo: string | null) =>
  codigo === null ? true : municipios.some((m) => m.startsWith(codigo));

function elementos(f: Filtrados, metrica: Metrica): { municipios: string[] }[] {
  if (metrica === "necesidades") return f.expedientes;
  if (metrica === "alertas") return f.alertas.filter((a) => !a.devuelta);
  return f.aportes;
}

export type ValoresMapa = {
  departamentos: Map<string, number>;
  municipios: Map<string, number>;
};

/** Cuenta distinta por departamento y por municipio para colorear el mapa. */
export function valoresMapa(f: Filtrados, metrica: Metrica): ValoresMapa {
  const departamentos = new Map<string, number>();
  const municipios = new Map<string, number>();
  for (const el of elementos(f, metrica)) {
    const dptos = new Set(el.municipios.map((m) => m.slice(0, 2)));
    for (const d of dptos) departamentos.set(d, (departamentos.get(d) ?? 0) + 1);
    for (const m of el.municipios) municipios.set(m, (municipios.get(m) ?? 0) + 1);
  }
  return { departamentos, municipios };
}

export type Resumen = {
  aportes: number;
  ubicados: number;
  /** Nacional: % de aportes con municipio. Territorial: % del total ubicado del país. */
  porcentaje: number | null;
  municipiosConAportes: number;
  colectivos: number;
  necesidades: number;
  respondidas: number;
  alertasActivas: number;
  temas: { tema: string; total: number }[];
  /** Serie de participación: por semana si el proceso lleva poco tiempo, si no por mes. */
  evolucion: PuntoEvolucion[];
  /** Aportes por día de los últimos 28 días, para la línea de tendencia. */
  serie: number[];
  /** Últimos 7 días frente a los 7 anteriores; `null` si no hay con qué comparar. */
  delta7: { actual: number; previo: number } | null;
  canales: Record<Canal, number>;
  atencion: Record<EstadoAtencion, number>;
  etapasAlerta: Record<EtapaAlerta, number>;
};

export type PuntoEvolucion = {
  clave: string;
  etiqueta: string;
  aportes: number;
  /** El último periodo va en curso: se dibuja punteado para no leerlo como una caída. */
  parcial: boolean;
};

const comoFecha = (f: string) => new Date(`${f}T00:00:00Z`);
const comoTexto = (d: Date) => d.toISOString().slice(0, 10);
const sumarDias = (f: string, n: number) => {
  const d = comoFecha(f);
  d.setUTCDate(d.getUTCDate() + n);
  return comoTexto(d);
};
/** Lunes de la semana ISO a la que pertenece la fecha. */
const lunesDe = (f: string) => {
  const d = comoFecha(f);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return comoTexto(d);
};

/**
 * Con tres meses de proceso, una gráfica mensual son tres puntos y no se ve nada: por debajo de
 * cuatro meses la serie pasa a semanas ISO, rellenando las vacías para que el eje no mienta.
 */
function evolucionDe(aportes: AporteResumen[], mesesEje: string[], hasta: string): PuntoEvolucion[] {
  if (!mesesEje.length) return [];
  if (mesesEje.length >= 4) {
    const meses = new Map(mesesEje.map((m) => [m, 0]));
    for (const a of aportes) if (meses.has(a.mes)) meses.set(a.mes, meses.get(a.mes)! + 1);
    const enCurso = hasta.slice(0, 7);
    return [...meses].map(([clave, n]) => ({
      clave,
      etiqueta: etiquetaMes(clave),
      aportes: n,
      parcial: clave === enCurso,
    }));
  }
  const conteo = new Map<string, number>();
  for (const a of aportes) {
    const s = lunesDe(a.fecha);
    conteo.set(s, (conteo.get(s) ?? 0) + 1);
  }
  const primera = lunesDe(`${mesesEje[0]}-01`);
  const ultima = lunesDe(hasta);
  const puntos: PuntoEvolucion[] = [];
  for (let s = primera; s <= ultima; s = sumarDias(s, 7))
    puntos.push({
      clave: s,
      etiqueta: etiquetaDia(s),
      aportes: conteo.get(s) ?? 0,
      parcial: s === ultima,
    });
  return puntos;
}

export function resumir(
  f: Filtrados,
  codigo: string | null,
  mesesEje: string[],
  /** Corte de los datos (YYYY-MM-DD). Sin él no hay «en curso» ni tendencia. */
  hasta?: string,
): Resumen {
  const aportes = f.aportes.filter((a) => enTerritorio(a.municipios, codigo));
  const expedientes = f.expedientes.filter((e) => enTerritorio(e.municipios, codigo));
  const alertas = f.alertas.filter((a) => enTerritorio(a.municipios, codigo) && !a.devuelta);

  const ubicados = aportes.filter((a) => a.municipios.length > 0).length;
  const ubicadosPais = f.aportes.filter((a) => a.municipios.length > 0).length;

  const municipios = new Set<string>();
  for (const a of aportes)
    for (const m of a.municipios) if (codigo === null || m.startsWith(codigo)) municipios.add(m);

  const temas = new Map<string, number>();
  for (const a of aportes) temas.set(a.tema ?? SIN_TEMA, (temas.get(a.tema ?? SIN_TEMA) ?? 0) + 1);

  const evolucion = hasta ? evolucionDe(aportes, mesesEje, hasta) : [];

  // Últimos 28 días hasta el corte: la línea de tendencia y el «frente a la semana pasada».
  const serie: number[] = [];
  let delta7: Resumen["delta7"] = null;
  if (hasta) {
    const porDia = new Map<string, number>();
    for (const a of aportes) porDia.set(a.fecha, (porDia.get(a.fecha) ?? 0) + 1);
    for (let i = 27; i >= 0; i--) serie.push(porDia.get(sumarDias(hasta, -i)) ?? 0);
    const actual = serie.slice(21).reduce((a, b) => a + b, 0);
    const previo = serie.slice(14, 21).reduce((a, b) => a + b, 0);
    delta7 = { actual, previo };
  }

  const canales: Record<Canal, number> = { web: 0, asistida: 0, voz_transcrita: 0 };
  for (const a of aportes) canales[a.canal]++;

  const atencion: Record<EstadoAtencion, number> = {
    respondido: 0,
    remitido: 0,
    recibido: 0,
    sin_respuesta_registrada: 0,
  };
  for (const e of expedientes) atencion[e.estado]++;

  const etapasAlerta: Record<EtapaAlerta, number> = {
    levantada: 0,
    orientada: 0,
    contactada: 0,
    recibida: 0,
  };
  for (const a of alertas) etapasAlerta[a.etapa]++;

  return {
    aportes: aportes.length,
    ubicados,
    porcentaje:
      codigo === null
        ? aportes.length
          ? (ubicados * 100) / aportes.length
          : null
        : ubicadosPais
          ? (ubicados * 100) / ubicadosPais
          : null,
    municipiosConAportes: municipios.size,
    colectivos: aportes.filter((a) => a.colectivo).length,
    necesidades: expedientes.length,
    respondidas: atencion.respondido,
    alertasActivas: alertas.length,
    temas: [...temas.entries()]
      .map(([tema, total]) => ({ tema, total }))
      .sort((a, b) => b.total - a.total),
    evolucion,
    serie,
    delta7,
    canales,
    atencion,
    etapasAlerta,
  };
}

/** Todos los meses entre el primer y el último aporte, para un eje estable. */
export function ejeMeses(datos: DatosTablero): string[] {
  const meses = datos.aportes.map((a) => a.mes).sort();
  if (!meses.length) return [];
  const [ai, mi] = meses[0].split("-").map(Number);
  const [af, mf] = meses[meses.length - 1].split("-").map(Number);
  const eje: string[] = [];
  for (let a = ai, m = mi; a < af || (a === af && m <= mf); m === 12 ? (a++, (m = 1)) : m++)
    eje.push(`${a}-${String(m).padStart(2, "0")}`);
  return eje;
}
