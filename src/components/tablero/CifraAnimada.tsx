"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { EASE, reducirMovimiento } from "@/lib/ui/movimiento";

const formatos = new Map<number, Intl.NumberFormat>();
const formato = (decimales: number) => {
  if (!formatos.has(decimales))
    formatos.set(
      decimales,
      new Intl.NumberFormat("es-CO", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }),
    );
  return formatos.get(decimales)!;
};

/**
 * Número que cuenta desde su valor anterior hasta el nuevo.
 *
 * `variante="display"` es para cifras grandes: en la monoespaciada la coma decimal ocupa un
 * carácter entero y «64,8 %» se leía «64 , 8 %». La de display conserva cifras tabulares.
 */
export function CifraAnimada({
  valor,
  decimales = 0,
  sufijo = "",
  variante = "mono",
  className,
}: {
  valor: number;
  decimales?: number;
  sufijo?: string;
  variante?: "mono" | "display";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const actual = useRef(0);

  useEffect(() => {
    const pintar = (v: number) => {
      actual.current = v;
      if (ref.current) ref.current.textContent = formato(decimales).format(v) + sufijo;
    };
    // `MotionConfig` no alcanza a `animate()` imperativo: con movimiento reducido se pinta directo.
    if (reducirMovimiento()) return pintar(valor);
    // La duración acompaña al salto: un cambio pequeño no merece un conteo de más de un segundo.
    const salto = Math.abs(valor - actual.current);
    const control = animate(actual.current, valor, {
      duration: salto < 5 ? 0.35 : 1.1,
      ease: EASE.salida,
      onUpdate: pintar,
    });
    return () => control.stop();
  }, [valor, decimales, sufijo]);

  return (
    <span ref={ref} className={`${variante === "display" ? "cifra-display" : "cifra"} ${className ?? ""}`}>
      {formato(decimales).format(0) + sufijo}
    </span>
  );
}
