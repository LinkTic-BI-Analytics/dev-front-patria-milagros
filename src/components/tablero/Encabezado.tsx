"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { FlaskConical, LogOut, RefreshCw } from "lucide-react";
import { salir } from "@/app/acceso/acciones";

export function Encabezado({
  proceso,
  actualizadoEn,
}: {
  proceso: string;
  actualizadoEn: string;
}) {
  const esPrueba = /prueba/i.test(proceso);
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
      className="relative z-30 flex h-16 shrink-0 items-center gap-4 border-b border-subtle bg-base/70 px-4 backdrop-blur-md sm:px-6"
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
        <h1 className="titulo-display truncate text-sm font-black tracking-tight uppercase sm:text-lg">
          Sistema de Planeación <span className="text-accent">Nacional</span>
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {esPrueba && (
          <span
            title={proceso}
            className="hidden items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1 text-xs font-semibold text-warning md:inline-flex"
          >
            <FlaskConical className="size-3.5" /> Escenario de prueba
          </span>
        )}
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
