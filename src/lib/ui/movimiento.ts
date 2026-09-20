// El sistema de movimiento del tablero: curvas, duraciones y resortes con nombre.
// Todo lo que se anima sale de aquí, para que la interfaz se mueva como una sola pieza.

/** Curvas Bézier. `salida` es la de la casa: arranca rápido y se posa con suavidad. */
export const EASE = {
  salida: [0.22, 1, 0.36, 1],
  entradaSalida: [0.65, 0, 0.35, 1],
  estandar: [0.4, 0, 0.2, 1],
} as const;

/** Duraciones en segundos, de la respuesta a un toque a la entrada de una escena. */
export const DUR = { instante: 0.12, rapida: 0.2, base: 0.32, lenta: 0.5, escena: 0.9 } as const;

export const RESORTE = {
  /** Píldoras que se deslizan entre opciones (`layoutId`). */
  pastilla: { type: "spring", stiffness: 420, damping: 34 },
  /** El anillo de ejes al encajar en una tarjeta. */
  orbita: { type: "spring", stiffness: 120, damping: 22 },
  /** El tooltip del mapa siguiendo al cursor. */
  tooltip: { stiffness: 600, damping: 45, mass: 0.5 },
} as const;

/**
 * ¿La persona pidió menos movimiento? `<MotionConfig reducedMotion="user">` ya lo respeta en los
 * componentes de motion; esto es para lo que queda fuera: Mapbox, `animate()` imperativo,
 * `requestAnimationFrame` y `scrollIntoView`.
 */
export const reducirMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
