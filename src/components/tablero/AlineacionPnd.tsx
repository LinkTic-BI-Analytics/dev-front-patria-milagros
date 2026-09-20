"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Compass, Lock, Orbit, Quote, SearchX } from "lucide-react";
import { formatoNumero } from "@/lib/datos/catalogos";
import type { AlineacionPnd as Alineacion } from "@/lib/datos/narrativas";
import { EASE } from "@/lib/ui/movimiento";

const suave = EASE.salida;
export const SIN_RELACION = "sin_relacion";

/**
 * Cómo se relacionan las narrativas del territorio con los ejes y líneas del PND.
 * Los nombres llegan del catálogo (`src/lib/pnd/catalogo.json`) a través de los datos del tablero.
 */
export function AlineacionPnd({
  alineacion,
  fuente,
  nombreTerritorio,
  activos,
  onEje,
  lineaActiva,
  onLinea,
  onAbrirEje,
}: {
  alineacion: Alineacion;
  fuente: string;
  nombreTerritorio: string;
  /** Ejes filtrados en el tablero; puede incluir `SIN_RELACION`. */
  activos: string[];
  onEje: (eje: string) => void;
  /** Línea del Plan que acota la tabla (solo aquí, no es un filtro del tablero). */
  lineaActiva: string | null;
  onLinea: (id: string | null) => void;
  /** Abre el modal de ejes en ese eje. */
  onAbrirEje: (id: string) => void;
}) {
  const { total, relacionadas, ejes, lineas, sinRelacion } = alineacion;
  const [verTodas, setVerTodas] = useState(false);
  const alternar = onEje;
  // Las barras se escalan sobre el total, no sobre el mayor: si no, el primer eje siempre
  // ocupa el 100 % y parece absoluto aunque tenga el 30 % de las narrativas.
  const conVoces = ejes.filter((e) => e.total > 0);
  const enCero = ejes.filter((e) => e.total === 0);

  return (
    <div className="relative mt-6 overflow-hidden rounded-md border border-subtle bg-[linear-gradient(160deg,rgba(0,49,137,.22),rgba(10,26,58,.15)_60%)] p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(78,139,224,.14),transparent_65%)]" />

      {/* Encabezado */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(78,139,224,.16)] text-info">
            <Compass className="size-5" />
          </span>
          <div>
            <p className="etiqueta text-info">Conexión con el Plan Nacional de Desarrollo 2026–2030</p>
            <p className="mt-1 text-sm text-secondary">
              En {nombreTerritorio},{" "}
              <span className="cifra font-bold text-primary">
                {total ? Math.round((relacionadas * 100) / total) : 0}%
              </span>{" "}
              de las narrativas se relaciona con alguna línea del Plan.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning">
          <Lock className="size-3" /> Borrador · uso interno
        </span>
      </div>

      {/* Cómo se reparte el total entre los ejes: una sola barra al 100 %. */}
      <div className="relative mt-4">
        <div className="flex h-2.5 gap-px overflow-hidden rounded-full">
          {conVoces.map((e, i) => (
            <motion.button
              key={e.id}
              onClick={() => alternar(e.id)}
              aria-label={`Eje ${e.numero}: ${e.nombre}, ${formatoNumero(e.total)} narrativas`}
              className="h-full bg-gold-500 transition-[filter] hover:brightness-125"
              style={{ opacity: 1 - (i % 3) * 0.22 }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: e.total }}
              transition={{ duration: 0.9, ease: suave }}
            />
          ))}
          {sinRelacion.total > 0 && (
            <motion.span
              className="h-full"
              style={{
                background:
                  "repeating-linear-gradient(135deg, rgba(237,241,247,.28) 0 3px, rgba(237,241,247,.08) 3px 7px)",
              }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: sinRelacion.total }}
              transition={{ duration: 0.9, ease: suave }}
            />
          )}
        </div>
      </div>

      <div className="relative mt-4 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        {/* Ejes */}
        <div>
          <p className="etiqueta mb-2">Narrativas por eje · clic para filtrar el tablero</p>
          <ul className="space-y-1">
            {conVoces.map((e, i) => {
              const activo = activos.includes(e.id);
              return (
                <li key={e.id}>
                  <div
                    className={`group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1 rounded-sm border px-2 py-1.5 transition-colors ${
                      activo
                        ? "border-gold-500 bg-[rgba(255,200,0,.08)]"
                        : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => alternar(e.id)}
                      aria-pressed={activo}
                      aria-label={`Filtrar por el eje ${e.numero}: ${e.nombre}`}
                      className={`cifra foco-dentro grid size-6 place-items-center rounded-full text-[11px] font-bold ${
                        activo
                          ? "bg-action-primary text-action-primary-text"
                          : "bg-white/8 text-secondary"
                      }`}
                    >
                      {e.numero}
                    </button>
                    <button
                      onClick={() => alternar(e.id)}
                      aria-pressed={activo}
                      className="foco-dentro min-w-0 text-left text-sm leading-snug text-balance text-primary"
                    >
                      {e.nombre}
                    </button>
                    <span className="cifra text-right text-xs text-primary">
                      {formatoNumero(e.total)}
                      <span className="ml-1 text-muted">{Math.round(e.porcentaje)}%</span>
                    </span>
                    <span className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <motion.span
                        className="block h-full rounded-full bg-gold-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(e.total * 100) / Math.max(total, 1)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: suave }}
                      />
                    </span>
                    <button
                      onClick={() => onAbrirEje(e.id)}
                      className="foco-dentro col-span-2 col-start-2 flex items-center gap-1 text-left text-[11px] text-link opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                    >
                      <Orbit className="size-3" /> Ver el eje en Ejes articuladores
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {enCero.length > 0 && (
            <p className="mt-1.5 px-2 text-[11px] text-muted">
              Sin narrativas todavía:{" "}
              {enCero.map((e, i) => (
                <span key={e.id}>
                  {i > 0 && ", "}
                  <button
                    onClick={() => onAbrirEje(e.id)}
                    className="foco-dentro text-secondary hover:text-accent"
                  >
                    {e.nombre}
                  </button>
                </span>
              ))}
              .
            </p>
          )}

          {/* Sin relación clara: lo que el Plan todavía no nombra */}
          <button
            onClick={() => alternar(SIN_RELACION)}
            disabled={sinRelacion.total === 0}
            aria-pressed={activos.includes(SIN_RELACION)}
            className={`mt-3 w-full rounded-sm border border-dashed p-3 text-left transition-colors disabled:cursor-default ${
              activos.includes(SIN_RELACION)
                ? "border-gold-500 bg-[rgba(255,200,0,.08)]"
                : "border-default hover:bg-white/5"
            }`}
          >
            <p className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-secondary">
                <SearchX className="size-3.5 text-warning" /> Sin relación clara con el Plan
              </span>
              <span className="cifra text-primary">
                {formatoNumero(sinRelacion.total)}
                <span className="ml-1 text-muted">{Math.round(sinRelacion.porcentaje)}%</span>
              </span>
            </p>
            {sinRelacion.relato ? (
              <p className="mt-1.5 text-xs leading-snug text-muted">
                Posible vacío u oportunidad para la formulación. Lo más repetido:{" "}
                <span className="text-secondary italic">«{sinRelacion.relato}»</span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted">Todas las narrativas encuentran una línea.</p>
            )}
          </button>
        </div>

        {/* Líneas con más voces */}
        <div>
          <p className="etiqueta mb-2">Líneas del Plan con más narrativas</p>
          {lineas.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">Ninguna narrativa se relaciona con el Plan.</p>
          ) : (
            <ol className="space-y-2">
              <AnimatePresence initial={false}>
                {(verTodas ? lineas : lineas.slice(0, 4)).map((l, i) => {
                  const activa = lineaActiva === l.id;
                  return (
                    <motion.li
                      key={l.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(0.05 + i * 0.07, 0.4), duration: 0.45, ease: suave }}
                    >
                      <button
                        onClick={() => onLinea(activa ? null : l.id)}
                        aria-pressed={activa}
                        className={`foco-dentro w-full rounded-sm border p-3 text-left transition-colors ${
                          activa
                            ? "border-gold-500 bg-[rgba(255,200,0,.08)]"
                            : "border-subtle bg-white/[.025] hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-sm leading-snug font-bold text-primary">
                              {l.nombre}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted">
                              Eje {l.eje.numero} · {l.eje.nombre}
                            </span>
                          </span>
                          <span className="cifra shrink-0 rounded-full bg-[rgba(255,200,0,.12)] px-2 py-0.5 text-xs font-bold text-accent">
                            {formatoNumero(l.total)}
                          </span>
                        </span>
                        <span className="mt-2 flex gap-1.5 text-xs leading-snug text-secondary">
                          <Quote className="mt-0.5 size-3 shrink-0 text-accent" />
                          <span>
                            {l.relato}{" "}
                            <span className="cifra whitespace-nowrap text-muted">
                              ×{formatoNumero(l.veces)}
                            </span>
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[11px] text-muted">
                          Coincide por:{" "}
                          <span className="text-secondary">{l.claves.slice(0, 3).join(" · ")}</span>
                          {l.claves.length > 3 && (
                            <> · también por: {l.claves.slice(3, 6).join(", ")}</>
                          )}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
          {lineas.length > 4 && (
            <button
              onClick={() => setVerTodas((v) => !v)}
              aria-expanded={verTodas}
              className="mt-2 text-xs text-link hover:underline"
            >
              {verTodas ? "Ver solo las 4 primeras" : `Ver las ${lineas.length} líneas con voces`}
            </button>
          )}
        </div>
      </div>

      <p className="relative mt-4 border-t border-subtle pt-3 text-[11px] leading-relaxed text-muted">
        Relación aproximada: cada narrativa se asocia a la línea cuyas palabras clave aparecen en su
        relato (el sector del aporte solo desempata), sin inteligencia artificial. Fuente: {fuente}.
      </p>
    </div>
  );
}
