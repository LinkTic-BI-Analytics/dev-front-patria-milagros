"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Caja = { x: number; y: number };

/**
 * Pista (tooltip) que vive en `document.body`.
 *
 * El `title` del navegador tarda un segundo, no se lee en táctil y no formatea cifras; y una pista
 * dentro del panel se recortaría con el `overflow-hidden` del contenedor. Por eso va en un portal.
 *
 * Se usa como par: se esparce `disparador` en el elemento y se pinta `pista` al lado.
 */
export function usePista(contenido: React.ReactNode) {
  const id = useId();
  const [caja, setCaja] = useState<Caja | null>(null);

  // Al hacer scroll la pista quedaría flotando sobre nada: se cierra.
  useEffect(() => {
    if (!caja) return;
    const cerrar = () => setCaja(null);
    window.addEventListener("scroll", cerrar, true);
    return () => window.removeEventListener("scroll", cerrar, true);
  }, [caja]);

  const medir = (el: Element | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCaja({ x: r.left + r.width / 2, y: r.top });
  };

  const disparador = {
    "aria-describedby": caja && contenido ? id : undefined,
    onPointerEnter: (e: React.PointerEvent) => {
      // Solo el ratón: en táctil un toque ya ejecuta la acción y la pista estorbaría.
      if (e.pointerType === "mouse") medir(e.currentTarget);
    },
    onPointerLeave: () => setCaja(null),
    onFocus: (e: React.FocusEvent) => medir(e.currentTarget),
    onBlur: () => setCaja(null),
  };

  const pista =
    caja && contenido
      ? createPortal(
          <span
            id={id}
            role="tooltip"
            style={{
              left: Math.min(Math.max(caja.x, 96), window.innerWidth - 96),
              top: caja.y - 10,
            }}
            className="pointer-events-none fixed z-[70] max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-sm border border-default bg-surface-3 px-2.5 py-1.5 text-xs leading-snug text-primary shadow-[var(--shadow-deep)]"
          >
            {contenido}
          </span>,
          document.body,
        )
      : null;

  return { disparador, pista };
}
