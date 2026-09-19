// Cuentas del tablero sobre el dataset compacto.
//
// Siguen las reglas del esquema (`07_conteo.sql`):
//   R1  una necesidad en N municipios es UNA necesidad en el departamento y en el país.
//   R2  un aporte sin ubicación cuenta en el total nacional, pero no en ningún territorio;
//       un aporte con dos municipios no suma dos.
// Por eso todo se cuenta como elementos DISTINTOS por nivel, nunca sumando subtotales.

import { SIN_TEMA, type Metrica } from "./catalogos";
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
  meses: { mes: string; aportes: number; necesidades: number }[];
  canales: Record<Canal, number>;
  atencion: Record<EstadoAtencion, number>;
  etapasAlerta: Record<EtapaAlerta, number>;
};

export function resumir(f: Filtrados, codigo: string | null, mesesEje: string[]): Resumen {
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

  const meses = new Map(mesesEje.map((m) => [m, { mes: m, aportes: 0, necesidades: 0 }]));
  for (const a of aportes) {
    const fila = meses.get(a.mes);
    if (fila) fila.aportes++;
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
    meses: [...meses.values()],
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
