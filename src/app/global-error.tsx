"use client";

import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

// `global-error` reemplaza el <html> entero: las fuentes del layout no llegan hasta aquí.
const montserrat = Montserrat({ variable: "--fuente-montserrat", subsets: ["latin"], weight: ["800", "900"] });
const inter = Inter({ variable: "--fuente-inter", subsets: ["latin"] });

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" data-theme="dark" className={`${montserrat.variable} ${inter.variable} h-full`}>
      <body className="grid min-h-full place-items-center p-6 text-center">
        <div className="max-w-md">
          <div className="tricolor justify-center">
            <span />
            <span />
            <span />
          </div>
          <h1 className="titulo-display mt-3 text-2xl font-black uppercase">
            El sistema no pudo arrancar
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Ocurrió un fallo antes de cargar el tablero. Intente de nuevo; si continúa, informe el
            código a la mesa de servicio.
          </p>
          {error.digest && (
            <p className="cifra mt-2 text-xs text-muted">Código: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="mt-5 h-11 rounded-sm bg-action-primary px-5 text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
