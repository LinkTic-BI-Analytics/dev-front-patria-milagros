"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, PointerEvent as PointerEventReact } from "react";
import {
  animate,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { EASE, RESORTE } from "@/lib/ui/movimiento";

/** Debe coincidir con `[perspective:…]` de la escena: corrige cuánto «pesa» un píxel al arrastrar. */
const PERSPECTIVA = 1400;
const RADIO_INICIAL = 260;

// Giro automático, en grados por segundo: una vuelta cada 40 s, y un tercio con el cursor encima.
const CRUCERO = 9;
const LENTO = 3;
const RAMPA = 0.9;
/** Tras la última interacción la órbita espera esto antes de volver a girar sola. */
const REANUDAR_MS = 2500;

// Rueda y trackpad: pasos discretos. La inercia de un trackpad emite eventos cerca de 1 s; el
// bloqueo descarta esa cola para que un gesto no recorra media órbita.
const UMBRAL_RUEDA = 50;
const TOPE_POR_EVENTO = 80;
const BLOQUEO_RUEDA_MS = 320;
const SILENCIO_RUEDA_MS = 180;

/** Por debajo de esto un pan es un clic con pulso, no un arrastre. */
const UMBRAL_ARRASTRE_PX = 6;
/** Cuánto «vuela» la órbita al soltarla, en segundos de su velocidad. */
const INERCIA = 0.28;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const radioPara = (ancho: number) =>
  ancho < 640 ? Math.max(150, ancho * 0.44) : acotar(ancho * 0.34, 150, 300);

export type Sentido = 1 | -1;

/**
 * El estado y los gestos de la órbita de ejes: rotación, eje abierto, eje al frente, giro
 * automático, rueda, arrastre y radio medido.
 *
 * Todo lo que mueve el anillo pasa por `girarA` (sin abrir) o `irA` (abre el eje), para que
 * teclado, flechas, puntos, rueda y swipe compartan camino más corto, resorte y sentido.
 */
export function useOrbita(
  cantidad: number,
  /** Con qué abre: el eje ya elegido (si el tablero está filtrado) y cuál queda al frente. */
  inicial: { elegido: number | null; alFrente: number } = { elegido: null, alFrente: 0 },
) {
  const grados = 360 / cantidad;
  const reducido = useReducedMotion() ?? false;

  // El primer cuadro ya muestra lo importante: sin animación previa hacia el eje inicial.
  const rotacion = useMotionValue(-inicial.alFrente * grados);
  const velocidad = useMotionValue(0);
  // El radio vive en un MotionValue: se publica como `--radio` sin re-renderizar y los gestos lo
  // leen en píxeles.
  const radio = useMotionValue(RADIO_INICIAL);
  const radioCss = useTransform(radio, (r) => `${r}px`);

  const [elegido, setElegido] = useState<number | null>(inicial.elegido);
  const [alFrente, setAlFrente] = useState(inicial.alFrente);
  const [sentido, setSentido] = useState<Sentido>(1);

  // ── Giro automático ──
  const [pausaManual, setPausaManual] = useState(false);
  const [sobreTarjeta, setSobreTarjeta] = useState(false);
  const [sobreEscena, setSobreEscena] = useState(false);
  const [focoDentro, setFocoDentro] = useState(false);
  const [interactuando, setInteractuando] = useState(false);
  const reanudar = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** `sostenida`: la interacción sigue (un arrastre); la cuenta para reanudar empieza al soltar. */
  const marcarInteraccion = useCallback((sostenida = false) => {
    setInteractuando(true);
    clearTimeout(reanudar.current);
    if (!sostenida) reanudar.current = setTimeout(() => setInteractuando(false), REANUDAR_MS);
  }, []);
  useEffect(() => () => clearTimeout(reanudar.current), []);

  const giroActivo =
    !pausaManual && !reducido && elegido === null && !sobreTarjeta && !focoDentro && !interactuando;
  const crucero = giroActivo ? (sobreEscena ? LENTO : CRUCERO) : 0;

  // La velocidad se anima, no se conmuta: el giro arranca y frena con rampa.
  useEffect(() => {
    const control = animate(velocidad, crucero, { duration: RAMPA, ease: EASE.salida });
    return () => control.stop();
  }, [crucero, velocidad]);

  useAnimationFrame((_, delta) => {
    const v = velocidad.get();
    // Mientras un resorte lleva el anillo a un eje, el giro no suma: pelearían por el mismo valor.
    if (v === 0 || rotacion.isAnimating()) return;
    // El delta se acota: al volver de otra pestaña llega uno enorme y el anillo saltaría.
    rotacion.set(rotacion.get() - (Math.min(delta, 50) / 1000) * v);
  });

  // ── Eje al frente ──
  const ultimoAlFrente = useRef(inicial.alFrente);
  useMotionValueEvent(rotacion, "change", (r) => {
    const i = mod(Math.round(-r / grados), cantidad);
    if (i === ultimoAlFrente.current) return;
    ultimoAlFrente.current = i;
    setAlFrente(i);
  });

  // ── Movimiento ──
  /** Lleva el eje `i` al frente por el camino más corto, sin abrirlo. */
  const girarA = useCallback(
    (i: number, velocidadInicial = rotacion.getVelocity()) => {
      const actual = rotacion.get();
      const objetivo = -i * grados;
      const destino = objetivo + Math.round((actual - objetivo) / 360) * 360;
      // Rotación decreciente = avanza al eje siguiente: el detalle entra por ese lado.
      if (destino !== actual) setSentido(destino < actual ? 1 : -1);
      animate(
        rotacion,
        destino,
        reducido
          ? { duration: 0 }
          : { ...RESORTE.orbita, velocity: velocidadInicial, restDelta: 0.05 },
      );
    },
    [grados, reducido, rotacion],
  );

  /** Abre el eje `i` y lo trae al frente. `velocidadInicial` en °/s: da continuidad al swipe. */
  const irA = useCallback(
    (i: number, velocidadInicial?: number) => {
      girarA(i, velocidadInicial);
      setElegido(i);
      marcarInteraccion();
    },
    [girarA, marcarInteraccion],
  );

  // Parte del eje abierto y, si no hay, del que está al frente: con el giro en marcha, «siguiente»
  // es el vecino de lo que se ve, no el eje 2.
  const paso = useCallback(
    (dir: Sentido) => irA(mod((elegido ?? alFrente) + dir, cantidad)),
    [alFrente, cantidad, elegido, irA],
  );

  const verLosSeis = useCallback(() => {
    setElegido(null);
    marcarInteraccion();
  }, [marcarInteraccion]);

  // ── Radio medido + rueda: los dos cuelgan de la columna de la órbita ──
  // Ref de callback con estado: devolver un `useRef` haría que el linter trate todo el objeto
  // del hook como un ref y prohíba leerlo al renderizar.
  const [columnaEl, columna] = useState<HTMLDivElement | null>(null);
  const ultimoPaso = useRef(paso);
  useEffect(() => {
    ultimoPaso.current = paso;
  });

  useEffect(() => {
    const el = columnaEl;
    if (!el) return;

    const observador = new ResizeObserver(([entrada]) => {
      radio.set(Math.round(radioPara(entrada.contentRect.width)));
    });
    observador.observe(el);

    // `onWheel` de React es pasivo y no deja hacer `preventDefault`, que es lo que evita el gesto
    // «atrás» de macOS. Va solo aquí: sobre el detalle, la rueda es scroll.
    const escritorio = window.matchMedia("(min-width: 64rem)");
    let acumulado = 0;
    let ultimoEvento = 0;
    let bloqueadoHasta = 0;
    const alRodar = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pellizco de zoom del trackpad
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      // Por debajo de `lg` el cuerpo del modal hace scroll vertical: solo se captura lo horizontal.
      if (!horizontal && !escritorio.matches) return;
      e.preventDefault();

      if (e.timeStamp < bloqueadoHasta) return;
      if (e.timeStamp - ultimoEvento > SILENCIO_RUEDA_MS) acumulado = 0;
      ultimoEvento = e.timeStamp;

      // Ratón de muescas en Firefox (líneas) o por páginas: se lleva a píxeles.
      const unidad = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      acumulado += acotar(d * unidad, -TOPE_POR_EVENTO, TOPE_POR_EVENTO);
      if (Math.abs(acumulado) < UMBRAL_RUEDA) return;

      ultimoPaso.current(acumulado > 0 ? 1 : -1);
      acumulado = 0;
      bloqueadoHasta = e.timeStamp + BLOQUEO_RUEDA_MS;
    };
    el.addEventListener("wheel", alRodar, { passive: false });

    return () => {
      observador.disconnect();
      el.removeEventListener("wheel", alRodar);
    };
  }, [radio, columnaEl]);

  // ── Arrastre y swipe ──
  // Tras un pan, el `pointerup` dispara `click` en la tarjeta que quede debajo: esta guarda lo
  // descarta. Se limpia en el siguiente `pointerdown`, no al soltar, porque el clic llega después.
  const arrastro = useRef(false);

  const gradosPorPx = () => {
    const r = radio.get();
    // La tarjeta del frente está a `r` de profundidad y la perspectiva la agranda: un píxel de
    // pantalla recorre menos arco del que recorrería sin ella.
    return 180 / (Math.PI * r * (PERSPECTIVA / (PERSPECTIVA - r)));
  };

  const gestos = {
    onPointerDownCapture: () => {
      arrastro.current = false;
      // Agarrar la órbita la detiene en seco; una rampa aquí se sentiría como hielo.
      velocidad.jump(0);
      marcarInteraccion();
    },
    onPanStart: () => {
      rotacion.stop();
      marcarInteraccion(true);
    },
    onPan: (_: PointerEvent, info: PanInfo) => {
      if (Math.abs(info.offset.x) > UMBRAL_ARRASTRE_PX) arrastro.current = true;
      if (!arrastro.current) return;
      rotacion.set(rotacion.get() + info.delta.x * gradosPorPx());
    },
    onPanEnd: (_: PointerEvent, info: PanInfo) => {
      if (!arrastro.current) {
        // Fue un clic con pulso: el anillo solo vuelve a su sitio (pudo cortar un resorte en vuelo).
        girarA(elegido ?? ultimoAlFrente.current);
        marcarInteraccion();
        return;
      }
      const v = info.velocity.x * gradosPorPx();
      const actual = rotacion.get();
      const base = Math.round(-actual / grados);
      // Como mucho dos ejes por gesto: un swipe fuerte no debe dar la vuelta entera.
      const k = acotar(Math.round(-(actual + v * INERCIA) / grados), base - 2, base + 2);
      irA(mod(k, cantidad), v);
    },
  };

  const escena = {
    ...gestos,
    onPointerEnter: (e: PointerEventReact) => e.pointerType === "mouse" && setSobreEscena(true),
    onPointerLeave: (e: PointerEventReact) => e.pointerType === "mouse" && setSobreEscena(false),
  };

  // El foco de teclado dentro de la órbita la detiene: nadie acierta a un blanco que se mueve ni
  // sigue una etiqueta («Eje siguiente: …») que cambia sola.
  const foco = {
    onFocus: (e: FocusEvent<HTMLElement>) =>
      e.target.matches(":focus-visible") && setFocoDentro(true),
    onBlur: (e: FocusEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setFocoDentro(false);
      marcarInteraccion();
    },
  };

  /** Props de cada tarjeta. Solo el ratón cuenta como «encima»: un toque no deja hover que limpiar. */
  const tarjeta = (i: number) => ({
    onElegir: () => {
      if (!arrastro.current) irA(i);
    },
    onPointerEnter: (e: PointerEventReact) => e.pointerType === "mouse" && setSobreTarjeta(true),
    onPointerLeave: (e: PointerEventReact) => {
      if (e.pointerType !== "mouse") return;
      setSobreTarjeta(false);
      marcarInteraccion();
    },
  });

  return {
    grados,
    rotacion,
    radioCss,
    elegido,
    alFrente,
    sentido,
    reducido,
    giroActivo,
    pausaManual,
    alternarPausa: () => setPausaManual((p) => !p),
    girarA,
    irA,
    paso,
    verLosSeis,
    columna,
    escena,
    foco,
    tarjeta,
  };
}

export type Orbita = ReturnType<typeof useOrbita>;
