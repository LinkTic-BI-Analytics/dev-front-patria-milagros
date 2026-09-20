"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { RESORTE } from "@/lib/ui/movimiento";

export type Opcion<T extends string> = {
  valor: T;
  etiqueta: string;
  icono?: LucideIcon;
  /** Para cuando solo se ve el icono. Si falta, se usa la etiqueta. */
  titulo?: string;
};

/**
 * Grupo de botones excluyentes (ámbito, métrica, vista de la tabla).
 *
 * Es un `radiogroup`, no un `tablist`: no controla paneles, elige un valor. Con tabindex móvil,
 * así el Tab entra una vez al grupo y las flechas recorren las opciones.
 */
export function Segmentado<T extends string>({
  valor,
  opciones,
  onCambiar,
  etiqueta,
  layoutId,
  soloIcono = false,
  alto = "h-[30px]",
  className = "",
}: {
  valor: T;
  opciones: readonly Opcion<T>[];
  onCambiar: (v: T) => void;
  etiqueta: string;
  /** Debe ser único en la página: mueve la pastilla dorada entre opciones. */
  layoutId: string;
  soloIcono?: boolean;
  alto?: string;
  className?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);

  const alTeclear = (e: React.KeyboardEvent) => {
    const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const i = opciones.findIndex((o) => o.valor === valor);
    const siguiente = opciones[(i + paso + opciones.length) % opciones.length];
    onCambiar(siguiente.valor);
    // El foco viaja con la selección: si no, la siguiente flecha partiría del botón anterior.
    caja.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [(i + paso + opciones.length) % opciones.length]?.focus();
  };

  return (
    <div
      ref={caja}
      role="radiogroup"
      aria-label={etiqueta}
      onKeyDown={alTeclear}
      className={`vidrio flex rounded-md p-1 shadow-[var(--shadow-card)] ${className}`}
    >
      {opciones.map(({ valor: v, etiqueta: texto, icono: Icono, titulo }) => {
        const activo = v === valor;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={activo}
            aria-label={soloIcono ? (titulo ?? texto) : undefined}
            tabIndex={activo ? 0 : -1}
            onClick={() => onCambiar(v)}
            className={`foco-dentro relative flex items-center justify-center gap-1.5 rounded-sm text-xs font-bold tracking-[0.04em] uppercase transition-colors pointer-coarse:h-9 ${alto} ${
              soloIcono ? "w-9" : "px-3"
            } ${activo ? "text-action-primary-text" : "text-secondary hover:text-primary"}`}
          >
            {activo && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-sm bg-action-primary shadow-glow-gold"
                transition={RESORTE.pastilla}
              />
            )}
            {Icono && <Icono className="relative size-3.5" />}
            {!soloIcono && <span className="relative">{texto}</span>}
          </button>
        );
      })}
    </div>
  );
}
