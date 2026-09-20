"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { LogOut, Orbit, RefreshCw } from "lucide-react";
import { salir } from "@/app/acceso/acciones";
import { EASE } from "@/lib/ui/movimiento";

// Reloj de medio minuto para el «hace X min». En el servidor no hay «ahora»: se muestra la hora
// del corte y el tiempo relativo aparece al hidratar, sin desajuste.
const PASO_RELOJ_MS = 30_000;
const suscribirReloj = (avisar: () => void) => {
  const reloj = setInterval(avisar, PASO_RELOJ_MS);
  return () => clearInterval(reloj);
};
const leerReloj = () => Math.floor(Date.now() / PASO_RELOJ_MS);
const sinReloj = () => null;

function haceCuanto(desde: string, tic: number) {
  const minutos = Math.max(0, Math.round((tic * PASO_RELOJ_MS - new Date(desde).getTime()) / 60_000));
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h`;
}

export function Encabezado({
  proceso,
  actualizadoEn,
  hayPnd,
  ejesFiltrados,
  onEjes,
  onPrecargarEjes,
  actualizando,
  falloActualizar,
  onActualizar,
}: {
  proceso: string;
  actualizadoEn: string;
  hayPnd: boolean;
  ejesFiltrados: number;
  onEjes: () => void;
  /** Se llama al acercarse al botón, para que el modal abra sin espera. */
  onPrecargarEjes?: () => void;
  actualizando: boolean;
  falloActualizar: boolean;
  onActualizar: () => void;
}) {
  const tic = useSyncExternalStore(suscribirReloj, leerReloj, sinReloj);
  // Salir se confirma en el sitio: un clic de más en «Salir» no debería tirar la sesión.
  const [confirmaSalida, setConfirmaSalida] = useState(false);
  const relojSalida = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(relojSalida.current), []);
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
      transition={{ duration: 0.7, ease: EASE.salida }}
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-subtle bg-base/70 px-4 backdrop-blur-md sm:px-6"
    >
      <Image
        src="/linea-grafica-patria/assets/escudo-colombia.png"
        alt="Escudo de Colombia"
        width={34}
        height={36}
        preload
      />
      <div className="min-w-0">
        <div className="tricolor mb-1">
          <span />
          <span />
          <span />
        </div>
        {/* Sin `truncate`: por debajo de `xl` el título se parte en dos líneas antes que cortarse. */}
        <h1 className="titulo-display text-[11px] leading-[1.1] font-black tracking-tight uppercase sm:text-[13px] xl:text-[1.05rem]">
          Sistema de <span className="text-accent">Escucha</span> y Planeación Nacional
        </h1>
        <p className="hidden truncate text-[11px] text-muted xl:block">{proceso}</p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {hayPnd && (
          <button
            onClick={onEjes}
            aria-haspopup="dialog"
            onPointerEnter={onPrecargarEjes}
            onFocus={onPrecargarEjes}
            className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-sm border border-gold-600/60 bg-[rgba(255,200,0,.08)] px-3 text-xs font-bold tracking-[0.06em] text-accent uppercase transition-colors hover:bg-[rgba(255,200,0,.16)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Orbit className="relative size-4" />
            <span className="relative hidden sm:inline">Ejes articuladores</span>
            <span className="relative sm:hidden">Ejes</span>
            {ejesFiltrados > 0 && (
              <span className="cifra relative grid size-5 place-items-center rounded-full bg-action-primary text-[11px] text-action-primary-text">
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
        {/* «En vivo» de verdad: cuándo se leyó la base y cómo volver a leerla, sin recargar ni
            perder filtros. No hay refresco automático. */}
        <button
          onClick={onActualizar}
          disabled={actualizando}
          title={`Corte ${hora} · clic para actualizar los datos`}
          className={`hidden h-9 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors hover:bg-white/5 hover:text-primary disabled:cursor-progress md:inline-flex ${
            falloActualizar ? "text-warning" : "text-muted"
          }`}
        >
          <RefreshCw className={`size-3.5 ${actualizando ? "animate-spin" : ""}`} />
          <span aria-live="polite" className="hidden lg:inline">
            {actualizando
              ? "Actualizando…"
              : falloActualizar
                ? "No se pudo actualizar · reintentar"
                : tic === null
                  ? `Corte ${hora}`
                  : `Actualizado ${haceCuanto(actualizadoEn, tic)}`}
          </span>
        </button>
        <form action={salir}>
          <button
            type="submit"
            aria-label={confirmaSalida ? "Confirmar cierre de sesión" : "Cerrar sesión"}
            onClick={(e) => {
              if (confirmaSalida) return;
              e.preventDefault();
              setConfirmaSalida(true);
              relojSalida.current = setTimeout(() => setConfirmaSalida(false), 4000);
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-xs font-bold tracking-[0.08em] uppercase transition-colors ${
              confirmaSalida
                ? "border-danger text-danger"
                : "border-control text-secondary hover:border-gold-600 hover:text-accent"
            }`}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{confirmaSalida ? "¿Confirmar?" : "Salir"}</span>
          </button>
        </form>
      </div>
    </motion.header>
  );
}
