"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";

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

/** Número que cuenta desde su valor anterior hasta el nuevo. */
export function CifraAnimada({
  valor,
  decimales = 0,
  sufijo = "",
  className,
}: {
  valor: number;
  decimales?: number;
  sufijo?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const actual = useRef(0);

  useEffect(() => {
    const control = animate(actual.current, valor, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        actual.current = v;
        if (ref.current) ref.current.textContent = formato(decimales).format(v) + sufijo;
      },
    });
    return () => control.stop();
  }, [valor, decimales, sufijo]);

  return (
    <span ref={ref} className={`cifra ${className ?? ""}`}>
      {formato(decimales).format(0) + sufijo}
    </span>
  );
}
