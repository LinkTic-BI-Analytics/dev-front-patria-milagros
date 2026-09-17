"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ESTADOS_ATENCION,
  SIN_TEMA,
  etiquetaMes,
  formatoNumero,
  temaDe,
} from "@/lib/datos/catalogos";
import type { Resumen } from "@/lib/datos/agregar";
import type { EstadoAtencion } from "@/lib/datos/tipos";

const suave = [0.22, 1, 0.36, 1] as const;

export function Seccion({
  titulo,
  detalle,
  children,
  i = 0,
}: {
  titulo: string;
  detalle?: React.ReactNode;
  children: React.ReactNode;
  i?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + i * 0.08, duration: 0.6, ease: suave }}
      className="panel p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-extrabold tracking-tight">{titulo}</h3>
        {detalle && <span className="text-xs text-muted">{detalle}</span>}
      </div>
      {children}
    </motion.section>
  );
}

/** Barras horizontales: una sola serie, color dorado; clic filtra por el tema. */
export function GraficaTemas({
  temas,
  seleccionados,
  onTema,
}: {
  temas: Resumen["temas"];
  seleccionados: string[];
  onTema: (tema: string) => void;
}) {
  // "Sin clasificar" no es un tema: se informa aparte para no aplastar la escala.
  const clasificados = temas.filter((t) => t.tema !== SIN_TEMA);
  const sinClasificar = temas.find((t) => t.tema === SIN_TEMA)?.total ?? 0;
  const visibles = clasificados.slice(0, 8);
  const resto = clasificados.slice(8);
  const max = Math.max(1, ...visibles.map((t) => t.total));
  const total = clasificados.reduce((a, t) => a + t.total, 0);

  if (!visibles.length && !sinClasificar) return <Vacio />;

  return (
    <ul className="space-y-1">
      {visibles.map(({ tema, total: n }, i) => {
        const { etiqueta, corta, icono: Icono } = temaDe(tema);
        const activo = seleccionados.includes(tema);
        return (
          <li key={tema}>
            <button
              onClick={() => onTema(tema)}
              title={`${etiqueta}: ${n} aportes (${Math.round((n * 100) / total)}% de los clasificados) · clic para filtrar`}
              className={`group grid w-full grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-white/5 ${
                activo ? "bg-[rgba(255,200,0,.08)]" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-secondary group-hover:text-primary">
                <Icono className={`size-3.5 shrink-0 ${activo ? "text-accent" : "text-muted"}`} />
                <span className="truncate">{corta}</span>
              </span>
              <span className="relative h-2.5">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] bg-gold-500 group-hover:brightness-110"
                  initial={{ width: 0 }}
                  animate={{ width: `${(n * 100) / max}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04, ease: suave }}
                />
              </span>
              <span className="cifra text-right text-xs text-primary">{formatoNumero(n)}</span>
            </button>
          </li>
        );
      })}
      {(resto.length > 0 || sinClasificar > 0) && (
        <li className="flex flex-wrap justify-between gap-x-3 gap-y-1 px-1.5 pt-2 text-xs text-muted">
          {resto.length > 0 && (
            <span>
              y {resto.length} temas más ·{" "}
              {formatoNumero(resto.reduce((a, t) => a + t.total, 0))} aportes
            </span>
          )}
          {sinClasificar > 0 && (
            <button
              onClick={() => onTema(SIN_TEMA)}
              className={`hover:text-primary ${seleccionados.includes(SIN_TEMA) ? "text-accent" : ""}`}
            >
              <span className="cifra text-secondary">{formatoNumero(sinClasificar)}</span> sin
              clasificar
            </button>
          )}
        </li>
      )}
    </ul>
  );
}

export function GraficaEvolucion({ meses }: { meses: Resumen["meses"] }) {
  const datos = meses.map((m) => ({ ...m, etiqueta: etiquetaMes(m.mes) }));
  if (!datos.some((d) => d.aportes > 0)) return <Vacio />;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="relleno-evolucion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC800" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#FFC800" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis-text)", fontSize: 11 }}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis-text)", fontSize: 11 }}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,200,0,.45)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-default bg-surface-3 px-3 py-2 shadow-[var(--shadow-card)]">
                  <p className="etiqueta">{payload[0].payload.etiqueta}</p>
                  <p className="text-sm">
                    <span className="cifra font-bold text-primary">
                      {formatoNumero(Number(payload[0].value))}
                    </span>{" "}
                    <span className="text-secondary">aportes</span>
                  </p>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="aportes"
            stroke="#FFC800"
            strokeWidth={2}
            fill="url(#relleno-evolucion)"
            activeDot={{ r: 5, fill: "#FFC800", stroke: "#0A1A3A", strokeWidth: 2 }}
            dot={false}
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const ORDEN_ATENCION: EstadoAtencion[] = [
  "respondido",
  "remitido",
  "recibido",
  "sin_respuesta_registrada",
];

/** Barra apilada ordinal: una familia azul con separadores de 2px y leyenda con cifras. */
export function EstadoAtencionBarra({ atencion }: { atencion: Resumen["atencion"] }) {
  const total = ORDEN_ATENCION.reduce((a, e) => a + atencion[e], 0);
  if (!total) return <Vacio texto="Sin necesidades en este territorio" />;

  return (
    <div>
      <div className="flex h-3 gap-[2px]">
        {ORDEN_ATENCION.map((e) =>
          atencion[e] ? (
            <motion.div
              key={e}
              title={`${ESTADOS_ATENCION[e].etiqueta}: ${atencion[e]}`}
              className="h-full basis-0 first:rounded-l-[4px] last:rounded-r-[4px]"
              style={{ background: ESTADOS_ATENCION[e].color }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: atencion[e] }}
              transition={{ duration: 0.9, ease: suave }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 grid grid-flow-col grid-cols-2 grid-rows-2 gap-x-4 gap-y-2">
        {ORDEN_ATENCION.map((e) => (
          <li key={e} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-secondary">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: ESTADOS_ATENCION[e].color }}
              />
              <span className="truncate">{ESTADOS_ATENCION[e].etiqueta}</span>
            </span>
            <span className="cifra text-primary">
              {formatoNumero(atencion[e])}
              <span className="ml-1 text-muted">{Math.round((atencion[e] * 100) / total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Ranking({
  filas,
  onElegir,
  accion,
}: {
  filas: { codigo: string; nombre: string; valor: number }[];
  onElegir: (codigo: string) => void;
  accion: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (!filas.length) return <Vacio />;

  return (
    <ol className="space-y-0.5">
      {filas.map((f, i) => (
        <motion.li
          key={f.codigo}
          layout
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.45, ease: suave }}
        >
          <button
            onClick={() => onElegir(f.codigo)}
            title={accion}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-sm px-2 py-2 text-left transition-colors hover:bg-white/5"
          >
            <motion.span
              className="absolute inset-y-1 left-0 rounded-r-[4px] bg-[rgba(255,200,0,.09)]"
              initial={{ width: 0 }}
              animate={{ width: `${(f.valor * 100) / max}%` }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: suave }}
            />
            <span
              className={`cifra relative grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                i === 0 ? "bg-action-primary text-action-primary-text" : "bg-white/8 text-secondary"
              }`}
            >
              {i + 1}
            </span>
            <span className="relative min-w-0 flex-1 truncate text-sm text-secondary group-hover:text-primary">
              {f.nombre}
            </span>
            <span className="cifra relative text-sm font-bold text-primary">
              {formatoNumero(f.valor)}
            </span>
            <ArrowUpRight className="relative size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </motion.li>
      ))}
    </ol>
  );
}

function Vacio({ texto = "Sin registros con los filtros actuales" }: { texto?: string }) {
  return <p className="py-6 text-center text-xs text-muted">{texto}</p>;
}

