// Lo que el modal de ejes necesita saber de cada eje del PND en un territorio: cuántos aportes
// le corresponden, por qué líneas, cómo va su atención y qué relato se repite más.
//
// Se calcula sobre la base SIN el filtro por eje (si no, al filtrar un eje los demás quedarían
// en cero) y con las mismas reglas del resto del tablero: R2 —un aporte sin ubicación cuenta en
// el país y en ningún territorio— sale de `enTerritorio`.

import { enTerritorio, type Filtrados } from "./agregar";
import { SIN_TEMA } from "./catalogos";
import { agruparNarrativas, narrativasDe } from "./narrativas";
import type { DatosTablero } from "./tipos";

export type LineaDeEje = { id: string; nombre: string; n: number; pct: number };

export type ResumenEje = {
  id: string;
  total: number;
  /** Sobre el total de aportes del territorio, no sobre los relacionados. */
  porcentaje: number;
  lineas: LineaDeEje[];
  /** Una necesidad puede tocar varios ejes: estas cuentas no suman el total de necesidades. */
  necesidades: number;
  respondidas: number;
  alertas: number;
  narrativas: number;
  /** Sectores del Gobierno desde los que llega este eje, de más a menos. */
  sectores: { tema: string; n: number }[];
  /** Dónde se concentra dentro del territorio. */
  municipios: { codigo: string; n: number }[];
  relato: { cuerpo: string; veces: number; municipios: string[]; claves: string[] } | null;
};

export type ResumenEjes = {
  total: number;
  relacionados: number;
  sinRelacion: number;
  ejes: ResumenEje[];
};

export function resumenEjes(
  datos: DatosTablero,
  base: Filtrados,
  codigo: string | null,
): ResumenEjes {
  const aportes = base.aportes.filter((a) => enTerritorio(a.municipios, codigo));
  const expedientes = base.expedientes.filter((e) => enTerritorio(e.municipios, codigo));
  const alertas = base.alertas.filter((a) => enTerritorio(a.municipios, codigo) && !a.devuelta);
  const narrativas = narrativasDe(datos, base, codigo);

  const total = aportes.length;
  const pct = (n: number) => (total ? (n * 100) / total : 0);

  const porEje = new Map<string, number>();
  const porLinea = new Map<string, number>();
  for (const a of aportes) {
    if (a.eje) porEje.set(a.eje, (porEje.get(a.eje) ?? 0) + 1);
    if (a.linea) porLinea.set(a.linea, (porLinea.get(a.linea) ?? 0) + 1);
  }

  const ejes: ResumenEje[] = (datos.pnd?.ejes ?? []).map((eje) => {
    const n = porEje.get(eje.id) ?? 0;
    const suyas = narrativas.filter((f) => f.pnd?.eje === eje.id);
    const grupo = agruparNarrativas(suyas, codigo)[0] ?? null;

    let claves: string[] = [];
    if (grupo) {
      const conteo = new Map<string, number>();
      for (const f of suyas)
        if (f.cuerpo === grupo.cuerpo)
          for (const c of f.pnd?.claves ?? []) conteo.set(c, (conteo.get(c) ?? 0) + 1);
      claves = [...conteo].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 3);
    }

    const suyos = aportes.filter((a) => a.eje === eje.id);
    const sectores = new Map<string, number>();
    const municipios = new Map<string, number>();
    for (const a of suyos) {
      sectores.set(a.tema ?? SIN_TEMA, (sectores.get(a.tema ?? SIN_TEMA) ?? 0) + 1);
      // R1: un aporte en varios municipios cuenta una vez en cada uno, nunca dos en el total.
      for (const m of a.municipios)
        if (codigo === null || m.startsWith(codigo)) municipios.set(m, (municipios.get(m) ?? 0) + 1);
    }

    const delEje = expedientes.filter((e) => e.ejes.includes(eje.id));
    return {
      id: eje.id,
      total: n,
      porcentaje: pct(n),
      lineas: eje.lineas
        .map((l) => {
          const nl = porLinea.get(l.id) ?? 0;
          return { id: l.id, nombre: l.nombre, n: nl, pct: n ? (nl * 100) / n : 0 };
        })
        .sort((a, b) => b.n - a.n),
      necesidades: delEje.length,
      respondidas: delEje.filter((e) => e.estado === "respondido").length,
      alertas: alertas.filter((a) => a.eje === eje.id).length,
      narrativas: suyas.length,
      sectores: [...sectores]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tema, n]) => ({ tema, n })),
      municipios: [...municipios]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([codigo, n]) => ({ codigo, n })),
      relato: grupo && {
        cuerpo: grupo.cuerpo,
        veces: grupo.veces,
        municipios: grupo.municipios,
        claves,
      },
    };
  });

  const relacionados = ejes.reduce((suma, e) => suma + e.total, 0);
  return { total, relacionados, sinRelacion: total - relacionados, ejes };
}
