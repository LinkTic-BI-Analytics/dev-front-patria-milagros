"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { LogOut, Orbit, RefreshCw } from "lucide-react";
import { salir } from "@/app/acceso/acciones";

export function Encabezado({
  proceso,
  actualizadoEn,
  hayPnd,
  ejesFiltrados,
  onEjes,
}: {
  proceso: string;
  actualizadoEn: string;
  hayPnd: boolean;
  ejesFiltrados: number;
  onEjes: () => void;
}) {
  const hora = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(actualizadoEn));

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-subtle bg-base/70 px-4 backdrop-blur-md sm:px-6"
    >
      <Image
        src="/linea-grafica-patria/assets/escudo-colombia.png"
        alt="Escudo de Colombia"
        width={34}
        height={36}
        priority
      />
      <div className="min-w-0">
        <div className="tricolor mb-1">
          <span />
          <span />
          <span />
        </div>
        <h1 className="titulo-display truncate text-sm font-black tracking-tight uppercase sm:text-[1.05rem]">
          Sistema de <span className="text-accent">Escucha</span> y Planeación Nacional
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {hayPnd && (
          <button
            onClick={onEjes}
            className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-sm border border-gold-600/60 bg-[rgba(255,200,0,.08)] px-3 text-xs font-bold tracking-[0.06em] text-accent uppercase transition-colors hover:bg-[rgba(255,200,0,.16)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Orbit className="relative size-4" />
            <span className="relative hidden sm:inline">Ejes articuladores</span>
            <span className="relative sm:hidden">Ejes</span>
            {ejesFiltrados > 0 && (
              <span className="cifra relative grid size-5 place-items-center rounded-full bg-action-primary text-[10px] text-action-primary-text">
                {ejesFiltrados}
              </span>
            )}
          </button>
        )}
        <span
          title={`Proceso: ${proceso}`}
          className="hidden items-center gap-2 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success md:inline-flex"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Datos en vivo
        </span>
        <span className="hidden items-center gap-1.5 text-xs text-muted lg:inline-flex">
          <RefreshCw className="size-3.5" /> Corte {hora}
        </span>
        <form action={salir}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-default px-3 text-xs font-bold tracking-[0.08em] text-secondary uppercase transition-colors hover:border-gold-600 hover:text-accent"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>
    </motion.header>
  );
}
