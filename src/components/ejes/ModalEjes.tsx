"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gauge,
  Landmark,
  LayoutGrid,
  Pause,
  Play,
  Quote,
  Siren,
  X,
} from "lucide-react";
import { formatoNumero } from "@/lib/datos/catalogos";
import type { ResumenEje, ResumenEjes } from "@/lib/datos/ejes";
import type { PndResumen } from "@/lib/datos/tipos";
import { DUR, EASE, RESORTE } from "@/lib/ui/movimiento";
import { useEscape } from "@/lib/ui/useEscape";
import { CifraAnimada } from "@/components/tablero/CifraAnimada";
import { useOrbita, type Orbita } from "./useOrbita";

type Eje = PndResumen["ejes"][number];

const ENFOCABLES = 'button:not([disabled]),[href],input,[tabindex]:not([tabindex="-1"])';

/**
 * Los seis ejes articuladores del PND en una órbita 3D, cruzados con los aportes del territorio.
 *
 * La profundidad es del navegador (perspectiva + `rotateY/translateZ`). El anillo se recorre con
 * flechas, puntos, teclado, rueda, trackpad y arrastre; todo pasa por `useOrbita`. A la derecha:
 * sin eje abierto, los seis frente a frente; con uno abierto, su ficha.
 */
export function ModalEjes({
  pnd,
  resumen,
  nombreTerritorio,
  filtrosActivos,
  ejesFiltrados,
  onFiltrar,
  onLimpiarFiltros,
  onCerrar,
}: {
  pnd: PndResumen;
  resumen: ResumenEjes;
  nombreTerritorio: string;
  /** Filtros de tema o canal vigentes, ya descritos: las cifras del modal los respetan. */
  filtrosActivos: string[];
  ejesFiltrados: string[];
  onFiltrar: (eje: string) => void;
  onLimpiarFiltros: () => void;
  onCerrar: () => void;
}) {
  const ejes = pnd.ejes;
  const datosDe = (id: string) => resumen.ejes.find((e) => e.id === id)!;

  // Abre donde está la atención: en el eje filtrado, o con el de más aportes al frente.
  const [inicial] = useState(() => {
    const filtrado = ejes.findIndex((e) => ejesFiltrados.includes(e.id));
    const mayor = resumen.ejes.reduce((m, e, i, l) => (e.total > l[m].total ? i : m), 0);
    return {
      elegido: filtrado >= 0 ? filtrado : null,
      alFrente: filtrado >= 0 ? filtrado : mayor,
    };
  });
  const orbita = useOrbita(ejes.length, inicial);
  const { elegido, alFrente } = orbita;
  // Pasar `orbita.columna` directo a `ref` haría que el linter trate todo `orbita` como un ref.
  const { columna } = orbita;
  const medirColumna = useCallback((el: HTMLDivElement | null) => columna(el), [columna]);
  const enVista = elegido ?? alFrente;

  const panel = useRef<HTMLDivElement>(null);
  useEscape(onCerrar);

  // Diálogo de verdad: el foco entra, no sale con Tab, y al cerrar vuelve a quien lo abrió.
  // El fondo ya está `inert` (Tablero); aquí se bloquea además el scroll de la página.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previo?.focus({ preventScroll: true });
    };
  }, []);

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const lista = panel.current?.querySelectorAll<HTMLElement>(ENFOCABLES);
      if (!lista?.length) return;
      const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || activo === panel.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
      return;
    }
    // Con modificadores son atajos del navegador (⌘← es «atrás»): no se tocan.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") orbita.paso(1);
    else if (e.key === "ArrowLeft") orbita.paso(-1);
    else if (e.key === "Home") orbita.irA(0);
    else if (e.key === "End") orbita.irA(ejes.length - 1);
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ejes.length) orbita.irA(Number(e.key) - 1);
    else return;
    e.preventDefault();
  };

  const maximo = Math.max(1, ...resumen.ejes.map((e) => e.total));
  const pctRelacionados = resumen.total ? (resumen.relacionados * 100) / resumen.total : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(3,8,20,.9)] p-2 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DUR.rapida }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ejes"
        onKeyDown={alTeclear}
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: DUR.lenta, ease: EASE.salida }}
        className="panel relative flex h-[min(94dvh,54rem)] w-[min(88rem,100%)] flex-col overflow-hidden outline-none"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(0,49,137,.5),transparent_60%)]" />
        <div className="estrellas pointer-events-none absolute inset-0 opacity-70" />

        {/* Encabezado */}
        <header className="relative flex items-start justify-between gap-4 border-b border-subtle px-4 py-3 sm:px-7 sm:py-4">
          <div>
            <div className="tricolor mb-2">
              <span />
              <span />
              <span />
            </div>
            <p className="etiqueta text-accent">
              <span className="sm:hidden">PND 2026–2030</span>
              <span className="hidden sm:inline">Plan Nacional de Desarrollo 2026–2030</span>
            </p>
            <h2 id="titulo-ejes" className="titulo-display mt-1 text-xl font-black sm:text-3xl">
              Ejes articuladores
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {elegido === null ? (
              <button
                onClick={orbita.alternarPausa}
                aria-pressed={!orbita.pausaManual}
                className="vidrio flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-secondary transition-colors hover:text-primary sm:px-3"
              >
                {orbita.pausaManual ? (
                  <Play className="size-3.5" />
                ) : (
                  <Pause className="size-3.5" />
                )}
                <span className="hidden sm:inline">Giro automático</span>
              </button>
            ) : (
              <button
                onClick={orbita.verLosSeis}
                className="vidrio flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-secondary transition-colors hover:text-primary sm:px-3"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Ver los seis</span>
              </button>
            )}
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid size-9 place-items-center rounded-md border border-default text-secondary transition-colors hover:border-gold-500 hover:text-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Cuerpo */}
        <div className="relative grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain p-3 sm:gap-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_clamp(26rem,38%,34rem)] lg:overflow-hidden">
          {/* ── Órbita ── */}
          <div className="flex min-w-0 flex-col gap-3">
            {/* El universo que se reparte entre los ejes */}
            <div className="rounded-md border border-subtle bg-[rgba(6,20,42,.55)] px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm text-secondary">
                  <CifraAnimada
                    variante="display"
                    valor={resumen.total}
                    className="mr-1.5 text-2xl font-extrabold text-accent"
                  />
                  aportes en {nombreTerritorio}
                </p>
                {filtrosActivos.length > 0 && (
                  <p className="flex items-center gap-2 text-xs text-muted">
                    Filtrado por:{" "}
                    <span className="text-secondary">{filtrosActivos.join(" · ")}</span>
                    <button onClick={onLimpiarFiltros} className="text-link hover:underline">
                      Quitar
                    </button>
                  </p>
                )}
              </div>
              <div className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
                <motion.span
                  className="block h-full rounded-l-full bg-gold-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pctRelacionados}%` }}
                  transition={{ duration: DUR.escena, ease: EASE.salida }}
                />
                <span className="block h-full flex-1 rounded-r-full bg-white/15" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                <span className="cifra text-secondary">{formatoNumero(resumen.relacionados)}</span>{" "}
                relacionados con el Plan ({pctRelacionados.toFixed(1).replace(".", ",")} %) ·{" "}
                <span className="cifra text-secondary">{formatoNumero(resumen.sinRelacion)}</span>{" "}
                sin relación clara
              </p>
            </div>

            {/* Escena 3D: aquí viven la rueda, el arrastre y el radio medido */}
            <div
              ref={medirColumna}
              {...orbita.foco}
              className={`relative min-h-[15rem] flex-1 overflow-hidden rounded-md transition-[min-height] duration-300 [perspective:1400px] ${
                elegido === null ? "max-lg:min-h-[19rem]" : "max-lg:min-h-[14.5rem]"
              }`}
            >
              <motion.div
                {...orbita.escena}
                className="absolute inset-0 grid cursor-grab touch-pan-y place-items-center select-none active:cursor-grabbing"
              >
                {/* Nada de opacity, filter ni overflow aquí: aplanarían el 3D */}
                <motion.div
                  className="relative size-0 [transform-style:preserve-3d]"
                  style={
                    {
                      rotateX: -8,
                      rotateY: orbita.rotacion,
                      "--radio": orbita.radioCss,
                    } as never
                  }
                >
                  {ejes.map((eje, i) => (
                    <TarjetaEje
                      key={eje.id}
                      eje={eje}
                      datos={datosDe(eje.id)}
                      indice={i}
                      orbita={orbita}
                      activo={elegido === i}
                      filtrado={ejesFiltrados.includes(eje.id)}
                      nombreTerritorio={nombreTerritorio}
                    />
                  ))}
                </motion.div>
              </motion.div>

              {/* Flechas: hermanas de la capa con gestos, para que un clic no cuente como arrastre */}
              {([-1, 1] as const).map((dir) => {
                const vecino = ejes[(enVista + dir + ejes.length) % ejes.length];
                return (
                  <motion.button
                    key={dir}
                    onClick={() => orbita.paso(dir)}
                    whileTap={{ scale: 0.92 }}
                    aria-label={`Eje ${dir === 1 ? "siguiente" : "anterior"}: ${vecino.nombre}`}
                    className={`vidrio absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-secondary transition-colors hover:border-gold-500 hover:text-accent sm:grid ${
                      dir === 1 ? "right-2" : "left-2"
                    }`}
                  >
                    {dir === 1 ? (
                      <ChevronRight className="size-5" />
                    ) : (
                      <ChevronLeft className="size-5" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Indicador de posición: el único tablist del modal */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <button
                onClick={() => orbita.paso(-1)}
                aria-label="Eje anterior"
                className="vidrio grid size-10 place-items-center rounded-full text-secondary sm:hidden"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div role="tablist" aria-label="Ejes del Plan" className="flex items-center gap-1">
                {ejes.map((eje, i) => {
                  const d = datosDe(eje.id);
                  return (
                    <button
                      key={eje.id}
                      role="tab"
                      aria-selected={enVista === i}
                      aria-controls="detalle-eje"
                      aria-label={`Eje ${eje.numero}: ${eje.nombre}, ${d.total} aportes`}
                      onClick={() => orbita.irA(i)}
                      className={`cifra relative grid size-8 place-items-center rounded-full text-xs font-bold transition-colors pointer-coarse:size-10 ${
                        enVista === i
                          ? "text-action-primary-text"
                          : "text-secondary hover:text-primary"
                      } ${ejesFiltrados.includes(eje.id) ? "ring-1 ring-gold-500" : ""}`}
                    >
                      {enVista === i && (
                        <motion.span
                          layoutId="eje-en-vista"
                          className="absolute inset-0 rounded-full bg-action-primary"
                          transition={RESORTE.pastilla}
                        />
                      )}
                      <span className="relative">{eje.numero}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => orbita.paso(1)}
                aria-label="Eje siguiente"
                className="vidrio grid size-10 place-items-center rounded-full text-secondary sm:hidden"
              >
                <ChevronRight className="size-5" />
              </button>
              <p aria-live="polite" className="w-full text-center text-xs text-secondary sm:w-auto">
                <span className="cifra text-muted">
                  {enVista + 1} / {ejes.length}
                </span>{" "}
                · {ejes[enVista].nombre}
                <span className="ml-3 hidden text-muted pointer-fine:inline">
                  Flechas, rueda o arrastre
                </span>
                <span className="ml-3 hidden text-muted pointer-coarse:inline">
                  Deslice para girar
                </span>
              </p>
            </div>
          </div>

          {/* ── Panel derecho: los seis frente a frente, o la ficha del eje abierto ── */}
          {/* Rejilla apilada: el que sale y el que entra comparten celda, sin `mode="wait"`. */}
          <div id="detalle-eje" role="tabpanel" className="grid min-h-0 min-w-0">
            <AnimatePresence initial={false} custom={orbita.sentido}>
              <motion.div
                key={elegido === null ? "panorama" : ejes[elegido].id}
                custom={orbita.sentido}
                variants={{
                  entra: (d: number) => ({ opacity: 0, x: 28 * d }),
                  centro: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.22, ease: EASE.salida },
                  },
                  sale: (d: number) => ({
                    opacity: 0,
                    x: -28 * d,
                    pointerEvents: "none" as const,
                    transition: { duration: 0.18 },
                  }),
                }}
                initial="entra"
                animate="centro"
                exit="sale"
                className="flex min-h-0 flex-col [grid-area:1/1]"
              >
                {elegido === null ? (
                  <PanoramaEjes
                    ejes={ejes}
                    resumen={resumen}
                    maximo={maximo}
                    nombreTerritorio={nombreTerritorio}
                    ejesFiltrados={ejesFiltrados}
                    orbita={orbita}
                  />
                ) : (
                  <DetalleEje
                    eje={ejes[elegido]}
                    datos={datosDe(ejes[elegido].id)}
                    nombreTerritorio={nombreTerritorio}
                    filtrado={ejesFiltrados.includes(ejes[elegido].id)}
                    onFiltrar={() => onFiltrar(ejes[elegido].id)}
                    onCerrar={onCerrar}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="relative border-t border-subtle px-4 py-2 text-[11px] text-muted sm:px-7">
          <details>
            <summary className="cursor-pointer select-none hover:text-secondary">
              Fuente y método
            </summary>
            <p className="mt-1.5 leading-relaxed">
              {pnd.fuente}. Cada aporte se relaciona con un eje por las palabras clave de su relato,
              sin inteligencia artificial. Una necesidad puede tocar varios ejes.
            </p>
          </details>
        </footer>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── Tarjeta de la órbita ───────────────────────── */

function TarjetaEje({
  eje,
  datos,
  indice,
  orbita,
  activo,
  filtrado,
  nombreTerritorio,
}: {
  eje: Eje;
  datos: ResumenEje;
  indice: number;
  orbita: Orbita;
  activo: boolean;
  filtrado: boolean;
  nombreTerritorio: string;
}) {
  const { rotacion, grados } = orbita;
  // Ángulo de la tarjeta respecto a la cámara, en (−180, 180].
  const angulo = useTransform(rotacion, (r) => ((((r + indice * grados) % 360) + 540) % 360) - 180);
  // Efecto cartelera: la tarjeta se vuelve casi de frente (como mucho 22° de sesgo), así las
  // laterales se leen en vez de verse de canto.
  const contra = useTransform(angulo, (a) => -a + 22 * Math.sin((a * Math.PI) / 180));
  const frente = useTransform(angulo, (a) => Math.cos((a * Math.PI) / 180) * 0.5 + 0.5);
  // Las de delante son opacas (si no, las de atrás se transparentan y los textos se pisan); las
  // de atrás apenas se insinúan.
  const opacidad = useTransform(frente, [0, 0.3, 0.6], [0, 0.14, 1]);
  // La profundidad se da con un velo interno: `filter` o `backdrop-filter` aquí aplanarían el 3D.
  const velo = useTransform(frente, [0, 1], [0.62, 0]);
  const toques = useTransform(frente, (f) => (f < 0.3 ? "none" : "auto"));
  const gestos = orbita.tarjeta(indice);
  const principal = datos.lineas[0];

  return (
    // La posición en la órbita va en la plantilla: si fuera un `transform` en cadena, motion no
    // podría sumarle su `rotateY`.
    <motion.div
      style={{
        rotateY: contra,
        opacity: opacidad,
        pointerEvents: toques as MotionValue<string>,
      }}
      transformTemplate={(_, generado) =>
        `rotateY(${indice * grados}deg) translateZ(var(--radio)) ${generado}`
      }
      className="absolute top-1/2 left-1/2 -mt-[5.75rem] -ml-[4.75rem] h-[11.5rem] w-[9.5rem] sm:-mt-[7.5rem] sm:-ml-[6.5rem] sm:h-60 sm:w-52"
    >
      <motion.button
        tabIndex={-1}
        aria-hidden
        onClick={gestos.onElegir}
        onPointerEnter={gestos.onPointerEnter}
        onPointerLeave={gestos.onPointerLeave}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        className={`relative flex size-full flex-col gap-2 overflow-hidden rounded-lg border-2 p-3 text-left shadow-[var(--shadow-deep)] transition-colors sm:gap-3 sm:p-5 ${
          activo
            ? "border-gold-500 bg-[linear-gradient(180deg,#2b2a1c,#0a1a3a)] shadow-glow-gold"
            : "border-default bg-[#0c1f45]"
        }`}
      >
        <span className="flex items-center justify-between">
          <span
            className={`cifra grid size-7 place-items-center rounded-full text-xs font-bold sm:size-9 sm:text-sm ${
              activo ? "bg-action-primary text-action-primary-text" : "bg-white/10 text-accent"
            }`}
          >
            {eje.numero}
          </span>
          {filtrado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,200,0,.16)] px-2 py-0.5 text-[10px] font-bold text-accent">
              <Filter className="size-3" /> Filtro
            </span>
          )}
        </span>
        <span className="titulo-display text-[0.8rem] leading-tight font-extrabold text-balance text-primary sm:text-[1.05rem]">
          {eje.nombre}
        </span>
        {principal && principal.n > 0 && (
          <span className="line-clamp-2 text-[11px] leading-snug text-muted max-sm:hidden">
            {principal.nombre}
          </span>
        )}
        <span className="mt-auto">
          <span className="cifra-display text-xl font-extrabold text-accent sm:text-2xl">
            {formatoNumero(datos.total)}
          </span>
          <span className="ml-1.5 text-[10px] text-secondary sm:text-[11px]">
            {Math.round(datos.porcentaje)} % de {nombreTerritorio}
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full min-w-[2px] rounded-full bg-gold-500"
              style={{ width: `${datos.porcentaje}%` }}
            />
          </span>
        </span>
        <motion.span
          aria-hidden
          style={{ opacity: velo }}
          className="pointer-events-none absolute inset-0 bg-[#030814]"
        />
      </motion.button>
    </motion.div>
  );
}

/* ───────────────────────── Los seis frente a frente ───────────────────────── */

function PanoramaEjes({
  ejes,
  resumen,
  maximo,
  nombreTerritorio,
  ejesFiltrados,
  orbita,
}: {
  ejes: Eje[];
  resumen: ResumenEjes;
  maximo: number;
  nombreTerritorio: string;
  ejesFiltrados: string[];
  orbita: Orbita;
}) {
  const [porPeso, setPorPeso] = useState(true);
  const intencion = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(intencion.current), []);

  const filas = useMemo(() => {
    const lista = ejes.map((eje, i) => ({ eje, i, d: resumen.ejes[i] }));
    return porPeso ? [...lista].sort((a, b) => b.d.total - a.d.total) : lista;
  }, [ejes, resumen, porPeso]);
  const lider = [...filas].sort((a, b) => b.d.total - a.d.total)[0];
  const pctSin = resumen.total ? (resumen.sinRelacion * 100) / resumen.total : 0;

  return (
    <div className="scroll-fino flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-md border border-subtle bg-[rgba(10,26,58,.55)] p-4 sm:p-5">
      <p className="etiqueta text-accent">Los seis ejes frente a frente</p>
      <p className="font-display mt-2 text-lg leading-snug font-bold sm:text-xl">
        {resumen.relacionados > 0 ? (
          <>
            <span className="text-accent">{lider.eje.nombre}</span> concentra el{" "}
            {Math.round(lider.d.porcentaje)} % de los aportes de {nombreTerritorio}.
          </>
        ) : (
          <>Aún no hay aportes de {nombreTerritorio} relacionados con el Plan.</>
        )}
      </p>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <p className="text-xs text-muted">Aportes por eje · clic para abrir</p>
        <button onClick={() => setPorPeso((p) => !p)} className="text-xs text-link hover:underline">
          Ordenar {porPeso ? "por número" : "por peso"}
        </button>
      </div>

      <ul className="space-y-1">
        {filas.map(({ eje, i, d }, orden) => (
          <li key={eje.id}>
            <button
              onClick={() => orbita.irA(i)}
              // Pasar por la fila gira el anillo hacia ese eje, con un instante de intención para
              // que barrer la lista con el cursor no encadene seis giros.
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                clearTimeout(intencion.current);
                intencion.current = setTimeout(() => orbita.girarA(i), 120);
              }}
              onPointerLeave={() => clearTimeout(intencion.current)}
              className="group grid w-full grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-1 rounded-sm border border-transparent px-2 py-2 text-left transition-colors hover:border-default hover:bg-white/5"
            >
              <span className="cifra row-span-2 grid size-7 place-items-center rounded-full bg-white/8 text-xs font-bold text-accent">
                {eje.numero}
              </span>
              <span className="flex min-w-0 items-center gap-2 text-sm text-primary">
                <span className="truncate">{eje.nombre}</span>
                {ejesFiltrados.includes(eje.id) && (
                  <Filter className="size-3 shrink-0 text-accent" />
                )}
              </span>
              <span className="cifra text-right text-sm text-primary">
                {formatoNumero(d.total)}
                <span className="ml-1 text-xs text-muted">{Math.round(d.porcentaje)}%</span>
              </span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                <motion.span
                  className="block h-full rounded-full bg-gold-500 group-hover:brightness-110"
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.total * 100) / maximo}%` }}
                  transition={{
                    duration: 0.7,
                    delay: orden * 0.05,
                    ease: EASE.salida,
                  }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-sm border border-dashed border-default px-3 py-2 text-xs text-muted">
        Sin relación clara con el Plan:{" "}
        <span className="cifra text-secondary">{formatoNumero(resumen.sinRelacion)}</span> (
        {pctSin.toFixed(1).replace(".", ",")} %). Son voces que el Plan todavía no nombra.
      </p>
    </div>
  );
}

/* ───────────────────────── Ficha del eje abierto ───────────────────────── */

function DetalleEje({
  eje,
  datos,
  nombreTerritorio,
  filtrado,
  onFiltrar,
  onCerrar,
}: {
  eje: Eje;
  datos: ResumenEje;
  nombreTerritorio: string;
  filtrado: boolean;
  onFiltrar: () => void;
  onCerrar: () => void;
}) {
  const [verVacias, setVerVacias] = useState(false);
  const [recien, setRecien] = useState(false);
  useEffect(() => {
    if (!recien) return;
    const t = setTimeout(() => setRecien(false), 1400);
    return () => clearTimeout(t);
  }, [recien]);

  const conVoces = datos.lineas.filter((l) => l.n > 0);
  const vacias = datos.lineas.filter((l) => l.n === 0);
  const mayor = Math.max(1, ...conVoces.map((l) => l.n));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-subtle bg-[rgba(10,26,58,.55)]">
      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="cifra grid size-10 shrink-0 place-items-center rounded-full bg-action-primary text-lg font-bold text-action-primary-text shadow-glow-gold">
            {eje.numero}
          </span>
          <h3 className="titulo-display text-lg leading-tight font-extrabold text-balance sm:text-xl">
            {eje.nombre}
          </h3>
        </div>

        <p className="mt-4 border-l-2 border-gold-500 pl-3 text-[15px] leading-relaxed text-primary/90">
          {eje.vision}
        </p>

        {/* Lo que dice la gente */}
        <p className="etiqueta mt-6 mb-2">Lo que dice la gente · {nombreTerritorio}</p>
        <div className="grid grid-cols-3 gap-2">
          <Dato
            valor={datos.total}
            etiqueta="aportes"
            nota={`${Math.round(datos.porcentaje)} % del territorio`}
            destacado
          />
          <Dato
            valor={datos.necesidades}
            etiqueta="necesidades"
            nota={`${formatoNumero(datos.respondidas)} con respuesta`}
          />
          <Dato valor={datos.alertas} etiqueta="alertas activas" nota="sin devolver" alerta />
        </div>

        <p className="etiqueta mt-6 mb-2">Líneas temáticas</p>
        {conVoces.length === 0 ? (
          <p className="text-sm text-muted">
            Ninguna línea de este eje tiene aportes en {nombreTerritorio}.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {conVoces.map((l, i) => (
              <li key={l.id}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-primary">{l.nombre}</span>
                  <span className="cifra shrink-0 text-secondary">
                    {formatoNumero(l.n)}
                    <span className="ml-1 text-muted">{Math.round(l.pct)}%</span>
                  </span>
                </div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.span
                    className="block h-full rounded-full bg-gold-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.n * 100) / mayor}%` }}
                    transition={{
                      duration: 0.6,
                      delay: 0.05 + i * 0.03,
                      ease: EASE.salida,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
        {vacias.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setVerVacias((v) => !v)}
              aria-expanded={verVacias}
              className="text-xs text-link hover:underline"
            >
              {verVacias ? "Ocultar" : "y"} {vacias.length}{" "}
              {vacias.length === 1 ? "línea aún sin voces" : "líneas aún sin voces"}
            </button>
            {verVacias && (
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {vacias.map((l) => (
                  <li key={l.id}>· {l.nombre}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="etiqueta mt-6 mb-2">Lo que más se repite</p>
        {datos.relato ? (
          <figure className="rounded-sm bg-white/[.03] p-3">
            <blockquote className="flex gap-2 text-sm leading-snug text-primary italic">
              <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
              {datos.relato.cuerpo}
            </blockquote>
            <figcaption className="mt-2 text-[11px] leading-relaxed text-muted">
              {datos.relato.veces > 1 && (
                <>
                  <span className="cifra text-secondary">×{formatoNumero(datos.relato.veces)}</span>{" "}
                  ·{" "}
                </>
              )}
              entre {formatoNumero(datos.narrativas)} narrativas sintetizadas
              {datos.relato.municipios.length > 0 && (
                <> · {datos.relato.municipios.length} municipios</>
              )}
              {datos.relato.claves.length > 0 && (
                <>
                  {" "}
                  · coincide por:{" "}
                  <span className="text-secondary">{datos.relato.claves.join(", ")}</span>
                </>
              )}
            </figcaption>
          </figure>
        ) : (
          <p className="text-sm text-muted">
            Aún no hay síntesis para este eje en {nombreTerritorio}.
          </p>
        )}

        {/* Ficha del Plan */}
        <p className="etiqueta mt-6 mb-2">Ficha del Plan</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="flex items-center gap-1.5 text-muted">
            <Landmark className="size-3.5" /> Área responsable
          </dt>
          <dd className="text-secondary">{eje.area}</dd>
          <dt className="flex items-center gap-1.5 text-muted">
            <Gauge className="size-3.5" /> Indicadores
          </dt>
          <dd className="text-secondary">
            {eje.indicadores === null ? (
              <span className="rounded-full border border-dashed border-default px-2 py-0.5 text-warning">
                Batería pendiente
              </span>
            ) : (
              <>
                <span className="cifra text-primary">{eje.indicadores}</span> preliminares
              </>
            )}
          </dd>
        </dl>
      </div>

      {/* Pie fijo: filtrar no cierra el modal, para poder marcar varios ejes */}
      <div className="relative flex gap-2 border-t border-subtle bg-[rgba(8,23,51,.98)] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[rgba(8,23,51,.98)] to-transparent" />
        {filtrado ? (
          <>
            <button
              onClick={onCerrar}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-action-primary text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold"
            >
              {recien ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
              {recien ? "Filtro aplicado" : "Ver el tablero filtrado"}
            </button>
            <button
              onClick={onFiltrar}
              className="h-11 rounded-sm border border-default px-4 text-xs font-bold text-secondary hover:text-primary"
            >
              Quitar filtro
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              onFiltrar();
              setRecien(true);
            }}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-action-primary text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold transition-transform hover:-translate-y-px"
          >
            <Filter className="size-4" /> Filtrar el tablero por este eje
          </button>
        )}
      </div>
    </div>
  );
}

function Dato({
  valor,
  etiqueta,
  nota,
  destacado,
  alerta,
}: {
  valor: number;
  etiqueta: string;
  nota: string;
  destacado?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-sm border border-subtle bg-white/[.03] p-2.5">
      <p className="flex items-center gap-1.5">
        <CifraAnimada
          variante="display"
          valor={valor}
          className={`text-2xl font-extrabold ${destacado ? "text-accent" : "text-primary"}`}
        />
        {alerta && valor > 0 && <Siren className="size-3.5 text-danger" />}
      </p>
      <p className="text-[11px] text-secondary">{etiqueta}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted">{nota}</p>
    </div>
  );
}
