"use client";

import { motion } from "motion/react";
import { MapPinned, MessagesSquare, Radar, Siren, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CANALES, formatoNumero } from "@/lib/datos/catalogos";
import type { Resumen } from "@/lib/datos/agregar";
import type { Canal } from "@/lib/datos/tipos";
import { CifraAnimada } from "./CifraAnimada";

const entrada = {
  oculto: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Tarjeta({
  i,
  icono: Icono,
  etiqueta,
  children,
  pie,
  className = "",
}: {
  i: number;
  icono: LucideIcon;
  etiqueta: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      custom={i}
      variants={entrada}
      initial="oculto"
      animate="visible"
      whileHover={{ y: -2 }}
      className={`panel group relative overflow-hidden p-4 transition-colors hover:border-default ${className}`}
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[radial-gradient(circle,rgba(255,200,0,.12),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <p className="etiqueta">{etiqueta}</p>
        <Icono className="size-4 text-muted transition-colors group-hover:text-accent" />
      </div>
      <div className="mt-2">{children}</div>
      {pie && <div className="mt-1.5 text-xs text-muted">{pie}</div>}
    </motion.div>
  );
}

export function TarjetasKpi({ r, nacional }: { r: Resumen; nacional: boolean }) {
  const totalCanales = Object.values(r.canales).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* KPI principal */}
      <motion.div
        custom={0}
        variants={entrada}
        initial="oculto"
        animate="visible"
        className="panel relative col-span-2 overflow-hidden border-l-[3px] border-l-gold-500 p-5"
      >
        <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-[radial-gradient(circle,rgba(255,200,0,.16),transparent_65%)]" />
        <div className="flex items-start justify-between">
          <div>
            <p className="etiqueta">Aportes ciudadanos recibidos</p>
            <CifraAnimada
              valor={r.aportes}
              className="mt-1 block text-[2.6rem] leading-none font-bold text-primary"
            />
            <p className="mt-1.5 text-xs text-muted">
              {nacional
                ? `${formatoNumero(r.aportes - r.ubicados)} aún sin municipio confirmado`
                : `${formatoNumero(r.colectivos)} hablan por un colectivo`}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-[rgba(255,200,0,.12)] text-accent">
            <MessagesSquare className="size-5" />
          </span>
        </div>

        {/* Canales: barra apilada con separadores y etiquetas directas */}
        <div className="mt-4 flex h-2 gap-[2px] overflow-hidden rounded-full">
          {(Object.keys(CANALES) as Canal[]).map((c) =>
            r.canales[c] ? (
              <motion.div
                key={c}
                className="h-full basis-0 first:rounded-l-full last:rounded-r-full"
                style={{ background: CANALES[c].color }}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: r.canales[c] }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                title={`${CANALES[c].etiqueta}: ${r.canales[c]}`}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {(Object.keys(CANALES) as Canal[]).map((c) => {
            const { etiqueta, icono: Icono, color } = CANALES[c];
            return (
              <span key={c} className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="size-2 rounded-full" style={{ background: color }} />
                <Icono className="size-3.5 text-muted" />
                {etiqueta}
                <span className="cifra text-primary">
                  {totalCanales ? Math.round((r.canales[c] * 100) / totalCanales) : 0}%
                </span>
              </span>
            );
          })}
        </div>
      </motion.div>

      <Tarjeta
        i={1}
        icono={Target}
        etiqueta={nacional ? "Ubicación resuelta" : "Peso en el país"}
        pie={nacional ? "aportes con municipio confirmado" : "de los aportes ubicados"}
      >
        {r.porcentaje === null ? (
          <span className="cifra text-3xl font-bold text-muted">—</span>
        ) : (
          <CifraAnimada
            valor={r.porcentaje}
            decimales={1}
            sufijo="%"
            className="text-3xl font-bold"
          />
        )}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gold-500"
            initial={{ width: 0 }}
            animate={{ width: `${r.porcentaje ?? 0}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </Tarjeta>

      <Tarjeta i={2} icono={MapPinned} etiqueta="Municipios" pie="con aportes ubicados">
        <CifraAnimada valor={r.municipiosConAportes} className="text-3xl font-bold" />
      </Tarjeta>

      <Tarjeta
        i={3}
        icono={Radar}
        etiqueta="Necesidades"
        pie={
          <>
            <span className="cifra text-secondary">{formatoNumero(r.respondidas)}</span> con
            respuesta registrada
          </>
        }
      >
        <CifraAnimada valor={r.necesidades} className="text-3xl font-bold" />
      </Tarjeta>

      <Tarjeta
        i={4}
        icono={Siren}
        etiqueta="Alertas activas"
        pie={
          <>
            <span className="cifra text-secondary">{formatoNumero(r.etapasAlerta.recibida)}</span>{" "}
            con recepción confirmada
          </>
        }
      >
        <div className="flex items-center gap-2">
          <CifraAnimada valor={r.alertasActivas} className="text-3xl font-bold" />
          {r.alertasActivas > 0 && (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
            </span>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
