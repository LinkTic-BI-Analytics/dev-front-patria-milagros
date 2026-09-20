"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowBigUp,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { ingresar, type EstadoAcceso } from "./acciones";
import { EASE } from "@/lib/ui/movimiento";

const inicial: EstadoAcceso = { error: null, intento: 0 };
const suave = EASE.salida;

export function FormularioAcceso({
  vencida = false,
  volver = "/",
}: {
  /** Llegó aquí porque su sesión caducó, no porque nunca hubiera entrado. */
  vencida?: boolean;
  /** A dónde iba: se vuelve allí tras entrar. */
  volver?: string;
}) {
  const [estado, accion, enviando] = useActionState(ingresar, inicial);
  const [visible, setVisible] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // Tras un intento fallido el campo queda listo para corregir: con foco y todo seleccionado.
  useEffect(() => {
    if (estado.intento > 0) campo.current?.select();
  }, [estado.intento]);

  return (
    <main className="relative isolate grid min-h-dvh overflow-hidden lg:grid-cols-[1.15fr_1fr]">
      {/* Bandera de fondo con acercamiento lento */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.18, opacity: 0 }}
        animate={{ scale: 1.04, opacity: 1 }}
        transition={{ duration: 2.4, ease: suave }}
      >
        <Image
          src="/linea-grafica-patria/assets/fondo-bandera-dark.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,20,42,.55)_0%,rgba(6,20,42,.78)_45%,rgba(6,20,42,.96)_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_110%,rgba(6,20,42,.9),transparent_60%)]" />
      </motion.div>

      {/* Mensaje institucional */}
      <section className="flex flex-col justify-between px-6 pt-10 pb-6 sm:px-12 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: suave }}
          className="flex items-center gap-3"
        >
          <Image
            src="/linea-grafica-patria/assets/escudo-colombia.png"
            alt="Escudo de Colombia"
            width={40}
            height={43}
          />
          <div className="leading-tight">
            <p className="text-sm font-bold">República de Colombia</p>
            <p className="text-xs text-secondary">Patria Milagro</p>
          </div>
        </motion.div>

        <div className="max-w-2xl py-12 lg:py-0">
          <motion.div
            className="tricolor mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: suave }}
          >
            <span />
            <span />
            <span />
          </motion.div>
          <motion.p
            className="etiqueta mb-4 text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Tablero territorial · Participación ciudadana
          </motion.p>
          <h1 className="titulo-display text-[clamp(2.4rem,1.2rem+4.4vw,5rem)] font-black uppercase">
            {["Sistema de Escucha", "y Planeación", "Nacional"].map((linea, i) => (
              <span key={linea} className="block overflow-hidden">
                <motion.span
                  className={`block ${i === 0 ? "text-accent" : ""}`}
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.65 + i * 0.12, ease: suave }}
                >
                  {linea}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            className="mt-6 max-w-lg text-lg text-secondary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: suave }}
          >
            El panorama del país, territorio por territorio: lo que la ciudadanía cuenta, dónde
            ocurre y cómo avanza su atención.
          </motion.p>
        </div>

        <motion.p
          className="hidden text-xs text-muted lg:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          Uso institucional. El acceso queda restringido a personal autorizado.
        </motion.p>
      </section>

      {/* Tarjeta de acceso */}
      <section className="flex items-center justify-center px-6 pb-12 sm:px-12 lg:pb-0">
        <motion.div
          key={estado.intento}
          initial={estado.intento === 0 ? { opacity: 0, y: 30, scale: 0.97 } : false}
          animate={
            estado.error
              ? { x: [0, -12, 10, -8, 6, -3, 0], opacity: 1, y: 0, scale: 1 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={estado.error ? { duration: 0.5 } : { duration: 0.9, delay: 0.8, ease: suave }}
          className="vidrio relative w-full max-w-md rounded-lg p-8 shadow-[var(--shadow-deep)] sm:p-10"
        >
          <div className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

          <div className="mb-8 flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-full bg-[rgba(255,200,0,.12)] text-accent">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold">Acceso seguro</h2>
              <p className="text-sm text-secondary">Ingrese su token de acceso único</p>
            </div>
          </div>

          {vencida && (
            <p
              role="status"
              className="mb-5 flex items-start gap-2 rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning"
            >
              <Clock className="mt-0.5 size-4 shrink-0" />
              Su sesión caducó por seguridad. Ingrese de nuevo para continuar donde estaba.
            </p>
          )}

          <form action={accion} className="space-y-5">
            <input type="hidden" name="volver" value={volver} />
            <label htmlFor="token" className="etiqueta block">
              Token de acceso
            </label>
            {/* El rechazo se siente en el campo, no solo se lee: una sacudida corta por intento. */}
            <motion.div
              key={estado.intento}
              animate={estado.error ? { x: [0, -9, 8, -5, 4, 0] } : undefined}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="group relative"
            >
              <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent" />
              <input
                ref={campo}
                id="token"
                name="token"
                onKeyUp={(e) => setMayusculas(e.getModifierState("CapsLock"))}
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                required
                placeholder="••••••••••••"
                aria-invalid={Boolean(estado.error)}
                aria-describedby="token-error"
                className="cifra h-14 w-full rounded-sm border border-default bg-surface-2/70 pr-12 pl-12 text-lg tracking-widest text-primary outline-none transition-all placeholder:text-muted focus:border-gold-500 focus:shadow-[0_0_0_3px_rgba(255,200,0,.25)] aria-[invalid=true]:border-danger"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-muted transition-colors hover:bg-white/5 hover:text-primary"
                aria-label={visible ? "Ocultar token" : "Mostrar token"}
              >
                {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </motion.div>
            {mayusculas && (
              <p className="-mt-2 flex items-center gap-1.5 text-xs text-warning">
                <ArrowBigUp className="size-4" /> Bloq Mayús está activado
              </p>
            )}

            <AnimatePresence>
              {estado.error && (
                <motion.p
                  id="token-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger"
                >
                  {estado.error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={enviando}
              className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-sm bg-action-primary text-sm font-extrabold tracking-[0.08em] text-action-primary-text uppercase shadow-glow-gold transition-all hover:-translate-y-px hover:bg-[var(--gold-400)] disabled:cursor-wait disabled:opacity-80"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {enviando ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" /> Verificando
                </>
              ) : (
                <>
                  Ingresar al tablero
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between border-t border-subtle pt-6">
            <Image
              src="/linea-grafica-patria/assets/logo-gobierno-blanco.png"
              alt="Gobierno de Colombia"
              width={70}
              height={59}
              className="opacity-90"
            />
            <p className="max-w-[12rem] text-right text-xs text-muted">
              Acceso protegido · uso institucional
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
