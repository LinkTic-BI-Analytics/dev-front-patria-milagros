"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorTablero({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="panel max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-bg text-danger">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="titulo-display mt-4 text-2xl font-extrabold">No se pudo cargar el tablero</h1>
        <p className="mt-2 text-sm text-secondary">
          La conexión con la base de datos falló. Intente de nuevo en unos segundos.
        </p>
        {error.digest && <p className="cifra mt-2 text-xs text-muted">Ref. {error.digest}</p>}
        <button
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-action-primary px-5 text-sm font-extrabold tracking-[0.08em] text-action-primary-text uppercase shadow-glow-gold"
        >
          <RotateCcw className="size-4" /> Reintentar
        </button>
      </div>
    </div>
  );
}
