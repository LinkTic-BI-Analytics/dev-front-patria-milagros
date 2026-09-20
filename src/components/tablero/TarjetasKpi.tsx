"use client";

import { motion } from "motion/react";
import { MapPinned, MessagesSquare, Radar, Siren, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CANALES,
  ETAPAS_ALERTA,
  formatoNumero,
  type Metrica,
} from "@/lib/datos/catalogos";
import type { Resumen } from "@/lib/datos/agregar";
import type { Canal, EtapaAlerta } from "@/lib/datos/tipos";
import { CifraAnimada } from "./CifraAnimada";
import { EASE, RESORTE, reducirMovimiento } from "@/lib/ui/movimiento";
import { usePista } from "@/components/ui/Pista";

const entrada = {
  oculto: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: EASE.salida },
  }),
};

function Tarjeta({
  i,
  icono: Icono,
  etiqueta,
  children,
  pie,
  className = "",
  activa = false,
  onActivar,
}: {
  i: number;
  icono: LucideIcon;
  etiqueta: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
  className?: string;
  /** Esta cifra es la que pinta el mapa ahora. */
  activa?: boolean;
  /** Solo las tarjetas que llevan su cifra al mapa reaccionan al cursor: el resto no promete nada. */
  onActivar?: () => void;
}) {
  return (
    <motion.div
      custom={i}
      variants={entrada}
      initial="oculto"
      animate="visible"
      whileHover={onActivar ? { y: -2 } : undefined}
      className={`panel group relative overflow-hidden p-3.5 transition-colors ${
        activa ? "border-gold-600/70" : onActivar ? "hover:border-default" : ""
      } ${className}`}
    >
      {onActivar && (
        <>
          <button
            onClick={onActivar}
            aria-pressed={activa}
            aria-label={`Ver ${etiqueta.toLowerCase()} en el mapa`}
            className="foco-dentro absolute inset-0 z-0 rounded-[inherit]"
          />
          <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[radial-gradient(circle,rgba(255,200,0,.12),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </>
      )}
      <div className="pointer-events-none relative z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="etiqueta">{etiqueta}</p>
          {activa ? (
            <motion.span
              layoutId="kpi-en-mapa"
              transition={RESORTE.pastilla}
              className="rounded-full bg-action-primary px-1.5 py-px text-[11px] font-bold whitespace-nowrap text-action-primary-text"
            >
              En el mapa
            </motion.span>
          ) : (
            <Icono
              className={`size-4 text-muted transition-colors ${onActivar ? "group-hover:text-accent" : ""}`}
            />
          )}
        </div>
        <div className="mt-1.5">{children}</div>
        {pie && <div className="mt-1 text-[11px] leading-tight text-muted">{pie}</div>}
      </div>
    </motion.div>
  );
}

/** Línea de los últimos 28 días. Es contexto, no una gráfica: sin ejes ni tooltip. */
function Tendencia({ serie }: { serie: number[] }) {
  if (serie.length < 7 || !serie.some((n) => n > 0)) return null;
  const max = Math.max(...serie);
  const paso = 100 / (serie.length - 1);
  const punto = (n: number, i: number) => `${(i * paso).toFixed(2)},${(24 - (n / max) * 22).toFixed(2)}`;
  const d = `M${serie.map(punto).join(" L")}`;
  const ultimo = serie[serie.length - 1];

  return (
    <span className="relative block h-6 w-full">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-full overflow-visible">
        <motion.path
          d={d}
          fill="none"
          stroke="var(--gold-500)"
          strokeWidth={1.4}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reducirMovimiento() ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE.salida }}
        />
      </svg>
      {/* El punto final es HTML: en SVG no existe `box-shadow` y el pulso no se vería. */}
      <span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulso rounded-full bg-gold-500"
        style={{ left: "100%", top: `${((24 - (ultimo / max) * 22) / 24) * 100}%` }}
      />
    </span>
  );
}

function Delta({ delta7 }: { delta7: NonNullable<Resumen["delta7"]> }) {
  // Con muy pocos aportes la semana pasada, «+300 %» no informa de nada.
  if (delta7.previo < 10) return null;
  const cambio = Math.round(((delta7.actual - delta7.previo) * 100) / delta7.previo);
  if (cambio === 0) return null;
  const sube = cambio > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
        sube ? "bg-success-bg text-success" : "bg-white/8 text-secondary"
      }`}
    >
      {sube ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {sube ? "+" : ""}
      {cambio} %
      <span className="font-normal text-muted">vs. semana previa</span>
    </span>
  );
}

function Canal({
  canal,
  n,
  total,
  activo,
  onClick,
}: {
  canal: Canal;
  n: number;
  total: number;
  activo: boolean;
  onClick: () => void;
}) {
  const { etiqueta, icono: Icono, color } = CANALES[canal];
  const { disparador, pista } = usePista(
    <>
      <span className="text-primary">{etiqueta}</span>:{" "}
      <span className="cifra">{formatoNumero(n)}</span> aportes.{" "}
      <span className="text-muted">{activo ? "Clic para quitar el filtro" : "Clic para filtrar"}</span>
    </>,
  );
  return (
    <>
      <button
        {...disparador}
        onClick={onClick}
        aria-pressed={activo}
        aria-label={`Canal ${etiqueta}`}
        className={`foco-dentro pointer-events-auto relative z-10 flex items-center gap-1.5 rounded-xs px-1 py-0.5 text-xs transition-colors ${
          activo ? "text-accent" : "text-secondary hover:text-primary"
        }`}
      >
        <span className="size-2 rounded-full" style={{ background: color }} />
        <Icono className="size-3.5 text-muted" />
        {etiqueta}
        <span className="cifra text-primary">{total ? Math.round((n * 100) / total) : 0}%</span>
      </button>
      {pista}
    </>
  );
}

const ORDEN_ETAPAS: EtapaAlerta[] = ["recibida", "contactada", "orientada", "levantada"];
const COLOR_ETAPA: Record<EtapaAlerta, string> = {
  recibida: "#3D74C9",
  contactada: "#6FA3EA",
  orientada: "#CFE2FB",
  levantada: "#FFC800",
};

export function TarjetasKpi({
  r,
  nacional,
  metrica,
  onMetrica,
  totalMunicipios,
  canalesActivos,
  onCanal,
}: {
  r: Resumen;
  nacional: boolean;
  metrica: Metrica;
  onMetrica: (m: Metrica) => void;
  /** Municipios del territorio en el catálogo, para decir «61 de 1.120». */
  totalMunicipios: number;
  canalesActivos: Canal[];
  onCanal: (c: Canal) => void;
}) {
  const totalCanales = Object.values(r.canales).reduce((a, b) => a + b, 0);
  const totalEtapas = ORDEN_ETAPAS.reduce((a, e) => a + r.etapasAlerta[e], 0);
  const cobertura = totalMunicipios ? (r.municipiosConAportes * 100) / totalMunicipios : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1">
      {/* KPI principal */}
      <motion.div
        custom={0}
        variants={entrada}
        initial="oculto"
        animate="visible"
        className="panel relative col-span-2 overflow-hidden border-l-[3px] border-l-gold-500 p-4"
      >
        <button
          onClick={() => onMetrica("aportes")}
          aria-pressed={metrica === "aportes"}
          aria-label="Ver aportes en el mapa"
          className="foco-dentro absolute inset-0 z-0 rounded-[inherit]"
        />
        <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-[radial-gradient(circle,rgba(255,200,0,.16),transparent_65%)]" />
        <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="etiqueta flex items-center gap-2">
              Aportes ciudadanos
              {metrica === "aportes" && (
                <motion.span
                  layoutId="kpi-en-mapa"
                  transition={RESORTE.pastilla}
                  className="rounded-full bg-action-primary px-1.5 py-px text-[11px] font-bold tracking-normal whitespace-nowrap text-action-primary-text normal-case"
                >
                  En el mapa
                </motion.span>
              )}
            </p>
            <CifraAnimada
              variante="display"
              valor={r.aportes}
              className="mt-0.5 block text-[2.25rem] leading-none font-bold text-primary"
            />
            {r.delta7 && (
              <span className="mt-1.5 inline-block">
                <Delta delta7={r.delta7} />
              </span>
            )}
          </div>
          <span className="flex w-24 flex-col items-end gap-1 sm:w-28">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(255,200,0,.12)] text-accent">
              <MessagesSquare className="size-4.5" />
            </span>
            <Tendencia serie={r.serie} />
          </span>
        </div>

        {/* Canales: barra apilada y leyenda que además filtra */}
        <div className="pointer-events-none relative z-10 mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full">
          {(Object.keys(CANALES) as Canal[]).map((c) =>
            r.canales[c] ? (
              <motion.div
                key={c}
                className="h-full basis-0 first:rounded-l-full last:rounded-r-full"
                style={{ background: CANALES[c].color }}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: r.canales[c] }}
                transition={{ duration: 0.9, ease: EASE.salida }}
              />
            ) : null,
          )}
        </div>
        <div className="pointer-events-none relative z-10 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(CANALES) as Canal[]).map((c) => (
            <Canal
              key={c}
              canal={c}
              n={r.canales[c]}
              total={totalCanales}
              activo={canalesActivos.includes(c)}
              onClick={() => onCanal(c)}
            />
          ))}
        </div>
      </motion.div>

      {/* Lo que hay que atender va primero: necesidades y alertas. */}
      <Tarjeta
        i={1}
        icono={Radar}
        etiqueta="Necesidades"
        activa={metrica === "necesidades"}
        onActivar={() => onMetrica("necesidades")}
        pie={
          <>
            <span className="cifra text-secondary">
              {r.necesidades ? Math.round((r.respondidas * 100) / r.necesidades) : 0}%
            </span>{" "}
            con respuesta registrada
          </>
        }
      >
        <CifraAnimada variante="display" valor={r.necesidades} className="text-[1.75rem] font-extrabold" />
      </Tarjeta>

      <Tarjeta
        i={2}
        icono={Siren}
        etiqueta="Alertas activas"
        activa={metrica === "alertas"}
        onActivar={() => onMetrica("alertas")}
        pie={
          totalEtapas > 0 ? (
            <>
              <span className="mb-1 flex h-1 gap-px overflow-hidden rounded-full">
                {ORDEN_ETAPAS.map((e) =>
                  r.etapasAlerta[e] ? (
                    <span
                      key={e}
                      className="h-full"
                      style={{
                        background: COLOR_ETAPA[e],
                        width: `${(r.etapasAlerta[e] * 100) / totalEtapas}%`,
                      }}
                    />
                  ) : null,
                )}
              </span>
              <span className="cifra text-secondary">
                {formatoNumero(r.etapasAlerta.recibida)}
              </span>{" "}
              con {ETAPAS_ALERTA.recibida.toLowerCase()}
            </>
          ) : (
            "Ninguna pendiente"
          )
        }
      >
        <span className="flex items-center gap-2">
          <CifraAnimada
            variante="display"
            valor={r.alertasActivas}
            className="text-[1.75rem] font-extrabold"
          />
          {r.alertasActivas > 0 && (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
            </span>
          )}
        </span>
      </Tarjeta>

      <Tarjeta
        i={3}
        icono={MapPinned}
        etiqueta="Municipios"
        pie={
          <>
            <span className="mb-1 block h-1 overflow-hidden rounded-full bg-white/8">
              <motion.span
                className="block h-full rounded-full bg-gold-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(cobertura, cobertura > 0 ? 2 : 0)}%` }}
                transition={{ duration: 1, ease: EASE.salida }}
              />
            </span>
            de {formatoNumero(totalMunicipios)} · {cobertura.toFixed(1).replace(".", ",")} %
          </>
        }
      >
        <CifraAnimada
          variante="display"
          valor={r.municipiosConAportes}
          className="text-[1.75rem] font-extrabold"
        />
      </Tarjeta>

      <Tarjeta
        i={4}
        icono={Target}
        etiqueta={nacional ? "Ubicación resuelta" : "Peso en el país"}
        pie={nacional ? "aportes con municipio confirmado" : "de los aportes ubicados del país"}
      >
        {r.porcentaje === null ? (
          <span className="cifra text-[1.75rem] font-bold text-muted">—</span>
        ) : (
          <CifraAnimada
            variante="display"
            valor={r.porcentaje}
            decimales={1}
            sufijo="%"
            className="text-[1.75rem] font-bold"
          />
        )}
      </Tarjeta>
    </div>
  );
}
