"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Gauge,
  Landmark,
  Pause,
  Play,
  Quote,
  X,
} from "lucide-react";
import { formatoNumero } from "@/lib/datos/catalogos";
import type { PndResumen } from "@/lib/datos/tipos";

const suave = [0.22, 1, 0.36, 1] as const;
const GRADOS_POR_EJE = 60;

const reducirMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Los seis ejes articuladores del PND, en una órbita 3D.
 *
 * La profundidad es del navegador (perspectiva + `rotateY/translateZ`): el anillo gira solo,
 * se detiene al elegir un eje y lo trae al frente. Los datos del territorio se cruzan con cada
 * eje para que el diagrama no sea decorativo: dice cuántas participaciones le corresponden.
 */
export function ModalEjes({
  pnd,
  conteosEje,
  conteosLinea,
  nombreTerritorio,
  ejesFiltrados,
  onFiltrar,
  onCerrar,
}: {
  pnd: PndResumen;
  conteosEje: Map<string, number>;
  conteosLinea: Map<string, number>;
  nombreTerritorio: string;
  ejesFiltrados: string[];
  onFiltrar: (eje: string) => void;
  onCerrar: () => void;
}) {
  const ejes = pnd.ejes;
  const [elegido, setElegido] = useState<number | null>(null);
  const [girando, setGirando] = useState(!reducirMovimiento());
  const rotacion = useMotionValue(0);
  const panel = useRef<HTMLDivElement>(null);

  const total = [...conteosEje.values()].reduce((a, b) => a + b, 0);

  useAnimationFrame((_, delta) => {
    if (!girando) return;
    rotacion.set(rotacion.get() - delta * 0.009); // ~9°/s: una vuelta cada 40 s
  });

  const elegir = (indice: number | null) => {
    setElegido(indice);
    if (indice === null) return;
    setGirando(false);
    const actual = rotacion.get();
    const objetivo = -indice * GRADOS_POR_EJE;
    // Se gira por el camino más corto, sin dar vueltas de más.
    const vueltas = Math.round((actual - objetivo) / 360);
    animate(rotacion, objetivo + vueltas * 360, {
      type: "spring",
      stiffness: 55,
      damping: 16,
      restDelta: 0.01,
    });
  };

  // Teclado: Esc cierra, flechas recorren los ejes.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCerrar();
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const paso = e.key === "ArrowRight" ? 1 : -1;
      elegir(((elegido ?? 0) + paso + ejes.length) % ejes.length);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  });

  useEffect(() => {
    panel.current?.focus();
  }, []);

  const eje = elegido === null ? null : ejes[elegido];

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(3,8,20,.82)] p-3 backdrop-blur-md sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      role="dialog"
      aria-modal="true"
      aria-label="Ejes articuladores del Plan Nacional de Desarrollo"
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.45, ease: suave }}
        className="panel relative flex h-[min(92vh,52rem)] w-[min(78rem,96vw)] flex-col overflow-hidden outline-none"
      >
        {/* Cielo de fondo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,49,137,.45),transparent_62%)]" />
        <div className="estrellas pointer-events-none absolute inset-0 opacity-70" />

        {/* Encabezado */}
        <header className="relative flex items-start justify-between gap-4 border-b border-subtle px-5 py-4 sm:px-7">
          <div>
            <div className="tricolor mb-2">
              <span />
              <span />
              <span />
            </div>
            <p className="etiqueta text-accent">Plan Nacional de Desarrollo 2026–2030</p>
            <h2 className="titulo-display mt-1 text-2xl font-black sm:text-3xl">
              Ejes articuladores
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGirando((g) => !g)}
              className="vidrio hidden h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-secondary transition-colors hover:text-primary sm:flex"
              aria-pressed={girando}
            >
              {girando ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {girando ? "Pausar giro" : "Girar"}
            </button>
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
        <div className="relative grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[1fr_26rem] lg:overflow-hidden">
          {/* Órbita */}
          <div
            className="relative grid min-h-[20rem] place-items-center overflow-hidden rounded-md [perspective:1400px] sm:min-h-[22rem]"
            onMouseEnter={() => setGirando(false)}
          >
            {/* Total del territorio, sin estorbar la órbita */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: suave }}
              className="pointer-events-none absolute top-0 left-0 hidden rounded-md border border-subtle bg-[rgba(6,20,42,.6)] px-3 py-2 sm:block"
            >
              <p className="cifra text-xl font-bold text-accent">{formatoNumero(total)}</p>
              <p className="text-[11px] leading-tight text-secondary">
                participaciones · {nombreTerritorio}
              </p>
            </motion.div>

            <motion.div
              className="relative size-0 [transform-style:preserve-3d]"
              style={{ rotateY: rotacion }}
            >
              {ejes.map((e, i) => (
                <TarjetaEje
                  key={e.id}
                  eje={e}
                  indice={i}
                  rotacion={rotacion}
                  activo={elegido === i}
                  filtrado={ejesFiltrados.includes(e.id)}
                  total={conteosEje.get(e.id) ?? 0}
                  maximo={Math.max(1, ...conteosEje.values())}
                  onElegir={() => elegir(i)}
                />
              ))}
            </motion.div>

            <p className="absolute bottom-0 flex items-center gap-2 text-[11px] text-muted">
              <ChevronLeft className="size-3.5" /> Clic en un eje para abrirlo · flechas para
              recorrerlos <ChevronRight className="size-3.5" />
            </p>
          </div>

          {/* Detalle */}
          <div className="scroll-fino relative lg:overflow-y-auto lg:pr-1">
            <AnimatePresence mode="wait">
              {eje ? (
                <motion.article
                  key={eje.id}
                  initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -16, filter: "blur(6px)" }}
                  transition={{ duration: 0.35, ease: suave }}
                  className="rounded-md border border-subtle bg-[rgba(10,26,58,.55)] p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="cifra grid size-10 place-items-center rounded-full bg-action-primary text-lg font-bold text-action-primary-text shadow-glow-gold">
                      {eje.numero}
                    </span>
                    <h3 className="titulo-display text-xl leading-tight font-extrabold">
                      {eje.nombre}
                    </h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-secondary">{eje.vision}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,200,0,.12)] px-2.5 py-1 text-accent">
                      <Quote className="size-3" />
                      <span className="cifra">{formatoNumero(conteosEje.get(eje.id) ?? 0)}</span>
                      participaciones
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-subtle px-2.5 py-1 text-secondary">
                      <Gauge className="size-3" />
                      {eje.indicadores === null ? (
                        "Batería de indicadores pendiente"
                      ) : (
                        <>
                          <span className="cifra">{eje.indicadores}</span> indicadores preliminares
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-subtle px-2.5 py-1 text-secondary">
                      <Landmark className="size-3" /> {eje.area}
                    </span>
                  </div>

                  <p className="etiqueta mt-5 mb-2">Líneas temáticas</p>
                  <ul className="space-y-1.5">
                    {eje.lineas.map((l, i) => {
                      const n = conteosLinea.get(l.id) ?? 0;
                      return (
                        <motion.li
                          key={l.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 + i * 0.025 }}
                          className="flex items-start justify-between gap-3 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
                        >
                          <span className="text-secondary">{l.nombre}</span>
                          {n > 0 && (
                            <span className="cifra shrink-0 rounded-full bg-white/8 px-2 text-[11px] text-primary">
                              {formatoNumero(n)}
                            </span>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => onFiltrar(eje.id)}
                    className="mt-5 flex h-11 w-full items-center justify-center gap-2 lg:sticky lg:bottom-0 rounded-sm bg-action-primary text-xs font-extrabold tracking-[0.08em] text-action-primary-text uppercase shadow-glow-gold transition-transform hover:-translate-y-px"
                  >
                    <Filter className="size-4" />
                    {ejesFiltrados.includes(eje.id)
                      ? "Quitar el filtro de este eje"
                      : "Filtrar el mapa por este eje"}
                  </button>
                </motion.article>
              ) : (
                <motion.div
                  key="vacio"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid h-full place-items-center rounded-md border border-dashed border-default p-6 text-center"
                >
                  <div>
                    <p className="titulo-display text-lg font-extrabold">Elija un eje</p>
                    <p className="mt-2 text-sm text-secondary">
                      Cada eje agrupa las líneas temáticas del Plan. Aquí verá su visión, sus líneas
                      y cuántas participaciones de {nombreTerritorio} le corresponden.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="relative border-t border-subtle px-5 py-2.5 text-[11px] text-muted sm:px-7">
          Fuente: {pnd.fuente}. Las participaciones se relacionan con cada eje por palabras clave
          del relato, sin inteligencia artificial.
        </footer>
      </motion.div>
    </motion.div>
  );
}

function TarjetaEje({
  eje,
  indice,
  rotacion,
  activo,
  filtrado,
  total,
  maximo,
  onElegir,
}: {
  eje: PndResumen["ejes"][number];
  indice: number;
  rotacion: MotionValue<number>;
  activo: boolean;
  filtrado: boolean;
  total: number;
  maximo: number;
  onElegir: () => void;
}) {
  // Qué tan de frente está la tarjeta (1 = al frente): da brillo y profundidad sin re-renderizar.
  const frente = useTransform(rotacion, (r) => {
    const angulo = (((r + indice * GRADOS_POR_EJE) % 360) + 360) % 360;
    return Math.cos((angulo * Math.PI) / 180) * 0.5 + 0.5;
  });
  const filtro = useTransform(frente, [0, 1], [0.55, 1.12]);
  const brillo = useTransform(filtro, (b) => `brightness(${b})`);
  const opacidad = useTransform(frente, [0, 0.4, 1], [0.35, 0.7, 1]);

  return (
    // La posición en la órbita va aquí, para que el hover de la tarjeta no la pise.
    <motion.div
      style={{
        transform: `rotateY(${indice * GRADOS_POR_EJE}deg) translateZ(clamp(7.5rem, 24vw, 17rem))`,
        filter: brillo,
        opacity: opacidad,
      }}
      className="absolute top-1/2 left-1/2 -mt-24 -ml-20 h-48 w-40 [backface-visibility:hidden] sm:-mt-[7.5rem] sm:-ml-[6.5rem] sm:h-60 sm:w-52"
    >
    <motion.button
      onClick={onElegir}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`flex size-full flex-col justify-between p-3.5 text-left sm:p-5 ${
        activo
          ? "border-gold-500 bg-[linear-gradient(180deg,rgba(255,200,0,.16),rgba(8,23,51,.96))]"
          : "border-default bg-[rgba(10,26,58,.82)]"
      } rounded-lg border-2 shadow-[var(--shadow-deep)] backdrop-blur-sm transition-colors`}
      aria-label={`Eje ${eje.numero}: ${eje.nombre}`}
    >
      <span
        className={`cifra grid size-7 place-items-center rounded-full text-xs font-bold sm:size-9 sm:text-sm ${
          activo ? "bg-action-primary text-action-primary-text" : "bg-white/10 text-accent"
        }`}
      >
        {eje.numero}
      </span>
      <span className="titulo-display text-[0.8rem] leading-tight font-extrabold text-primary sm:text-[0.95rem]">
        {eje.nombre}
      </span>
      <span>
        <span className="mb-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gold-500"
            style={{ width: `${(total * 100) / maximo}%` }}
          />
        </span>
        <span className="text-[11px] text-secondary">
          <span className="cifra text-primary">{formatoNumero(total)}</span> participaciones
          {filtrado && <span className="ml-1 text-accent">· filtrando</span>}
        </span>
      </span>
    </motion.button>
    </motion.div>
  );
}
