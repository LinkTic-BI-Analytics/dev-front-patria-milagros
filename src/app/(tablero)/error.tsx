"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, LogOut, RotateCcw, TriangleAlert } from "lucide-react";
import { salir } from "@/app/acceso/acciones";

// Un solo reintento automático por minuto: si la base tuvo un tropiezo, se recupera sola;
// si sigue caída, no se entra en un bucle de peticiones.
let ultimoAuto = 0;

/**
 * Pantalla de error del tablero. Next 16 entrega `retry` (vuelve a pedir los datos al servidor)
 * y `reset` (solo re-renderiza); si no llega ninguna, se recarga la página.
 */
export default function ErrorTablero({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const [reintentando, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const reintentar = () =>
    iniciar(() => {
      if (typeof retry === "function") retry();
      else if (typeof reset === "function") reset();
      else window.location.reload();
    });

  useEffect(() => {
    const ahora = Date.now();
    if (ahora - ultimoAuto < 60_000) return;
    ultimoAuto = ahora;
    const espera = setTimeout(reintentar, 1500);
    return () => clearTimeout(espera);
    // Solo al aparecer la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div role="alert" className="panel relative max-w-md overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        <Image
          src="/linea-grafica-patria/assets/escudo-colombia.png"
          alt="Escudo de Colombia"
          width={44}
          height={47}
          preload
          className="mx-auto"
        />
        <div className="tricolor mt-3 justify-center">
          <span />
          <span />
          <span />
        </div>

        <span className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-danger-bg text-danger">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="titulo-display mt-4 text-2xl font-extrabold">No pudimos mostrar el tablero</h1>
        <p className="mt-2 text-sm text-secondary">
          Hubo un problema al consultar la información. Sus filtros no se perdieron: intente de
          nuevo en unos segundos.
        </p>

        <button
          onClick={reintentar}
          disabled={reintentando}
          aria-busy={reintentando}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-action-primary px-5 text-sm font-extrabold tracking-[0.08em] text-action-primary-text uppercase shadow-glow-gold disabled:cursor-wait disabled:opacity-80"
        >
          {reintentando ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          {reintentando ? "Consultando" : "Reintentar"}
        </button>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-muted">
          <button onClick={() => window.location.reload()} className="hover:text-primary">
            Recargar la página
          </button>
          <form action={salir}>
            <button type="submit" className="inline-flex items-center gap-1 hover:text-primary">
              <LogOut className="size-3" /> Cerrar sesión
            </button>
          </form>
        </div>

        {error.digest && (
          <button
            onClick={() =>
              navigator.clipboard?.writeText(error.digest ?? "").then(() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1600);
              })
            }
            title="Copiar la referencia para soporte"
            className="cifra mx-auto mt-5 flex items-center gap-1.5 text-[11px] text-muted hover:text-secondary"
          >
            {copiado ? <Check className="size-3" /> : <Copy className="size-3" />}
            Ref. {error.digest}
          </button>
        )}
      </div>
    </div>
  );
}
