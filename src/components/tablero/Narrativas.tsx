"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Layers,
  List,
  MapPin,
  Compass,
  MessageSquareQuote,
  PenLine,
  Rows3,
  Quote,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { Filtrados, Filtros } from "@/lib/datos/agregar";
import { CANALES, formatoNumero, nombrePropio, temaDe } from "@/lib/datos/catalogos";
import {
  agruparNarrativas,
  alineacionPnd,
  generalidad,
  narrativasDe,
  normalizar,
  type FilaNarrativa,
  type Generalidad,
  type GrupoNarrativo,
} from "@/lib/datos/narrativas";
import type { DatosTablero } from "@/lib/datos/tipos";
import { AlineacionPnd, SIN_RELACION } from "./AlineacionPnd";

const suave = [0.22, 1, 0.36, 1] as const;
const POR_PAGINA = 8;

const fechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatoFecha = (f: string) => fechaCorta.format(new Date(`${f}T12:00:00Z`));

type Vista = "agrupadas" | "todas";
type Pestana = "panorama" | "plan" | "narrativas";

export function Narrativas({
  datos,
  filtrados,
  filtros,
  codigo,
  nombreTerritorio,
}: {
  datos: DatosTablero;
  filtrados: Filtrados;
  filtros: Filtros;
  codigo: string | null;
  nombreTerritorio: string;
}) {
  const [vista, setVista] = useState<Vista>("agrupadas");
  const [busqueda, setBusqueda] = useState("");
  const [ejePnd, setEjePnd] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("panorama");
  // La página vuelve a 1 cuando cambia lo que se está mirando.
  const contexto = `${codigo}|${filtros.temas.join()}|${filtros.canales.join()}|${vista}|${busqueda}|${ejePnd}`;
  const [pagina, setPagina] = useState({ contexto, n: 0 });
  const n = pagina.contexto === contexto ? pagina.n : 0;

  const nombreDe = (c: string) =>
    nombrePropio(
      (c.length === 2 ? datos.departamentos[c]?.nombre : datos.municipios[c]?.nombre) ?? c,
    );

  const filas = useMemo(() => narrativasDe(datos, filtrados, codigo), [datos, filtrados, codigo]);
  const referencia = useMemo(() => narrativasDe(datos, filtrados, null), [datos, filtrados]);
  const resumen = useMemo(
    () => generalidad(filas, referencia, codigo),
    [filas, referencia, codigo],
  );
  const alineacion = useMemo(
    () => (datos.pnd ? alineacionPnd(filas, datos.pnd) : null),
    [datos.pnd, filas],
  );
  const lineaPorId = useMemo(
    () =>
      new Map(
        (datos.pnd?.ejes ?? []).flatMap((e) =>
          e.lineas.map((l) => [l.id, { nombre: l.nombre, eje: e.numero }] as const),
        ),
      ),
    [datos.pnd],
  );
  const nombreEje = (id: string) => {
    if (id === SIN_RELACION) return "Sin relación clara con el PND";
    const eje = datos.pnd?.ejes.find((e) => e.id === id);
    return eje ? `Eje ${eje.numero} · ${eje.nombre}` : id;
  };

  // El filtro por eje solo afecta la tabla; la generalidad mira todo el territorio.
  const filasTabla = useMemo(
    () =>
      ejePnd === null
        ? filas
        : filas.filter((f) => (ejePnd === SIN_RELACION ? !f.pnd : f.pnd?.eje === ejePnd)),
    [filas, ejePnd],
  );
  const grupos = useMemo(() => agruparNarrativas(filasTabla, codigo), [filasTabla, codigo]);

  // Búsqueda sobre el relato, el tema y los lugares.
  const q = normalizar(busqueda.trim());
  const lugaresDe = (municipios: string[]) =>
    municipios.map((m) => `${nombreDe(m)} ${nombreDe(m.slice(0, 2))}`).join(" ");
  const coincide = (texto: string) => !q || normalizar(texto).includes(q);

  const nombreLinea = (id: string | null | undefined) => (id ? lineaPorId.get(id)?.nombre ?? "" : "");
  const listaGrupos = grupos.filter((g) =>
    coincide(
      `${g.cuerpo} ${g.temas.map((t) => temaDe(t).etiqueta).join(" ")} ${lugaresDe(g.municipios)} ${nombreLinea(g.pnd)}`,
    ),
  );
  const listaTodas = filasTabla.filter((f) =>
    coincide(
      `${f.cuerpo} ${temaDe(f.aporte.tema).etiqueta} ${lugaresDe(f.aporte.municipios)} ${nombreLinea(f.pnd?.linea)}`,
    ),
  );
  const total = vista === "agrupadas" ? listaGrupos.length : listaTodas.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = Math.min(n, paginas - 1);
  const desde = actual * POR_PAGINA;

  const pestanas = (
    [
      { id: "panorama", etiqueta: "Panorama", icono: ChartPie, detalle: null },
      datos.pnd
        ? {
            id: "plan",
            etiqueta: "Plan Nacional",
            icono: Compass,
            detalle: alineacion
              ? `${Math.round((alineacion.relacionadas * 100) / Math.max(alineacion.total, 1))}%`
              : null,
          }
        : null,
      {
        id: "narrativas",
        etiqueta: "Narrativas",
        icono: Rows3,
        detalle: formatoNumero(filas.length),
      },
    ] as ({ id: Pestana; etiqueta: string; icono: typeof ChartPie; detalle: string | null } | null)[]
  ).filter((p) => p !== null);

  const filtrosActivos = [
    ...filtros.temas.map((t) => temaDe(t).etiqueta),
    ...filtros.canales.map((c) => CANALES[c].etiqueta),
    ...filtros.ejes.map((id) => {
      const eje = datos.pnd?.ejes.find((e) => e.id === id);
      return eje ? `Eje ${eje.numero}` : id;
    }),
  ];

  return (
    <motion.section
      id="narrativas"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: suave }}
      className="panel relative scroll-mt-20 overflow-hidden p-4 sm:p-6"
      aria-label="Narrativas ciudadanas"
    >
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(255,200,0,.10),transparent_65%)]" />

      {/* Encabezado */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tricolor mb-2">
            <span />
            <span />
            <span />
          </div>
          <p className="etiqueta text-accent">Lo cualitativo · Voces del territorio</p>
          <h2 className="titulo-display mt-1 text-2xl font-black sm:text-3xl">
            Narrativas ciudadanas{" "}
            {/* Se reemplaza al vuelo: con salida encadenada el título se quedaba atrás. */}
            <motion.span
              key={nombreTerritorio}
              className="inline-block text-accent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              · {nombreTerritorio}
            </motion.span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pastilla valor={resumen.total} etiqueta="narrativas" />
          <Pastilla valor={resumen.distintas} etiqueta="relatos distintos" />
          <Pastilla valor={resumen.confirmadas} etiqueta="confirmadas por quien las contó" />
        </div>
      </div>
      {filtrosActivos.length > 0 && (
        <p className="relative mt-3 text-xs text-muted">
          Filtrado por: <span className="text-secondary">{filtrosActivos.join(" · ")}</span>
        </p>
      )}

      {/* Pestañas: una lectura a la vez */}
      <div className="relative mt-5 flex gap-1 border-b border-subtle" role="tablist">
        {pestanas.map(({ id, etiqueta, icono: Icono, detalle }) => (
          <button
            key={id}
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-bold transition-colors ${
              pestana === id ? "text-primary" : "text-muted hover:text-secondary"
            }`}
          >
            <Icono className={`size-4 ${pestana === id ? "text-accent" : ""}`} />
            {etiqueta}
            {detalle !== null && (
              <span className="cifra rounded-full bg-white/8 px-1.5 text-[11px] text-secondary">
                {detalle}
              </span>
            )}
            {pestana === id && (
              <motion.span
                layoutId="pestana-narrativas"
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gold-500"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pestana}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: suave }}
        >
          {pestana === "panorama" && (
            <>
                  {/* Generalidad narrativa */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${codigo}|${filtrosActivos.join()}`}
                      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                      transition={{ duration: 0.45, ease: suave }}
                      className="relative mt-5"
                    >
                      {resumen.total === 0 ? (
                        <div className="rounded-md border border-subtle bg-white/[.02] py-10 text-center text-sm text-muted">
                          No hay narrativas en {nombreTerritorio} con los filtros actuales.
                        </div>
                      ) : (
                        <GeneralidadNarrativa
                          resumen={resumen}
                          nombreTerritorio={nombreTerritorio}
                          nacional={codigo === null}
                          ejePrincipal={
                            alineacion?.ejes.reduce(
                              (max, e) => (e.total > (max?.total ?? 0) ? e : max),
                              null as (typeof alineacion.ejes)[number] | null,
                            ) ?? null
                          }
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
            </>
          )}

          {pestana === "plan" && (
            <>
                  {alineacion && alineacion.total > 0 && datos.pnd && (
                    <AlineacionPnd
                      alineacion={alineacion}
                      fuente={datos.pnd.fuente}
                      nombreTerritorio={nombreTerritorio}
                      ejeActivo={ejePnd}
                      onEje={(eje) => {
                        setEjePnd(eje);
                        // El filtro se siente en la tabla: se pasa a esa pestaña.
                        if (eje) setPestana("narrativas");
                      }}
                    />
                  )}
            </>
          )}

          {pestana === "narrativas" && (
            <>
                  {/* Tabla */}
                  <div className="relative mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex rounded-md border border-subtle bg-white/[.03] p-1" role="tablist">
                        {(
                          [
                            ["agrupadas", "Agrupadas", Layers],
                            ["todas", "Todas", List],
                          ] as const
                        ).map(([v, etiqueta, Icono]) => (
                          <button
                            key={v}
                            role="tab"
                            aria-selected={vista === v}
                            onClick={() => setVista(v)}
                            className={`relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                              vista === v ? "text-action-primary-text" : "text-secondary hover:text-primary"
                            }`}
                          >
                            {vista === v && (
                              <motion.span
                                layoutId="vista-narrativas"
                                className="absolute inset-0 rounded-sm bg-action-primary"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              />
                            )}
                            <Icono className="relative size-3.5" />
                            <span className="relative">{etiqueta}</span>
                          </button>
                        ))}
                      </div>

                      {ejePnd && (
                        <button
                          onClick={() => setEjePnd(null)}
                          className="flex items-center gap-1.5 rounded-full border border-gold-500 bg-[rgba(255,200,0,.08)] px-3 py-1 text-xs text-primary transition-colors hover:bg-[rgba(255,200,0,.14)] sm:mr-auto"
                        >
                          {nombreEje(ejePnd)}
                          <X className="size-3.5 text-accent" />
                        </button>
                      )}

                      <label className="group relative w-full sm:w-72">
                        <span className="sr-only">Buscar en las narrativas</span>
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted group-focus-within:text-accent" />
                        <input
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder={datos.pnd ? "Buscar relato, tema, lugar o línea" : "Buscar relato, tema o municipio"}
                          className="h-9 w-full rounded-sm border border-default bg-surface-2/60 pr-8 pl-9 text-sm text-primary outline-none transition-all placeholder:text-muted focus:border-gold-500 focus:shadow-[0_0_0_3px_rgba(255,200,0,.2)]"
                        />
                        {busqueda && (
                          <button
                            onClick={() => setBusqueda("")}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-primary"
                            aria-label="Limpiar búsqueda"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </label>
                    </div>

                    <div className="scroll-fino overflow-x-auto rounded-md border border-subtle">
                      {vista === "agrupadas" ? (
                        <TablaAgrupada
                          grupos={listaGrupos.slice(desde, desde + POR_PAGINA)}
                          maximo={listaGrupos[0]?.veces ?? 1}
                          nombreDe={nombreDe}
                          lineaDe={datos.pnd ? (id) => lineaPorId.get(id ?? "") ?? null : null}
                          claveAnimacion={`${contexto}|${actual}`}
                        />
                      ) : (
                        <TablaTodas
                          filas={listaTodas.slice(desde, desde + POR_PAGINA)}
                          nombreDe={nombreDe}
                          lineaDe={datos.pnd ? (id) => lineaPorId.get(id ?? "") ?? null : null}
                          claveAnimacion={`${contexto}|${actual}`}
                        />
                      )}
                      {total === 0 && (
                        <p className="py-10 text-center text-sm text-muted">
                          {busqueda ? `Nada coincide con «${busqueda}».` : "Sin narrativas para mostrar."}
                        </p>
                      )}
                    </div>

                    {total > 0 && (
                      <div className="mt-3 flex items-center justify-between text-xs text-muted">
                        <span>
                          <span className="cifra text-secondary">
                            {formatoNumero(desde + 1)}–{formatoNumero(Math.min(desde + POR_PAGINA, total))}
                          </span>{" "}
                          de <span className="cifra text-secondary">{formatoNumero(total)}</span>{" "}
                          {vista === "agrupadas" ? "relatos" : "narrativas"}
                        </span>
                        <div className="flex items-center gap-1">
                          <BotonPagina
                            onClick={() => setPagina({ contexto, n: actual - 1 })}
                            disabled={actual === 0}
                            etiqueta="Página anterior"
                          >
                            <ChevronLeft className="size-4" />
                          </BotonPagina>
                          <span className="cifra px-2 text-secondary">
                            {actual + 1} / {paginas}
                          </span>
                          <BotonPagina
                            onClick={() => setPagina({ contexto, n: actual + 1 })}
                            disabled={actual >= paginas - 1}
                            etiqueta="Página siguiente"
                          >
                            <ChevronRight className="size-4" />
                          </BotonPagina>
                        </div>
                      </div>
                    )}
                  </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="relative mt-5 border-t border-subtle pt-3 text-[11px] leading-relaxed text-muted">
        Cada narrativa es la síntesis vigente (última versión) de un aporte. «Confirmada» significa
        que la persona validó su síntesis, no que los hechos estén verificados. La generalidad se
        calcula contando temas, relatos repetidos y términos frente al total nacional con los mismos
        filtros; no la redacta un modelo.
      </p>
    </motion.section>
  );
}

function Pastilla({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <span className="rounded-full border border-subtle bg-white/[.03] px-3 py-1 text-secondary">
      <span className="cifra font-bold text-primary">{formatoNumero(valor)}</span> {etiqueta}
    </span>
  );
}

function GeneralidadNarrativa({
  resumen,
  nombreTerritorio,
  nacional,
  ejePrincipal,
}: {
  resumen: Generalidad;
  nombreTerritorio: string;
  nacional: boolean;
  ejePrincipal: { numero: number; nombre: string; porcentaje: number } | null;
}) {
  const [t1, t2] = resumen.temas;
  const maxVeces = resumen.recurrentes[0]?.veces ?? 1;
  const concentracion =
    (resumen.recurrentes.reduce((suma, g) => suma + g.veces, 0) * 100) / resumen.total;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
      {/* Lectura */}
      <div className="relative overflow-hidden rounded-md border border-gold-500/30 bg-[linear-gradient(135deg,rgba(255,200,0,.08),rgba(10,26,58,.2)_55%)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-[rgba(255,200,0,.14)] text-accent">
            <Sparkles className="size-4" />
          </span>
          <p className="etiqueta text-accent">Generalidad narrativa</p>
        </div>
        <p className="font-display text-lg leading-snug font-bold text-primary sm:text-xl">
          En {nombreTerritorio}{" "}
          {t1 ? (
            <>
              la conversación gira sobre todo en torno a{" "}
              <span className="text-accent">{temaDe(t1.tema).etiqueta}</span>
              {t2 && (
                <>
                  {/* "Agricultura y Desarrollo Rural, y Estadística": la coma evita la doble "y". */}
                  {temaDe(t1.tema).etiqueta.includes(" y ") ? "," : ""} y{" "}
                  <span className="text-accent">{temaDe(t2.tema).etiqueta}</span>
                </>
              )}
              .
            </>
          ) : (
            <>las narrativas aún no tienen un tema clasificado.</>
          )}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          {resumen.distintas <= 3 ? (
            <>
              Todo lo que se cuenta cabe en{" "}
              <span className="cifra text-primary">{formatoNumero(resumen.distintas)}</span>{" "}
              {resumen.distintas === 1 ? "relato" : "relatos"}
            </>
          ) : (
            <>
              Los 3 relatos más repetidos reúnen el{" "}
              <span className="cifra text-primary">{Math.round(concentracion)}%</span> de las
              narrativas
            </>
          )}
          , y{" "}
          <span className="cifra text-primary">
            {Math.round((resumen.confirmadas * 100) / resumen.total)}%
          </span>{" "}
          fue confirmado por quien lo contó.
          {ejePrincipal && (
            <>
              {" "}
              Frente al Plan Nacional de Desarrollo, se conecta sobre todo con el eje{" "}
              <span className="text-primary">
                {ejePrincipal.numero} · {ejePrincipal.nombre}
              </span>{" "}
              (<span className="cifra">{Math.round(ejePrincipal.porcentaje)}%</span>).
            </>
          )}
        </p>

        {/* Temas predominantes */}
        <div className="mt-4 space-y-2">
          {resumen.temas.map(({ tema, total, porcentaje }, i) => {
            const { etiqueta, corta, icono: Icono } = temaDe(tema);
            return (
              <div key={tema} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-secondary" title={etiqueta}>
                  <Icono className="size-3.5 shrink-0 text-accent" />
                  <span className="truncate">{corta}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.span
                    className="block h-full rounded-full bg-gold-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${porcentaje}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: suave }}
                  />
                </span>
                <span className="cifra text-right text-primary">
                  {formatoNumero(total)}
                  <span className="ml-1 text-muted">{Math.round(porcentaje)}%</span>
                </span>
              </div>
            );
          })}
          {resumen.sinClasificar > 0 && (
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted">
              <CircleDashed className="size-3" /> Porcentajes sobre las narrativas con tema ·{" "}
              {formatoNumero(resumen.sinClasificar)} aún sin clasificar
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Relatos recurrentes */}
        <div className="rounded-md border border-subtle bg-white/[.02] p-4">
          <p className="etiqueta mb-3 flex items-center gap-1.5">
            <MessageSquareQuote className="size-3.5" /> Relatos que más se repiten
          </p>
          <ol className="space-y-3">
            {resumen.recurrentes.map((g, i) => (
              <motion.li
                key={g.clave}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: suave }}
              >
                <div className="flex gap-2.5">
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <p className="text-sm leading-snug text-primary">{g.cuerpo}</p>
                </div>
                <div className="mt-1.5 ml-6 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                    <motion.span
                      className="block h-full rounded-full bg-gold-500/80"
                      initial={{ width: 0 }}
                      animate={{ width: `${(g.veces * 100) / maxVeces}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: suave }}
                    />
                  </span>
                  <span className="cifra text-[11px] text-muted">
                    {formatoNumero(g.veces)} {g.veces === 1 ? "vez" : "veces"}
                  </span>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Términos */}
        {resumen.terminos.length > 0 && (
          <div className="rounded-md border border-subtle bg-white/[.02] p-4">
            <p className="etiqueta mb-3">
              {nacional ? "Términos más frecuentes" : `Términos que distinguen a ${nombreTerritorio}`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumen.terminos.map((t, i) => (
                <motion.span
                  key={t.termino}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  title={`Aparece en ${t.veces} narrativas`}
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: `rgba(255,200,0,${0.15 + t.peso * 0.45})`,
                    background: `rgba(255,200,0,${0.04 + t.peso * 0.14})`,
                    color: t.peso > 0.6 ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: t.peso > 0.6 ? 700 : 500,
                  }}
                >
                  {t.termino}
                  <span className="cifra ml-1.5 text-[10px] text-muted">{t.veces}</span>
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const cabecera = "etiqueta sticky top-0 bg-surface-1 px-3 py-2.5 text-left text-[11px] font-bold";
const celda = "px-3 py-3 align-top";

function ChipTema({ tema }: { tema: string | null }) {
  const { etiqueta, corta, icono: Icono } = temaDe(tema);
  return (
    <span
      title={etiqueta}
      className={`inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-xs whitespace-nowrap ${
        tema ? "border-subtle text-secondary" : "border-dashed border-subtle text-muted"
      }`}
    >
      <Icono className={`size-3.5 ${tema ? "text-accent" : ""}`} />
      {corta}
    </span>
  );
}

function Lugares({ municipios, nombreDe }: { municipios: string[]; nombreDe: (c: string) => string }) {
  if (!municipios.length)
    return <span className="text-xs text-muted italic">Sin ubicación confirmada</span>;
  const [primero, ...resto] = municipios;
  return (
    <span className="flex items-start gap-1.5 text-sm">
      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" />
      <span>
        <span className="text-primary">{nombreDe(primero)}</span>
        <span className="block text-xs text-muted">
          {nombreDe(primero.slice(0, 2))}
          {resto.length > 0 && ` · +${resto.length} ${resto.length === 1 ? "municipio" : "municipios"}`}
        </span>
      </span>
    </span>
  );
}

function FilaAnimada({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03, duration: 0.35, ease: suave }}
      className="border-t border-subtle transition-colors hover:bg-white/[.035]"
    >
      {children}
    </motion.tr>
  );
}

function TablaAgrupada({
  grupos,
  maximo,
  nombreDe,
  lineaDe,
  claveAnimacion,
}: {
  grupos: GrupoNarrativo[];
  maximo: number;
  nombreDe: (c: string) => string;
  lineaDe: BuscarLinea | null;
  claveAnimacion: string;
}) {
  if (!grupos.length) return null;
  return (
    <table className={`w-full border-collapse ${lineaDe ? "min-w-[58rem]" : "min-w-[46rem]"}`}>
      <thead>
        <tr>
          <th className={cabecera}>Relato</th>
          <th className={cabecera}>Tema</th>
          {lineaDe && <th className={cabecera}>Línea del PND</th>}
          <th className={cabecera}>Dónde se cuenta</th>
          <th className={`${cabecera} w-40`}>Veces</th>
          <th className={`${cabecera} text-right`}>Último</th>
        </tr>
      </thead>
      <tbody key={claveAnimacion}>
        {grupos.map((g, i) => (
          <FilaAnimada key={g.clave} i={i}>
            <td className={`${celda} max-w-[22rem]`}>
              <p className="text-sm leading-snug text-primary">{g.cuerpo}</p>
              {g.confirmadas > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-info">
                  <BadgeCheck className="size-3" /> {formatoNumero(g.confirmadas)}{" "}
                  {g.confirmadas === 1 ? "confirmada" : "confirmadas"}
                </p>
              )}
            </td>
            <td className={celda}>
              <div className="flex flex-col items-start gap-1">
                {g.temas.slice(0, 2).map((t) => (
                  <ChipTema key={t} tema={t === "sin_tema" ? null : t} />
                ))}
              </div>
            </td>
            {lineaDe && (
              <td className={celda}>
                <CeldaLinea linea={lineaDe(g.pnd)} />
              </td>
            )}
            <td className={celda}>
              <Lugares municipios={g.municipios} nombreDe={nombreDe} />
            </td>
            <td className={celda}>
              <div className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <motion.span
                    className="block h-full rounded-full bg-gold-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(g.veces * 100) / maximo}%` }}
                    transition={{ duration: 0.7, delay: i * 0.03, ease: suave }}
                  />
                </span>
                <span className="cifra w-7 text-right text-sm font-bold text-primary">
                  {formatoNumero(g.veces)}
                </span>
              </div>
            </td>
            <td className={`${celda} cifra text-right text-xs whitespace-nowrap text-secondary`}>
              {formatoFecha(g.ultima)}
            </td>
          </FilaAnimada>
        ))}
      </tbody>
    </table>
  );
}

type BuscarLinea = (id: string | null) => { nombre: string; eje: number } | null;

function CeldaLinea({
  linea,
  claves,
}: {
  linea: { nombre: string; eje: number } | null;
  claves?: string[];
}) {
  if (!linea) return <span className="text-xs text-muted italic">Sin relación clara</span>;
  return (
    <span className="block max-w-[15rem]" title={claves?.length ? `Coincide por: ${claves.join(", ")}` : undefined}>
      <span className="block text-xs leading-snug text-primary">{linea.nombre}</span>
      <span className="cifra mt-0.5 inline-block rounded-xs bg-[rgba(78,139,224,.14)] px-1.5 text-[10px] text-info">
        Eje {linea.eje}
      </span>
    </span>
  );
}

const CLASES = {
  mal_interpretado: "Corregida: se había interpretado mal",
  cambio_de_posicion: "Corregida: cambio de posición",
} as const;

function TablaTodas({
  filas,
  nombreDe,
  lineaDe,
  claveAnimacion,
}: {
  filas: FilaNarrativa[];
  nombreDe: (c: string) => string;
  lineaDe: BuscarLinea | null;
  claveAnimacion: string;
}) {
  if (!filas.length) return null;
  return (
    <table className={`w-full border-collapse ${lineaDe ? "min-w-[64rem]" : "min-w-[52rem]"}`}>
      <thead>
        <tr>
          <th className={cabecera}>Narrativa</th>
          <th className={cabecera}>Tema</th>
          {lineaDe && <th className={cabecera}>Línea del PND</th>}
          <th className={cabecera}>Territorio</th>
          <th className={cabecera}>Canal</th>
          <th className={cabecera}>Fecha</th>
          <th className={cabecera}>Estado</th>
        </tr>
      </thead>
      <tbody key={claveAnimacion}>
        {filas.map((f, i) => {
          const canal = CANALES[f.aporte.canal];
          return (
            <FilaAnimada key={f.aporteId} i={i}>
              <td className={`${celda} max-w-[22rem]`}>
                <p className="text-sm leading-snug text-primary">{f.cuerpo}</p>
                {f.version > 1 && f.clase !== "propuesta" && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-accent">
                    <PenLine className="size-3" /> {CLASES[f.clase]} · v{f.version}
                  </p>
                )}
              </td>
              <td className={celda}>
                <ChipTema tema={f.aporte.tema} />
              </td>
              {lineaDe && (
                <td className={celda}>
                  <CeldaLinea linea={lineaDe(f.pnd?.linea ?? null)} claves={f.pnd?.claves} />
                </td>
              )}
              <td className={celda}>
                <Lugares municipios={f.aporte.municipios} nombreDe={nombreDe} />
              </td>
              <td className={celda}>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <span className="size-2 rounded-full" style={{ background: canal.color }} />
                  {canal.etiqueta}
                </span>
              </td>
              <td className={`${celda} cifra text-xs whitespace-nowrap text-secondary`}>
                {formatoFecha(f.aporte.fecha)}
              </td>
              <td className={celda}>
                {f.confirmada ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-[11px] whitespace-nowrap text-info">
                    <BadgeCheck className="size-3" /> Confirmada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-subtle px-2 py-0.5 text-[11px] whitespace-nowrap text-muted">
                    Sin confirmar
                  </span>
                )}
              </td>
            </FilaAnimada>
          );
        })}
      </tbody>
    </table>
  );
}

function BotonPagina({
  children,
  onClick,
  disabled,
  etiqueta,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  etiqueta: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="grid size-8 place-items-center rounded-sm border border-subtle text-secondary transition-colors hover:border-gold-500 hover:text-accent disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
