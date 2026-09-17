"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Box, ChevronDown, ChevronLeft, Layers, Map as MapaIcono, X } from "lucide-react";
import {
  CANALES,
  METRICAS,
  TEMAS,
  SIN_TEMA,
  formatoNumero,
  type Metrica,
} from "@/lib/datos/catalogos";
import type { Filtros } from "@/lib/datos/agregar";
import type { Canal } from "@/lib/datos/tipos";

const suave = [0.22, 1, 0.36, 1] as const;

export function MigaTerritorio({
  departamento,
  nombreDepto,
  municipios,
  onSalir,
}: {
  departamento: string | null;
  nombreDepto: string;
  municipios: number;
  onSalir: () => void;
}) {
  return (
    <div className="vidrio pointer-events-auto flex items-center gap-3 rounded-md py-2.5 pr-4 pl-2.5 shadow-[var(--shadow-card)]">
      <AnimatePresence mode="popLayout" initial={false}>
        {departamento ? (
          <motion.button
            key="volver"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={onSalir}
            className="grid size-9 place-items-center rounded-sm bg-action-primary text-action-primary-text shadow-glow-gold transition-transform hover:-translate-x-0.5"
            aria-label="Volver a la vista nacional"
          >
            <ChevronLeft className="size-5" />
          </motion.button>
        ) : (
          <motion.span
            key="icono"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="grid size-9 place-items-center rounded-sm bg-[rgba(255,200,0,.12)] text-accent"
          >
            <MapaIcono className="size-5" />
          </motion.span>
        )}
      </AnimatePresence>
      <div className="min-w-0">
        <p className="etiqueta flex items-center gap-1.5 text-[11px]">
          <button onClick={onSalir} className="transition-colors hover:text-accent">
            Colombia
          </button>
          {departamento && (
            <>
              <span>›</span>
              <span className="text-accent">Departamento</span>
            </>
          )}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={departamento ?? "nacional"}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: suave }}
            className="titulo-display truncate text-lg font-extrabold sm:text-xl"
          >
            {departamento ? nombreDepto : "Vista nacional"}
            <span className="ml-2 align-middle text-xs font-semibold tracking-normal text-muted">
              {departamento ? `${municipios} municipios` : "33 departamentos"}
            </span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SelectorMetrica({
  metrica,
  onCambiar,
  modo3d,
  onModo3d,
}: {
  metrica: Metrica;
  onCambiar: (m: Metrica) => void;
  modo3d: boolean;
  onModo3d: () => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <div className="vidrio flex rounded-md p-1 shadow-[var(--shadow-card)]" role="tablist">
        {(Object.keys(METRICAS) as Metrica[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === metrica}
            onClick={() => onCambiar(m)}
            className={`relative rounded-sm px-3 py-1.5 text-xs font-bold tracking-[0.06em] uppercase transition-colors ${
              m === metrica ? "text-action-primary-text" : "text-secondary hover:text-primary"
            }`}
          >
            {m === metrica && (
              <motion.span
                layoutId="metrica-activa"
                className="absolute inset-0 rounded-sm bg-action-primary shadow-glow-gold"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{METRICAS[m].etiqueta}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onModo3d}
        aria-pressed={modo3d}
        className={`vidrio flex h-[38px] items-center gap-1.5 rounded-md px-3 text-xs font-bold tracking-[0.06em] uppercase shadow-[var(--shadow-card)] transition-colors ${
          modo3d ? "border-gold-500! text-accent" : "text-secondary hover:text-primary"
        }`}
      >
        {modo3d ? <Box className="size-4" /> : <Layers className="size-4" />}
        {modo3d ? "3D" : "2D"}
      </button>
    </div>
  );
}

export function BarraFiltros({
  filtros,
  onCambiar,
  conteoTemas,
}: {
  filtros: Filtros;
  onCambiar: (f: Filtros) => void;
  conteoTemas: Record<string, number>;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    window.addEventListener("mousedown", cerrar);
    return () => window.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const alternar = <T,>(lista: T[], valor: T) =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

  const activos = filtros.temas.length + filtros.canales.length;
  const ordenTemas = Object.keys(TEMAS)
    .filter((t) => t !== SIN_TEMA || (conteoTemas[t] ?? 0) > 0)
    .sort((a, b) =>
      a === SIN_TEMA ? 1 : b === SIN_TEMA ? -1 : (conteoTemas[b] ?? 0) - (conteoTemas[a] ?? 0),
    );

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2">
      <div ref={caja} className="relative">
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className={`vidrio flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold shadow-[var(--shadow-card)] transition-colors ${
            filtros.temas.length ? "border-gold-500! text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          Temas
          {filtros.temas.length > 0 && (
            <span className="cifra grid size-5 place-items-center rounded-full bg-action-primary text-[10px] text-action-primary-text">
              {filtros.temas.length}
            </span>
          )}
          <ChevronDown className={`size-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {abierto && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: suave }}
              className="absolute top-11 left-0 z-40 w-[min(26rem,calc(100vw-2rem))] rounded-md border border-default bg-surface-3 p-3 shadow-[var(--shadow-deep)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="etiqueta">Filtrar por tema</p>
                {filtros.temas.length > 0 && (
                  <button
                    onClick={() => onCambiar({ ...filtros, temas: [] })}
                    className="text-xs text-link hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ordenTemas.map((clave, i) => {
                  const { etiqueta, corta, icono: Icono } = TEMAS[clave];
                  const activo = filtros.temas.includes(clave);
                  return (
                    <motion.button
                      key={clave}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }}
                      onClick={() => onCambiar({ ...filtros, temas: alternar(filtros.temas, clave) })}
                      aria-pressed={activo}
                      title={etiqueta}
                      className={`flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs transition-all ${
                        activo
                          ? "border-gold-500 bg-[rgba(255,200,0,.14)] text-primary"
                          : "border-subtle text-secondary hover:border-default hover:bg-white/5 hover:text-primary"
                      }`}
                    >
                      <Icono className={`size-3.5 ${activo ? "text-accent" : ""}`} />
                      {corta}
                      <span className="cifra text-[10px] text-muted">
                        {formatoNumero(conteoTemas[clave] ?? 0)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-snug text-muted">
                Temas por sector del Gobierno nacional.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="vidrio flex h-9 items-center gap-0.5 rounded-md p-1 shadow-[var(--shadow-card)]">
        {(Object.keys(CANALES) as Canal[]).map((c) => {
          const { etiqueta, icono: Icono } = CANALES[c];
          const activo = filtros.canales.includes(c);
          return (
            <button
              key={c}
              onClick={() => onCambiar({ ...filtros, canales: alternar(filtros.canales, c) })}
              aria-pressed={activo}
              title={`Canal ${etiqueta}`}
              className={`flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold transition-colors ${
                activo ? "bg-[rgba(255,200,0,.16)] text-accent" : "text-secondary hover:text-primary"
              }`}
            >
              <Icono className="size-3.5" />
              <span className="hidden sm:inline">{etiqueta}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activos > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            onClick={() => onCambiar({ temas: [], canales: [] })}
            className="vidrio flex h-9 items-center gap-1.5 rounded-md px-3 text-xs text-secondary hover:text-primary"
          >
            <X className="size-3.5" /> Limpiar
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
