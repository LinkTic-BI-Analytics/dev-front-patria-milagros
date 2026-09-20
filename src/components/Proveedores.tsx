"use client";

import { MotionConfig } from "motion/react";

/**
 * Contexto de cliente para toda la aplicación. Solo `reducedMotion`: un `transition` por defecto
 * cambiaría los resortes implícitos (hover, píldoras con `layoutId`) en todo el tablero.
 */
export function Proveedores({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
