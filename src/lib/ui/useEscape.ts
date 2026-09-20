"use client";

import { useEffect, useRef } from "react";

// Esc cierra SOLO la capa que está encima. Cada capa abierta (modal, popover, detalle…) se apila;
// un único listener en `window` atiende a la última. Sin esto, un Esc cerraba el modal de ejes y,
// de paso, sacaba del departamento que se estaba mirando.

type Capa = { atender: (e: KeyboardEvent) => void };
const pila: Capa[] = [];
let escuchando = false;

function alPresionar(e: KeyboardEvent) {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  pila.at(-1)?.atender(e);
}

/** Apila `atender` mientras `activo` sea verdadero. La última capa apilada es la que responde. */
export function useEscape(atender: (e: KeyboardEvent) => void, activo = true) {
  const ultimo = useRef(atender);
  useEffect(() => {
    ultimo.current = atender;
  });

  useEffect(() => {
    if (!activo) return;
    const capa: Capa = { atender: (e) => ultimo.current(e) };
    pila.push(capa);
    if (!escuchando) {
      window.addEventListener("keydown", alPresionar);
      escuchando = true;
    }
    return () => {
      const i = pila.indexOf(capa);
      if (i >= 0) pila.splice(i, 1);
      if (pila.length === 0 && escuchando) {
        window.removeEventListener("keydown", alPresionar);
        escuchando = false;
      }
    };
  }, [activo]);
}

/** ¿El evento viene de un campo de texto? Ahí Esc es del campo, no de la navegación. */
export const vieneDeCampo = (e: KeyboardEvent) => {
  const t = e.target;
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
  );
};
