"use client";

import { useState } from "react";
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
  formatoNumero,
  temaDe,
} from "@/lib/datos/catalogos";
import type { Resumen } from "@/lib/datos/agregar";
import type { EstadoAtencion } from "@/lib/datos/tipos";
import { EASE, reducirMovimiento } from "@/lib/ui/movimiento";
import { EstadoVacio } from "./EstadoVacio";

const suave = EASE.salida;

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
              y {resto.length} temas más · {formatoNumero(resto.reduce((a, t) => a + t.total, 0))}{" "}
              aportes
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

/**
 * Participación en el tiempo. La serie llega ya decidida (semanal o mensual) desde `resumir`.
 *
 * El último periodo va en curso: se dibuja punteado y rotulado, porque leído como un punto más
 * parece un desplome cuando en realidad la semana no ha terminado.
 */
export function GraficaEvolucion({ evolucion }: { evolucion: Resumen["evolucion"] }) {
  if (!evolucion.some((d) => d.aportes > 0)) return <Vacio />;

  const n = evolucion.length;
  const corte = evolucion[n - 1]?.parcial ? n - 2 : n - 1;
  // Con un solo periodo cerrado no hay línea que dibujar: se muestran los puntos.
  const puntea = corte >= 1;
  const datos = evolucion.map((d, i) => ({
    ...d,
    cerrado: !puntea || i <= corte ? d.aportes : null,
    enCurso: puntea && i >= corte ? d.aportes : null,
  }));
  const pico = evolucion.reduce((m, d) => (!d.parcial && d.aportes > m.aportes ? d : m), {
    ...evolucion[0],
    aportes: -1,
  });
  const semanal = evolucion[0]?.clave.length === 10;

  return (
    <div>
      {pico.aportes > 0 && (
        <p className="mb-2 text-xs text-secondary">
          Pico: {semanal ? "semana del " : ""}
          <span className="text-primary">{pico.etiqueta}</span> ·{" "}
          <span className="cifra text-primary">{formatoNumero(pico.aportes)}</span> aportes
        </p>
      )}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%" debounce={40}>
          <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="relleno-evolucion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC800" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#FFC800" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis-text)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={18}
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
              content={({ active, payload }) => {
                const punto = payload?.[0]?.payload as Resumen["evolucion"][number] | undefined;
                return active && punto ? (
                  <div className="rounded-md border border-default bg-surface-3 px-3 py-2 shadow-[var(--shadow-card)]">
                    <p className="etiqueta">
                      {semanal ? "Semana del " : ""}
                      {punto.etiqueta}
                    </p>
                    <p className="text-sm">
                      <span className="cifra font-bold text-primary">
                        {formatoNumero(punto.aportes)}
                      </span>{" "}
                      <span className="text-secondary">aportes</span>
                    </p>
                    {punto.parcial && <p className="text-[11px] text-accent">Periodo en curso</p>}
                  </div>
                ) : null;
              }}
            />
            <Area
              type="monotone"
              dataKey="cerrado"
              stroke="#FFC800"
              strokeWidth={2}
              fill="url(#relleno-evolucion)"
              activeDot={{ r: 5, fill: "#FFC800", stroke: "#0A1A3A", strokeWidth: 2 }}
              dot={puntea ? false : { r: 3, fill: "#FFC800", stroke: "#0A1A3A", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={!reducirMovimiento()}
              animationDuration={1100}
            />
            {puntea && (
              <Area
                type="monotone"
                dataKey="enCurso"
                stroke="#FFC800"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
                activeDot={{ r: 5, fill: "#FFC800", stroke: "#0A1A3A", strokeWidth: 2 }}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {puntea && (
        <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-muted">
          <span className="inline-block h-px w-5 border-t-2 border-dashed border-gold-500" />
          {semanal ? "Semana" : "Mes"} en curso
        </p>
      )}
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
  const [señalado, setSenalado] = useState<EstadoAtencion | null>(null);
  const total = ORDEN_ATENCION.reduce((a, e) => a + atencion[e], 0);
  if (!total) return <Vacio texto="Sin necesidades en este territorio" />;
  const pendientes = atencion.sin_respuesta_registrada;
  const fondo = (e: (typeof ORDEN_ATENCION)[number]) =>
    e === "sin_respuesta_registrada"
      ? {
          background:
            "repeating-linear-gradient(135deg, rgba(169,203,245,.34) 0 3px, rgba(30,58,107,.9) 3px 7px)",
          boxShadow: "inset 0 0 0 1px rgba(169,203,245,.45)",
        }
      : { background: ESTADOS_ATENCION[e].color };

  return (
    <div>
      <p className="mb-2.5 text-sm text-secondary">
        <span className="cifra-display text-xl font-extrabold text-primary">
          {((atencion.respondido * 100) / total).toFixed(1).replace(".", ",")} %
        </span>{" "}
        con respuesta ·{" "}
        <span className="cifra text-primary">{formatoNumero(atencion.respondido)}</span> de{" "}
        <span className="cifra text-primary">{formatoNumero(total)}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {formatoNumero(pendientes)} aún sin respuesta registrada
        </span>
      </p>
      <div className="flex h-3.5 gap-[2px]">
        {ORDEN_ATENCION.map((e) =>
          atencion[e] ? (
            <motion.div
              key={e}
              title={`${ESTADOS_ATENCION[e].etiqueta}: ${formatoNumero(atencion[e])}`}
              onPointerEnter={() => setSenalado(e)}
              onPointerLeave={() => setSenalado(null)}
              className={`h-full basis-0 transition-opacity first:rounded-l-[4px] last:rounded-r-[4px] ${
                señalado && señalado !== e ? "opacity-35" : ""
              }`}
              style={fondo(e)}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: atencion[e] }}
              transition={{ duration: 0.9, ease: suave }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 grid grid-flow-col grid-cols-2 grid-rows-2 gap-x-4 gap-y-2">
        {ORDEN_ATENCION.map((e) => (
          <li
            key={e}
            onPointerEnter={() => setSenalado(e)}
            onPointerLeave={() => setSenalado(null)}
            className={`flex items-center justify-between gap-2 text-xs transition-opacity ${
              señalado && señalado !== e ? "opacity-35" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 text-secondary">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={fondo(e)} />
              <span className="truncate">{ESTADOS_ATENCION[e].etiqueta}</span>
            </span>
            <span className="cifra text-primary">
              {formatoNumero(atencion[e])}
              <span className="ml-1 text-muted">{Math.round((atencion[e] * 100) / total)}%</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] text-muted">Según la última actuación registrada.</p>
    </div>
  );
}

export function Ranking({
  filas,
  onElegir,
  onResaltar,
  accion,
}: {
  filas: { codigo: string; nombre: string; valor: number }[];
  onElegir: (codigo: string) => void;
  /** Señala el territorio en el mapa mientras el cursor está encima de la fila. */
  onResaltar: (codigo: string | null) => void;
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
            onPointerEnter={(e) => e.pointerType === "mouse" && onResaltar(f.codigo)}
            onPointerLeave={() => onResaltar(null)}
            onFocus={() => onResaltar(f.codigo)}
            onBlur={() => onResaltar(null)}
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
  return (
    <EstadoVacio
      compacto
      titulo={texto}
      detalle="Pruebe con otro territorio o quite algún filtro."
    />
  );
}
