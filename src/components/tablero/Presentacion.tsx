"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { EASE } from "@/lib/ui/movimiento";
import { useEscape } from "@/lib/ui/useEscape";

export type PasoPresentacion = {
  titulo: string;
  nota: string;
  /** Deja el tablero como debe verse en este paso. */
  aplicar: () => void;
};

/**
 * Modo presentación: recorre el tablero en pasos, para mostrarlo en una sala.
 *
 * Avanza a mano —nunca por temporizador—: en una reunión el ritmo lo pone quien habla, y una
 * diapositiva que se va sola obliga a correr detrás de ella.
 */
export function Presentacion({
  pasos,
  onSalir,
}: {
  pasos: PasoPresentacion[];
  onSalir: () => void;
}) {
  const [i, setI] = useState(0);
  useEscape(onSalir);

  const ir = (n: number) => {
    const destino = Math.max(0, Math.min(n, pasos.length - 1));
    setI(destino);
    pasos[destino].aplicar();
  };

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const activo = document.activeElement;
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setI((actual) => {
          const destino = Math.min(actual + 1, pasos.length - 1);
          pasos[destino].aplicar();
          return destino;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setI((actual) => {
          const destino = Math.max(actual - 1, 0);
          pasos[destino].aplicar();
          return destino;
        });
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [pasos]);

  const paso = pasos[i];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.35, ease: EASE.salida }}
      role="region"
      aria-label="Modo presentación"
      className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4"
    >
      <div className="vidrio mx-auto flex max-w-4xl items-center gap-3 rounded-lg p-3 shadow-[var(--shadow-deep)] sm:gap-4 sm:p-4">
        <span className="cifra hidden shrink-0 text-xs text-muted sm:block">
          {i + 1} / {pasos.length}
        </span>
        <div className="min-w-0 flex-1">
          {/* Con clave y sin salida: el texto se reemplaza, no se encadena. */}
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE.salida }}
          >
            <p className="etiqueta text-accent">{paso.titulo}</p>
            <p className="mt-0.5 text-sm leading-snug text-primary sm:text-[1rem]">{paso.nota}</p>
          </motion.div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => ir(i - 1)}
            disabled={i === 0}
            aria-label="Paso anterior"
            className="grid size-10 place-items-center rounded-sm border border-control text-secondary transition-colors hover:text-primary disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          {i < pasos.length - 1 ? (
            <button
              onClick={() => ir(i + 1)}
              className="flex h-10 items-center gap-1.5 rounded-sm bg-action-primary px-4 text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold"
            >
              Siguiente <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={onSalir}
              className="flex h-10 items-center gap-1.5 rounded-sm bg-action-primary px-4 text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold"
            >
              Terminar
            </button>
          )}
          <button
            onClick={onSalir}
            aria-label="Salir del modo presentación"
            className="grid size-10 place-items-center rounded-sm border border-control text-secondary transition-colors hover:text-primary"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted">
        Espacio o flechas para avanzar · Esc para salir
      </p>
    </motion.div>
  );
}
