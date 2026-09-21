// Una frase que diga qué es lo más importante de lo que se está viendo.
//
// Son reglas por prioridad, no una rotación: con los mismos datos y los mismos filtros siempre
// sale el mismo titular. Todo se calcula contando; nada lo redacta un modelo.

import type { Resumen } from "./agregar";
import { METRICAS, formatoNumero, temaDe } from "./catalogos";

export type Titular = {
  /** Clave de la regla que disparó: sirve para no repetir el mismo titular en otro sitio. */
  regla: string;
  texto: string;
};

const pct = (parte: number, total: number) => (total ? (parte * 100) / total : 0);
const conComa = (n: number) => n.toFixed(1).replace(".", ",");

export function titular(
  r: Resumen,
  {
    territorio,
    lider,
    nacional,
    temaFiltrado = false,
  }: {
    territorio: string;
    /** Territorio con más aportes dentro del ámbito actual, si lo hay. */
    lider: { nombre: string; valor: number } | null;
    nacional: boolean;
    /** Hay un filtro de tema puesto: contar temas sobre lo ya filtrado sería circular. */
    temaFiltrado?: boolean;
  },
): Titular | null {
  // 1. Lo que está sin atender manda sobre cualquier otra lectura.
  const pendientes = r.atencion.sin_respuesta_registrada;
  if (r.necesidades >= 10 && pct(pendientes, r.necesidades) >= 60)
    return {
      regla: "pendientes",
      texto: `${Math.round(pct(pendientes, r.necesidades))} % de las necesidades de ${territorio} todavía no tiene una respuesta registrada.`,
    };

  if (r.alertasActivas >= 5 && r.etapasAlerta.recibida === 0)
    return {
      regla: "alertas",
      texto: `${formatoNumero(r.alertasActivas)} alertas activas en ${territorio} siguen sin recepción confirmada.`,
    };

  // 2. Concentración territorial: dónde está pasando de verdad. Nunca por encima del 100 %:
  // un aporte en varios municipios cuenta en cada uno, así que la suma de partes puede pasarse.
  if (lider && r.aportes >= 20 && lider.valor <= r.aportes && pct(lider.valor, r.aportes) >= 25)
    return {
      regla: "concentracion",
      texto: `${lider.nombre} concentra el ${Math.round(pct(lider.valor, r.aportes))} % de los ${METRICAS.aportes.plural} de ${territorio}.`,
    };

  // 3. De qué se habla. Con un tema ya filtrado no se dice: saldría «1 de cada 2 aportes habla
  // de Vivienda» justo después de pedir solo los de Vivienda.
  const [tema] = r.temas.filter((t) => t.tema !== "sin_tema");
  if (!temaFiltrado && tema && r.aportes >= 20 && pct(tema.total, r.aportes) >= 20)
    return {
      regla: "tema",
      texto: `1 de cada ${Math.max(2, Math.round(r.aportes / tema.total))} aportes de ${territorio} habla de ${temaDe(tema.tema).etiqueta}.`,
    };

  // 4. Calidad del dato: si falta ubicación, el mapa cuenta menos de lo que hay.
  if (nacional && r.aportes >= 20 && pct(r.aportes - r.ubicados, r.aportes) >= 25)
    return {
      regla: "ubicacion",
      texto: `${conComa(pct(r.aportes - r.ubicados, r.aportes))} % de los aportes aún no tiene municipio confirmado: no pintan el mapa.`,
    };

  if (r.aportes === 0) return null;
  return {
    regla: "base",
    texto: `${formatoNumero(r.aportes)} aportes de ${formatoNumero(r.municipiosConAportes)} municipios en ${territorio}.`,
  };
}
