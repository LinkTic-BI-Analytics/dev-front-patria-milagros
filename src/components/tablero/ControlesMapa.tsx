"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  Globe,
  Map as MapaIcono,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CANALES,
  METRICAS,
  TEMAS,
  SIN_TEMA,
  formatoNumero,
  type Metrica,
} from "@/lib/datos/catalogos";
import type { Filtros } from "@/lib/datos/agregar";
import type { Ambito } from "@/components/mapa/MapaColombia";
import type { Canal, PndResumen } from "@/lib/datos/tipos";
import { EASE } from "@/lib/ui/movimiento";
import { useEscape } from "@/lib/ui/useEscape";
import { Segmentado } from "@/components/ui/Segmentado";
import { usePista } from "@/components/ui/Pista";

const suave = EASE.salida;

export function MigaTerritorio({
  departamento,
  nombreDepto,
  municipios,
  ambito,
  totalPaises,
  totalDepartamentos,
  onSalir,
}: {
  departamento: string | null;
  nombreDepto: string;
  municipios: number;
  ambito: Ambito;
  totalPaises: number;
  totalDepartamentos: number;
  onSalir: () => void;
}) {
  const internacional = ambito === "internacional";
  const abierto = internacional || Boolean(departamento);
  return (
    <div className="vidrio pointer-events-auto flex items-center gap-3 rounded-md py-2 pr-4 pl-2.5 shadow-[var(--shadow-card)]">
      {/* Sin AnimatePresence: el icono y el texto se reemplazan y entran animados.
          Con salidas encadenadas la miga se quedaba mostrando la vista anterior. */}
      <motion.div
        key={abierto ? "volver" : "icono"}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: suave }}
      >
        {abierto ? (
          <button
            onClick={onSalir}
            className="grid size-9 place-items-center rounded-sm bg-action-primary text-action-primary-text shadow-glow-gold transition-transform hover:-translate-x-0.5"
            aria-label={internacional ? "Volver a Colombia" : "Volver a la vista nacional"}
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="grid size-9 place-items-center rounded-sm bg-[rgba(255,200,0,.12)] text-accent">
            <MapaIcono className="size-5" />
          </span>
        )}
      </motion.div>

      <div className="min-w-0">
        <p className="etiqueta flex items-center gap-1.5 text-[11px]">
          {/* Objetivo táctil de 44 px sin agrandar el texto: el área se extiende por fuera. */}
          <button
            onClick={onSalir}
            className="relative transition-colors after:absolute after:-inset-2 hover:text-accent"
          >
            {internacional ? "Mundo" : "Colombia"}
          </button>
          {departamento && !internacional && (
            <>
              <span>›</span>
              <span className="text-accent">Departamento</span>
            </>
          )}
        </p>
        <motion.p
          key={internacional ? "mundo" : (departamento ?? "nacional")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: suave }}
          className="titulo-display truncate text-[1rem] font-extrabold @4xl:text-xl"
        >
          {internacional ? "Vista internacional" : departamento ? nombreDepto : "Vista nacional"}
          {/* El contador es contexto, no dato: es lo primero que sobra cuando no hay ancho. */}
          <span className="ml-2 hidden align-middle text-xs font-semibold tracking-normal text-muted @4xl:inline">
            {internacional
              ? `${totalPaises} países`
              : departamento
                ? `${municipios} municipios`
                : `${totalDepartamentos} departamentos`}
          </span>
        </motion.p>
      </div>
    </div>
  );
}

const AMBITOS = [
  { valor: "nacional" as const, etiqueta: "Colombia", icono: MapaIcono },
  { valor: "internacional" as const, etiqueta: "Mundo", icono: Globe, titulo: "Vista mundo" },
];

const METRICAS_OPCIONES = (Object.keys(METRICAS) as Metrica[]).map((m) => ({
  valor: m,
  etiqueta: METRICAS[m].etiqueta,
}));

export function SelectorMetrica({
  metrica,
  onCambiar,
  ambito,
  onAmbito,
}: {
  metrica: Metrica;
  onCambiar: (m: Metrica) => void;
  ambito: Ambito;
  onAmbito: (a: Ambito) => void;
}) {
  const metricas = METRICAS_OPCIONES;
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
      {/* Por debajo de 896 px el ámbito se queda solo con sus iconos: es lo que menos texto necesita. */}
      <Segmentado
        valor={ambito}
        opciones={AMBITOS}
        onCambiar={onAmbito}
        etiqueta="Ámbito del mapa"
        layoutId="ambito-activo"
        soloIcono
        className="@4xl:hidden"
      />
      <Segmentado
        valor={ambito}
        opciones={AMBITOS}
        onCambiar={onAmbito}
        etiqueta="Ámbito del mapa"
        layoutId="ambito-activo-ancho"
        className="hidden @4xl:flex"
      />
      <Segmentado
        valor={metrica}
        opciones={metricas}
        onCambiar={onCambiar}
        etiqueta="Cifra que pinta el mapa"
        layoutId="metrica-activa"
      />
    </div>
  );
}

function ChipEje({
  eje,
  activo,
  aportes,
  onClick,
}: {
  eje: PndResumen["ejes"][number];
  activo: boolean;
  aportes: number | null;
  onClick: () => void;
}) {
  const { disparador, pista } = usePista(
    <>
      <span className="font-bold text-accent">Eje {eje.numero}</span> · {eje.nombre}
      {aportes !== null && (
        <span className="mt-0.5 block text-muted">
          <span className="cifra text-secondary">{formatoNumero(aportes)}</span> aportes
        </span>
      )}
    </>,
  );
  return (
    <>
      <button
        {...disparador}
        onClick={onClick}
        aria-pressed={activo}
        aria-label={`Eje ${eje.numero}: ${eje.nombre}`}
        className={`cifra foco-dentro grid size-7 place-items-center rounded-sm text-xs font-bold transition-colors pointer-coarse:size-11 ${
          activo
            ? "bg-action-primary text-action-primary-text"
            : "text-secondary hover:bg-white/8 hover:text-primary"
        }`}
      >
        {eje.numero}
      </button>
      {pista}
    </>
  );
}

export function BarraFiltros({
  filtros,
  onCambiar,
  conteoTemas,
  conteoEjes,
  pnd,
}: {
  filtros: Filtros;
  onCambiar: (f: Filtros) => void;
  conteoTemas: Record<string, number>;
  conteoEjes: Record<string, number>;
  pnd: PndResumen | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const botonTemas = useRef<HTMLButtonElement>(null);

  // Esc cierra el popover (y nada más) y devuelve el foco a su botón.
  useEscape(() => {
    setAbierto(false);
    botonTemas.current?.focus();
  }, abierto);

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

  const activos = filtros.temas.length + filtros.canales.length + filtros.ejes.length;
  const ordenTemas = Object.keys(TEMAS)
    .filter((t) => t !== SIN_TEMA || (conteoTemas[t] ?? 0) > 0)
    .sort((a, b) =>
      a === SIN_TEMA ? 1 : b === SIN_TEMA ? -1 : (conteoTemas[b] ?? 0) - (conteoTemas[a] ?? 0),
    );

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2">
      <div ref={caja} className="relative">
        <button
          ref={botonTemas}
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className={`vidrio flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold shadow-[var(--shadow-card)] transition-colors pointer-coarse:h-11 ${
            filtros.temas.length
              ? "border-gold-500! text-accent"
              : "text-secondary hover:text-primary"
          }`}
        >
          Temas
          {filtros.temas.length > 0 && (
            <span className="cifra grid size-5 place-items-center rounded-full bg-action-primary text-[11px] text-action-primary-text">
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
              className="scroll-fino absolute top-11 left-0 z-40 max-h-[min(24rem,55dvh)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-md border border-default bg-surface-3 p-3 shadow-[var(--shadow-deep)]"
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
                      onClick={() =>
                        onCambiar({ ...filtros, temas: alternar(filtros.temas, clave) })
                      }
                      aria-pressed={activo}
                      aria-label={`${etiqueta}: ${conteoTemas[clave] ?? 0} aportes`}
                      className={`foco-dentro flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs transition-all pointer-coarse:py-2 ${
                        activo
                          ? "border-gold-500 bg-[rgba(255,200,0,.14)] text-primary"
                          : "border-subtle text-secondary hover:border-default hover:bg-white/5 hover:text-primary"
                      }`}
                    >
                      <Icono className={`size-3.5 ${activo ? "text-accent" : ""}`} />
                      {corta}
                      <span className="cifra text-[11px] text-muted">
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

      {/* Ejes del PND */}
      {pnd && (
        <div className="vidrio flex items-center gap-0.5 rounded-md p-1 shadow-[var(--shadow-card)]">
          <span className="etiqueta px-1.5 text-[11px]">Ejes</span>
          {pnd.ejes.map((eje) => (
            <ChipEje
              key={eje.id}
              eje={eje}
              activo={filtros.ejes.includes(eje.id)}
              aportes={conteoEjes[eje.id] ?? null}
              onClick={() => onCambiar({ ...filtros, ejes: alternar(filtros.ejes, eje.id) })}
            />
          ))}
        </div>
      )}

      <div
        role="group"
        aria-label="Canal de llegada"
        className="vidrio flex items-center gap-0.5 rounded-md p-1 shadow-[var(--shadow-card)]"
      >
        {(Object.keys(CANALES) as Canal[]).map((c) => {
          const { etiqueta, icono: Icono } = CANALES[c];
          const activo = filtros.canales.includes(c);
          return (
            <button
              key={c}
              onClick={() => onCambiar({ ...filtros, canales: alternar(filtros.canales, c) })}
              aria-pressed={activo}
              aria-label={`Canal ${etiqueta}`}
              className={`foco-dentro flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold transition-colors pointer-coarse:h-11 ${
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
            onClick={() => onCambiar({ temas: [], canales: [], ejes: [] })}
            className="vidrio flex h-9 items-center gap-1.5 rounded-md px-3 text-xs text-secondary hover:text-primary pointer-coarse:h-11"
          >
            <X className="size-3.5" /> Limpiar
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ─────────────────────── Móvil: los filtros en una hoja inferior ─────────────────────── */

/**
 * Por debajo de 672 px los controles tapaban media pantalla. Aquí arriba solo quedan la miga, un
 * botón de filtros y la métrica; lo demás vive en una hoja que sube desde abajo.
 *
 * Va por portal a `document.body`: cualquier ancestro con `backdrop-filter` o `transform` —y el
 * mapa está lleno de ellos— rompe el `position: fixed`.
 */
function HojaFiltros({
  filtros,
  onCambiar,
  conteoTemas,
  conteoEjes,
  pnd,
  ambito,
  onAmbito,
  onCerrar,
}: {
  filtros: Filtros;
  onCambiar: (f: Filtros) => void;
  conteoTemas: Record<string, number>;
  conteoEjes: Record<string, number>;
  pnd: PndResumen | null;
  ambito: Ambito;
  onAmbito: (a: Ambito) => void;
  onCerrar: () => void;
}) {
  useEscape(onCerrar);
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const alternar = <T,>(lista: T[], valor: T) =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
  const activos = filtros.temas.length + filtros.canales.length + filtros.ejes.length;
  const ordenTemas = Object.keys(TEMAS)
    .filter((t) => t !== SIN_TEMA || (conteoTemas[t] ?? 0) > 0)
    .sort((a, b) =>
      a === SIN_TEMA ? 1 : b === SIN_TEMA ? -1 : (conteoTemas[b] ?? 0) - (conteoTemas[a] ?? 0),
    );

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 bg-[rgba(3,8,20,.75)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros del mapa"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onCerrar();
        }}
        className="scroll-fino absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto overscroll-contain rounded-t-lg border-t border-default bg-surface-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* Asa: además de arrastrar, avisa de que la hoja se puede bajar */}
        <div className="sticky top-0 z-10 flex flex-col items-center gap-2 bg-surface-3 pt-2 pb-3">
          <span className="h-1 w-10 rounded-full bg-white/25" />
          <div className="flex w-full items-center justify-between px-4">
            <p className="etiqueta">Filtros</p>
            <div className="flex items-center gap-3">
              {activos > 0 && (
                <button
                  onClick={() => onCambiar({ temas: [], canales: [], ejes: [] })}
                  className="text-xs text-link"
                >
                  Limpiar
                </button>
              )}
              <button onClick={onCerrar} aria-label="Cerrar" className="text-secondary">
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4">
          <div>
            <p className="etiqueta mb-2">Ámbito</p>
            <Segmentado
              valor={ambito}
              opciones={AMBITOS}
              onCambiar={onAmbito}
              etiqueta="Ámbito del mapa"
              layoutId="ambito-hoja"
              alto="h-10"
              className="w-full [&>button]:flex-1"
            />
          </div>

          {pnd && (
            <div>
              <p className="etiqueta mb-2">Ejes del Plan</p>
              <ul className="space-y-1">
                {pnd.ejes.map((eje) => {
                  const activo = filtros.ejes.includes(eje.id);
                  return (
                    <li key={eje.id}>
                      <button
                        onClick={() => onCambiar({ ...filtros, ejes: alternar(filtros.ejes, eje.id) })}
                        aria-pressed={activo}
                        className={`flex h-11 w-full items-center gap-2.5 rounded-sm border px-2.5 text-left text-sm transition-colors ${
                          activo
                            ? "border-gold-500 bg-[rgba(255,200,0,.1)] text-primary"
                            : "border-subtle text-secondary"
                        }`}
                      >
                        <span
                          className={`cifra grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                            activo
                              ? "bg-action-primary text-action-primary-text"
                              : "bg-white/8 text-secondary"
                          }`}
                        >
                          {eje.numero}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{eje.nombre}</span>
                        <span className="cifra text-xs text-muted">
                          {formatoNumero(conteoEjes[eje.id] ?? 0)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="etiqueta mb-2">Canal de llegada</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CANALES) as Canal[]).map((c) => {
                const { etiqueta, icono: Icono } = CANALES[c];
                const activo = filtros.canales.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() =>
                      onCambiar({ ...filtros, canales: alternar(filtros.canales, c) })
                    }
                    aria-pressed={activo}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-sm border text-xs font-semibold transition-colors ${
                      activo
                        ? "border-gold-500 bg-[rgba(255,200,0,.12)] text-accent"
                        : "border-subtle text-secondary"
                    }`}
                  >
                    <Icono className="size-4" />
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="etiqueta mb-2">Temas</p>
            <div className="flex flex-wrap gap-1.5">
              {ordenTemas.map((clave) => {
                const { corta, icono: Icono, etiqueta } = TEMAS[clave];
                const activo = filtros.temas.includes(clave);
                return (
                  <button
                    key={clave}
                    onClick={() => onCambiar({ ...filtros, temas: alternar(filtros.temas, clave) })}
                    aria-pressed={activo}
                    aria-label={`${etiqueta}: ${conteoTemas[clave] ?? 0} aportes`}
                    className={`flex min-h-11 items-center gap-1.5 rounded-xs border px-2.5 text-xs transition-colors ${
                      activo
                        ? "border-gold-500 bg-[rgba(255,200,0,.14)] text-primary"
                        : "border-subtle text-secondary"
                    }`}
                  >
                    <Icono className={`size-3.5 ${activo ? "text-accent" : ""}`} />
                    {corta}
                    <span className="cifra text-[11px] text-muted">
                      {formatoNumero(conteoTemas[clave] ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Los controles del mapa, con su reparto propio en escritorio y en móvil. */
export function ControlesSuperiores({
  medidor,
  ...props
}: {
  /** El Tablero mide este bloque para calcular el encuadre del mapa. Ref de callback: uno de
   *  `useRef` haría que el linter tratara todo `props` como una referencia. */
  medidor?: (el: HTMLDivElement | null) => void;
  departamento: string | null;
  nombreDepto: string;
  municipios: number;
  ambito: Ambito;
  totalPaises: number;
  totalDepartamentos: number;
  onSalir: () => void;
  onAmbito: (a: Ambito) => void;
  metrica: Metrica;
  onMetrica: (m: Metrica) => void;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  conteoTemas: Record<string, number>;
  conteoEjes: Record<string, number>;
  pnd: PndResumen | null;
}) {
  const [hoja, setHoja] = useState(false);
  const activos =
    props.filtros.temas.length + props.filtros.canales.length + props.filtros.ejes.length;

  return (
    <div
      ref={medidor}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <MigaTerritorio
          departamento={props.departamento}
          nombreDepto={props.nombreDepto}
          municipios={props.municipios}
          ambito={props.ambito}
          totalPaises={props.totalPaises}
          totalDepartamentos={props.totalDepartamentos}
          onSalir={props.onSalir}
        />
        <div className="hidden @2xl:block">
          <SelectorMetrica
            metrica={props.metrica}
            onCambiar={props.onMetrica}
            ambito={props.ambito}
            onAmbito={props.onAmbito}
          />
        </div>
        {/* Móvil: un botón en vez de cuatro barras de filtros */}
        <button
          onClick={() => setHoja(true)}
          aria-haspopup="dialog"
          className="vidrio pointer-events-auto flex h-11 items-center gap-2 rounded-md px-3 text-xs font-bold text-secondary @2xl:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filtros
          {activos > 0 && (
            <span className="cifra grid size-5 place-items-center rounded-full bg-action-primary text-[11px] text-action-primary-text">
              {activos}
            </span>
          )}
        </button>
      </div>

      {/* Móvil: la métrica sí se queda arriba, es lo que cambia el mapa */}
      <div className="pointer-events-auto @2xl:hidden">
        <Segmentado
          valor={props.metrica}
          opciones={METRICAS_OPCIONES}
          onCambiar={props.onMetrica}
          etiqueta="Cifra que pinta el mapa"
          layoutId="metrica-movil"
          alto="h-10"
          className="w-full [&>button]:flex-1"
        />
      </div>

      <div className="hidden @2xl:block">
        <BarraFiltros
          filtros={props.filtros}
          onCambiar={props.onFiltros}
          conteoTemas={props.conteoTemas}
          conteoEjes={props.conteoEjes}
          pnd={props.pnd}
        />
      </div>

      <AnimatePresence>
        {hoja && (
          <HojaFiltros
            filtros={props.filtros}
            onCambiar={props.onFiltros}
            conteoTemas={props.conteoTemas}
            conteoEjes={props.conteoEjes}
            pnd={props.pnd}
            ambito={props.ambito}
            onAmbito={props.onAmbito}
            onCerrar={() => setHoja(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
