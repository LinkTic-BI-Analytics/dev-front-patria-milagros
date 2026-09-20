"use client";

import {
  Fragment,
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownUp,
  ArrowRight,
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
import { EstadoVacio } from "./EstadoVacio";
import { EASE, RESORTE } from "@/lib/ui/movimiento";

const suave = EASE.salida;
const PAGINAS = [10, 25, 50];
type Orden = "veces" | "fecha";

const fechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatoFecha = (f: string) => fechaCorta.format(new Date(`${f}T12:00:00Z`));

type Vista = "agrupadas" | "todas";

export type Pestana = "panorama" | "plan" | "narrativas";

// Memoizado: el tablero se re-renderiza al mover el cursor por el mapa y esto no depende de eso.
export const Narrativas = memo(function Narrativas({
  datos,
  filtrados,
  filtradosSinEje,
  filtros,
  onFiltros,
  onQuitarTerritorio,
  onTerritorio,
  onAbrirEje,
  pestana,
  onPestana,
  codigo,
  nombreTerritorio,
}: {
  datos: DatosTablero;
  filtrados: Filtrados;
  /** Lo mismo sin el filtro de eje: el bloque del Plan compara los seis, no solo el elegido. */
  filtradosSinEje: Filtrados;
  filtros: Filtros;
  onFiltros: Dispatch<SetStateAction<Filtros>>;
  onQuitarTerritorio: () => void;
  /** Llevar el mapa a un municipio desde un relato. */
  onTerritorio: (codigo: string) => void;
  /** Abrir el modal de ejes articuladores en un eje concreto. */
  onAbrirEje: (id: string) => void;
  pestana: Pestana;
  onPestana: (p: Pestana) => void;
  codigo: string | null;
  nombreTerritorio: string;
}) {
  const [vista, setVista] = useState<Vista>("agrupadas");
  const [porPagina, setPorPagina] = useState(10);
  const [orden, setOrden] = useState<{ campo: Orden; dir: "asc" | "desc" }>({
    campo: "veces",
    dir: "desc",
  });
  const [abierta, setAbierta] = useState<string | null>(null);
  const [soloConfirmadas, setSoloConfirmadas] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const [busqueda, setBusqueda] = useState("");
  // El eje se filtra en el tablero entero (un solo filtro, no uno aquí y otro en el mapa). Lo único
  // propio de esta tabla es «sin relación clara», que no existe como eje y excluye a los demás.
  const [soloSinRelacion, setSoloSinRelacion] = useState(false);
  // Acota la tabla a una línea del Plan. No es un filtro del tablero: solo de esta tabla.
  const [lineaPnd, setLineaPnd] = useState<string | null>(null);
  const sinRelacion = soloSinRelacion && filtros.ejes.length === 0;
  // La pestaña vive en el Tablero: el modal de ejes y el mapa también la mueven.
  const setPestana = onPestana;
  // La página vuelve a 1 cuando cambia lo que se está mirando.
  const contexto = `${codigo}|${filtros.temas.join()}|${filtros.canales.join()}|${filtros.ejes.join()}|${vista}|${busqueda}|${sinRelacion}|${lineaPnd}|${soloConfirmadas}`;
  // Lo mismo sin la búsqueda: teclear filtra, pero no vuelve a animar toda la tabla.
  const claveTabla = `${codigo}|${filtros.temas.join()}|${filtros.canales.join()}|${filtros.ejes.join()}|${vista}|${sinRelacion}|${lineaPnd}|${soloConfirmadas}`;
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
    () =>
      datos.pnd
        ? alineacionPnd(
            filtros.ejes.length ? narrativasDe(datos, filtradosSinEje, codigo) : filas,
            datos.pnd,
          )
        : null,
    [datos, filtradosSinEje, filtros.ejes.length, codigo, filas],
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
  const filasTabla = useMemo(() => {
    let base = sinRelacion ? filas.filter((f) => !f.pnd) : filas;
    if (lineaPnd) base = base.filter((f) => f.pnd?.linea === lineaPnd);
    return soloConfirmadas ? base.filter((f) => f.confirmada) : base;
  }, [filas, sinRelacion, lineaPnd, soloConfirmadas]);
  const alternarEje = (id: string) => {
    if (id === SIN_RELACION) {
      setSoloSinRelacion(!sinRelacion);
      onFiltros((f) => (f.ejes.length ? { ...f, ejes: [] } : f));
      return;
    }
    setSoloSinRelacion(false);
    onFiltros((f) => ({
      ...f,
      ejes: f.ejes.includes(id) ? f.ejes.filter((e) => e !== id) : [...f.ejes, id],
    }));
  };
  const grupos = useMemo(() => agruparNarrativas(filasTabla, codigo), [filasTabla, codigo]);

  // Búsqueda sobre el relato, el tema y los lugares.
  // Diferida: teclear no bloquea el campo aunque haya cientos de relatos que filtrar.
  const q = normalizar(useDeferredValue(busqueda).trim());
  const lugaresDe = (municipios: string[]) =>
    municipios.map((m) => `${nombreDe(m)} ${nombreDe(m.slice(0, 2))}`).join(" ");
  const coincide = (texto: string) => !q || normalizar(texto).includes(q);

  const nombreLinea = (id: string | null | undefined) =>
    id ? (lineaPorId.get(id)?.nombre ?? "") : "";
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
  // El orden lo elige quien lee: por lo que más se repite o por lo más reciente.
  const signo = orden.dir === "desc" ? 1 : -1;
  const gruposOrdenados = useMemo(
    () =>
      orden.campo === "veces"
        ? listaGrupos
        : [...listaGrupos].sort((a, b) => signo * b.ultima.localeCompare(a.ultima)),
    // `listaGrupos` ya viene por veces descendente de `agruparNarrativas`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listaGrupos, orden],
  );
  const gruposVisibles =
    orden.campo === "veces" && orden.dir === "asc" ? [...gruposOrdenados].reverse() : gruposOrdenados;
  const todasOrdenadas = useMemo(
    () =>
      orden.dir === "desc"
        ? listaTodas
        : [...listaTodas].sort((a, b) => a.aporte.fecha.localeCompare(b.aporte.fecha)),
    [listaTodas, orden.dir],
  );

  const total = vista === "agrupadas" ? gruposVisibles.length : todasOrdenadas.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(n, paginas - 1);
  const desde = actual * porPagina;
  const irAPagina = (p: number) => {
    setPagina({ contexto, n: Math.max(0, Math.min(p, paginas - 1)) });
    setAbierta(null);
    tabla.current?.scrollIntoView({ block: "nearest" });
  };
  const ordenar = (c: Orden) =>
    setOrden((o) => ({ campo: c, dir: o.campo === c && o.dir === "desc" ? "asc" : "desc" }));
  const tabla = useRef<HTMLDivElement>(null);

  // Atajo «/»: el buscador es lo que más se usa de esta zona.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const activo = document.activeElement;
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return;
      if (!campo.current) return;
      e.preventDefault();
      setPestana("narrativas");
      campo.current.focus();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [setPestana]);

  const pestanas = (
    [
      { id: "panorama", etiqueta: "Panorama", corta: "Panorama", icono: ChartPie, detalle: null },
      datos.pnd
        ? {
            id: "plan",
            etiqueta: "Plan Nacional",
            corta: "Plan",
            icono: Compass,
            detalle: alineacion?.total
              ? `${Math.round((alineacion.relacionadas * 100) / Math.max(alineacion.total, 1))}%`
              : null,
          }
        : null,
      {
        id: "narrativas",
        etiqueta: "Narrativas",
        corta: "Tabla",
        icono: Rows3,
        detalle: formatoNumero(filas.length),
      },
    ] as ({
      id: Pestana;
      etiqueta: string;
      corta: string;
      icono: typeof ChartPie;
      detalle: string | null;
    } | null)[]
  ).filter((p) => p !== null);

  // Todo lo que recorta lo que se ve, cada cosa con su forma de quitarla.
  const chips: { clave: string; etiqueta: string; quitar: () => void }[] = [
    ...(codigo
      ? [{ clave: "territorio", etiqueta: nombreTerritorio, quitar: onQuitarTerritorio }]
      : []),
    ...filtros.temas.map((t) => ({
      clave: `tema-${t}`,
      etiqueta: temaDe(t).corta,
      quitar: () => onFiltros((f) => ({ ...f, temas: f.temas.filter((x) => x !== t) })),
    })),
    ...filtros.canales.map((c) => ({
      clave: `canal-${c}`,
      etiqueta: CANALES[c].etiqueta,
      quitar: () => onFiltros((f) => ({ ...f, canales: f.canales.filter((x) => x !== c) })),
    })),
    ...filtros.ejes.map((id) => {
      const eje = datos.pnd?.ejes.find((e) => e.id === id);
      return {
        clave: `eje-${id}`,
        etiqueta: eje ? `Eje ${eje.numero} · ${eje.nombre}` : id,
        quitar: () => onFiltros((f) => ({ ...f, ejes: f.ejes.filter((x) => x !== id) })),
      };
    }),
    ...(lineaPnd
      ? [
          {
            clave: `linea-${lineaPnd}`,
            etiqueta: `Línea: ${lineaPorId.get(lineaPnd)?.nombre ?? lineaPnd}`,
            quitar: () => setLineaPnd(null),
          },
        ]
      : []),
    ...(sinRelacion
      ? [
          {
            clave: "sin-relacion",
            etiqueta: "Sin relación clara con el Plan",
            quitar: () => setSoloSinRelacion(false),
          },
        ]
      : []),
    ...(busqueda.trim()
      ? [{ clave: "busqueda", etiqueta: `«${busqueda.trim()}»`, quitar: () => setBusqueda("") }]
      : []),
  ];
  const limpiarTodo = () => {
    onFiltros({ temas: [], canales: [], ejes: [] });
    setSoloSinRelacion(false);
    setLineaPnd(null);
    setSoloConfirmadas(false);
    setBusqueda("");
    onQuitarTerritorio();
  };
  const claveFiltros = chips.map((c) => c.clave).join();
  const vacioAcciones = [
    ...(chips.some((c) => c.clave !== "territorio")
      ? [
          {
            etiqueta: "Quitar filtros",
            onClick: () => {
              onFiltros({ temas: [], canales: [], ejes: [] });
              setSoloSinRelacion(false);
              setLineaPnd(null);
              setSoloConfirmadas(false);
              setBusqueda("");
            },
          },
        ]
      : []),
    ...(codigo ? [{ etiqueta: "Ver toda Colombia", onClick: onQuitarTerritorio }] : []),
  ];

  return (
    <motion.section
      id="narrativas"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: suave }}
      className="panel relative scroll-mt-20 overflow-clip p-4 sm:p-6"
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
        {/* De cuántos aportes salen estas narrativas, y en cuántos relatos distintos caben. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>
            <span className="cifra text-primary">{formatoNumero(filtrados.aportes.length)}</span>{" "}
            aportes
          </span>
          <ArrowRight className="size-3" />
          <span>
            <span className="cifra text-primary">{formatoNumero(resumen.total)}</span> con narrativa
          </span>
          <ArrowRight className="size-3" />
          <span>
            <span className="cifra text-primary">{formatoNumero(resumen.distintas)}</span> relatos
            distintos
          </span>
          <span className="text-subtle">·</span>
          <span>
            <span className="cifra text-info">{formatoNumero(resumen.confirmadas)}</span>{" "}
            confirmadas por quien las contó
          </span>
        </p>
      </div>
      {chips.length > 0 && (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted">Viendo:</span>
          {chips.map((c) => (
            <button
              key={c.clave}
              onClick={c.quitar}
              aria-label={`Quitar ${c.etiqueta}`}
              className="group flex max-w-[16rem] items-center gap-1 rounded-full border border-default bg-white/[.04] py-0.5 pr-1.5 pl-2.5 text-secondary transition-colors hover:border-gold-500 hover:text-primary"
            >
              <span className="truncate">{c.etiqueta}</span>
              <X className="size-3 shrink-0 text-muted group-hover:text-accent" />
            </button>
          ))}
          {chips.length > 1 && (
            <button onClick={limpiarTodo} className="ml-1 text-link hover:underline">
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Pestañas: una lectura a la vez */}
      <div
        role="tablist"
        aria-label="Vistas de las narrativas"
        onKeyDown={(e) => {
          const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!paso) return;
          e.preventDefault();
          const i = pestanas.findIndex((p) => p.id === pestana);
          setPestana(pestanas[(i + paso + pestanas.length) % pestanas.length].id);
        }}
        className="scroll-fino relative mt-5 flex snap-x gap-1 overflow-x-auto border-b border-subtle"
      >
        {pestanas.map(({ id, etiqueta, corta, icono: Icono, detalle }) => (
          <button
            key={id}
            id={`pestana-${id}`}
            role="tab"
            aria-selected={pestana === id}
            aria-controls={`panel-${id}`}
            tabIndex={pestana === id ? 0 : -1}
            onClick={() => setPestana(id)}
            className={`foco-dentro relative flex snap-start items-center gap-2 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              pestana === id ? "text-primary" : "text-muted hover:text-secondary"
            }`}
          >
            <Icono className={`size-4 ${pestana === id ? "text-accent" : ""}`} />
            <span className="sm:hidden">{corta}</span>
            <span className="hidden sm:inline">{etiqueta}</span>
            {detalle !== null && (
              <span className="cifra rounded-full bg-white/8 px-1.5 text-[11px] text-secondary">
                {detalle}
              </span>
            )}
            {pestana === id && (
              <motion.span
                layoutId="pestana-narrativas"
                className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-gold-500"
                transition={RESORTE.pastilla}
              />
            )}
          </button>
        ))}
      </div>

      {/* `mode="wait"` es seguro aquí: lo dispara un clic, no un dato, y la salida es solo opacidad. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pestana}
          id={`panel-${pestana}`}
          role="tabpanel"
          aria-labelledby={`pestana-${pestana}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.25, ease: suave }}
        >
          {pestana === "panorama" && (
            <>
              {/* Generalidad narrativa */}
              {/* Con clave y sin salida encadenada: `mode="wait"` ya dejó textos colgados. */}
              <motion.div
                key={claveFiltros}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: suave }}
                className="relative mt-5"
              >
                {resumen.total === 0 ? (
                  <EstadoVacio
                    icono={MessageSquareQuote}
                    titulo={`No hay narrativas en ${nombreTerritorio} con lo que está viendo`}
                    detalle="Quite algún filtro o vuelva al país para leer lo que cuenta la gente."
                    acciones={vacioAcciones}
                  />
                ) : (
                  <GeneralidadNarrativa
                    resumen={resumen}
                    nombreTerritorio={nombreTerritorio}
                    nacional={codigo === null}
                    ejePrincipal={
                      filtros.ejes.length
                        ? null
                        : (alineacion?.ejes.reduce(
                            (max, e) => (e.total > (max?.total ?? 0) ? e : max),
                            null as (typeof alineacion.ejes)[number] | null,
                          ) ?? null)
                    }
                    onTema={(t) =>
                      onFiltros((f) => ({
                        ...f,
                        temas: f.temas.includes(t)
                          ? f.temas.filter((x) => x !== t)
                          : [...f.temas, t],
                      }))
                    }
                    onEje={alternarEje}
                    onBuscar={(t) => {
                      setBusqueda(t);
                      setPestana("narrativas");
                    }}
                    onRelato={(clave) => {
                      setAbierta(clave);
                      setVista("agrupadas");
                      setPestana("narrativas");
                    }}
                  />
                )}
              </motion.div>
            </>
          )}

          {pestana === "plan" && (
            <>
              {alineacion && alineacion.total > 0 && datos.pnd ? (
                <AlineacionPnd
                  alineacion={alineacion}
                  fuente={datos.pnd.fuente}
                  nombreTerritorio={nombreTerritorio}
                  activos={sinRelacion ? [SIN_RELACION] : filtros.ejes}
                  onEje={alternarEje}
                  lineaActiva={lineaPnd}
                  onLinea={(id) => {
                    setLineaPnd(id);
                    if (id) setPestana("narrativas");
                  }}
                  onAbrirEje={onAbrirEje}
                />
              ) : (
                <div className="mt-6">
                  <EstadoVacio
                    icono={Compass}
                    titulo={`Aún no hay narrativas de ${nombreTerritorio} para cruzar con el Plan`}
                    detalle="El cruce con los ejes del Plan se hace sobre los relatos sintetizados. Aquí todavía no hay ninguno con lo que está viendo."
                    acciones={vacioAcciones}
                  />
                </div>
              )}
            </>
          )}

          {pestana === "narrativas" && (
            <>
              {/* Tabla */}
              <div className="relative mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div
                    className="flex rounded-md border border-subtle bg-white/[.03] p-1"
                    role="tablist"
                  >
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
                          vista === v
                            ? "text-action-primary-text"
                            : "text-secondary hover:text-primary"
                        }`}
                      >
                        {vista === v && (
                          <motion.span
                            layoutId="vista-narrativas"
                            className="absolute inset-0 rounded-sm bg-action-primary"
                            transition={RESORTE.pastilla}
                          />
                        )}
                        <Icono className="relative size-3.5" />
                        <span className="relative">{etiqueta}</span>
                      </button>
                    ))}
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-secondary select-none sm:mr-auto">
                    <input
                      type="checkbox"
                      checked={soloConfirmadas}
                      onChange={(e) => setSoloConfirmadas(e.target.checked)}
                      className="size-4 accent-[var(--gold-500)]"
                    />
                    Solo confirmadas
                  </label>

                  <label className="group relative w-full sm:w-80">
                    <span className="sr-only">Buscar en las narrativas</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted group-focus-within:text-accent" />
                    <input
                      ref={campo}
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Escape") return;
                        // Esc es del campo: limpia o suelta el foco, sin sacar del territorio.
                        e.stopPropagation();
                        if (busqueda) setBusqueda("");
                        else e.currentTarget.blur();
                      }}
                      placeholder={
                        datos.pnd
                          ? "Buscar relato, tema, lugar o línea"
                          : "Buscar relato, tema o municipio"
                      }
                      className="h-9 w-full rounded-sm border border-control bg-surface-2/60 pr-20 pl-9 text-sm text-primary outline-none transition-all placeholder:text-muted focus:border-gold-500 focus:shadow-[0_0_0_3px_rgba(255,200,0,.2)]"
                    />
                    {busqueda ? (
                      <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
                        <span aria-live="polite" className="cifra text-[11px] text-muted">
                          {formatoNumero(total)}
                        </span>
                        <button
                          onClick={() => setBusqueda("")}
                          className="relative text-muted after:absolute after:-inset-2 hover:text-primary"
                          aria-label="Limpiar búsqueda"
                        >
                          <X className="size-4" />
                        </button>
                      </span>
                    ) : (
                      <kbd className="cifra pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-xs border border-subtle px-1.5 text-[11px] text-muted pointer-fine:block">
                        /
                      </kbd>
                    )}
                  </label>
                </div>

                <div
                  ref={tabla}
                  className="@container scroll-mt-24 overflow-hidden rounded-md border border-subtle"
                >
                  {vista === "agrupadas" ? (
                    <TablaAgrupada
                      grupos={gruposVisibles.slice(desde, desde + porPagina)}
                      maximo={listaGrupos[0]?.veces ?? 1}
                      nombreDe={nombreDe}
                      lineaDe={datos.pnd ? (id) => lineaPorId.get(id ?? "") ?? null : null}
                      claveAnimacion={`${claveTabla}|${actual}`}
                      busqueda={q}
                      abierta={abierta}
                      onAbrir={(clave) => setAbierta((a) => (a === clave ? null : clave))}
                      onTerritorio={onTerritorio}
                      onVerTodas={(g) => {
                        // Ver una por una: se acota la tabla a ese relato y se cambia de vista.
                        setBusqueda(g.cuerpo.slice(0, 60));
                        setVista("todas");
                        setAbierta(null);
                      }}
                      orden={orden}
                      onOrdenar={ordenar}
                    />
                  ) : (
                    <TablaTodas
                      filas={todasOrdenadas.slice(desde, desde + porPagina)}
                      nombreDe={nombreDe}
                      lineaDe={datos.pnd ? (id) => lineaPorId.get(id ?? "") ?? null : null}
                      claveAnimacion={`${claveTabla}|${actual}`}
                      busqueda={q}
                      orden={orden}
                      onOrdenar={ordenar}
                    />
                  )}
                  {total === 0 && (
                    <EstadoVacio
                      titulo={
                        busqueda ? `Nada coincide con «${busqueda}»` : "Sin narrativas para mostrar"
                      }
                      detalle={
                        busqueda
                          ? "La búsqueda mira el relato, el tema, el lugar y la línea del Plan."
                          : "Ningún relato pasa los filtros de arriba."
                      }
                      acciones={
                        busqueda
                          ? [{ etiqueta: "Limpiar búsqueda", onClick: () => setBusqueda("") }]
                          : vacioAcciones
                      }
                    >
                      {busqueda && resumen.terminos.length > 0 && (
                        <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted">
                          Pruebe con:
                          {resumen.terminos.slice(0, 5).map((t) => (
                            <button
                              key={t.termino}
                              onClick={() => setBusqueda(t.termino)}
                              className="rounded-full bg-white/8 px-2 py-0.5 text-secondary hover:text-accent"
                            >
                              {t.termino}
                            </button>
                          ))}
                        </p>
                      )}
                    </EstadoVacio>
                  )}
                </div>

                {total > 0 && (
                  <div className="vidrio sticky bottom-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-xs text-muted">
                    <span>
                      <span className="cifra text-secondary">
                        {formatoNumero(desde + 1)}–{formatoNumero(Math.min(desde + porPagina, total))}
                      </span>{" "}
                      de <span className="cifra text-secondary">{formatoNumero(total)}</span>{" "}
                      {vista === "agrupadas" ? "relatos" : "narrativas"}
                      <label className="ml-3 hidden sm:inline">
                        <span className="sr-only">Filas por página</span>
                        <select
                          value={porPagina}
                          onChange={(e) => {
                            setPorPagina(Number(e.target.value));
                            setPagina({ contexto, n: 0 });
                          }}
                          className="cursor-pointer rounded-xs border border-control bg-surface-2 px-1.5 py-0.5 text-secondary"
                        >
                          {PAGINAS.map((n) => (
                            <option key={n} value={n}>
                              {n} por página
                            </option>
                          ))}
                        </select>
                      </label>
                    </span>
                    {paginas > 1 && (
                      <nav aria-label="Paginación" className="flex items-center gap-1">
                        <BotonPagina
                          onClick={() => irAPagina(actual - 1)}
                          disabled={actual === 0}
                          etiqueta="Página anterior"
                        >
                          <ChevronLeft className="size-4" />
                        </BotonPagina>
                        {/* Números, no solo flechas: paginar no debería obligar a adivinar. */}
                        {numerosDePagina(actual, paginas).map((p, i) =>
                          p === null ? (
                            <span key={`hueco-${i}`} className="px-1 text-muted">
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => irAPagina(p)}
                              aria-current={p === actual ? "page" : undefined}
                              aria-label={`Página ${p + 1}`}
                              className={`cifra grid size-8 place-items-center rounded-sm text-xs transition-colors ${
                                p === actual
                                  ? "bg-action-primary font-bold text-action-primary-text"
                                  : "text-secondary hover:bg-white/8 hover:text-primary"
                              }`}
                            >
                              {p + 1}
                            </button>
                          ),
                        )}
                        <BotonPagina
                          onClick={() => irAPagina(actual + 1)}
                          disabled={actual >= paginas - 1}
                          etiqueta="Página siguiente"
                        >
                          <ChevronRight className="size-4" />
                        </BotonPagina>
                      </nav>
                    )}
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
});

/**
 * La lectura de lo cualitativo. Todo sale de contar: cuánto pesa cada tema, qué relatos se
 * repiten y qué palabras aparecen aquí más que en el país. Nada lo redacta un modelo.
 *
 * La redacción cambia con el tamaño de la muestra: con 12 narrativas no se puede decir «la
 * conversación gira en torno a…» sin exagerar.
 */
function GeneralidadNarrativa({
  resumen,
  nombreTerritorio,
  nacional,
  ejePrincipal,
  onTema,
  onEje,
  onBuscar,
  onRelato,
}: {
  resumen: Generalidad;
  nombreTerritorio: string;
  nacional: boolean;
  ejePrincipal: { id: string; numero: number; nombre: string; porcentaje: number } | null;
  onTema: (tema: string) => void;
  onEje: (id: string) => void;
  onBuscar: (termino: string) => void;
  onRelato: (clave: string) => void;
}) {
  const [t1, t2] = resumen.temas;
  const maxVeces = resumen.recurrentes[0]?.veces ?? 1;
  const concentracion =
    (resumen.recurrentes.reduce((suma, g) => suma + g.veces, 0) * 100) / resumen.total;
  const confirmadas = Math.round((resumen.confirmadas * 100) / resumen.total);
  const solidez = resumen.total >= 50 ? "alta" : resumen.total >= 30 ? "media" : "baja";

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
          {t1 ? (
            <>
              {solidez === "alta"
                ? `En ${nombreTerritorio} la conversación gira sobre todo en torno a `
                : solidez === "media"
                  ? `En ${nombreTerritorio} lo que más se repite tiene que ver con `
                  : `Las pocas narrativas de ${nombreTerritorio} hablan sobre todo de `}
              <button
                onClick={() => onTema(t1.tema)}
                className="foco-dentro text-accent underline decoration-dotted underline-offset-4 hover:decoration-solid"
              >
                {temaDe(t1.tema).etiqueta}
              </button>
              {t2 && solidez !== "baja" && (
                <>
                  {/* "Agricultura y Desarrollo Rural, y Estadística": la coma evita la doble "y". */}
                  {temaDe(t1.tema).etiqueta.includes(" y ") ? "," : ""} y{" "}
                  <button
                    onClick={() => onTema(t2.tema)}
                    className="foco-dentro text-accent underline decoration-dotted underline-offset-4 hover:decoration-solid"
                  >
                    {temaDe(t2.tema).etiqueta}
                  </button>
                </>
              )}
              .
            </>
          ) : (
            <>Las narrativas de {nombreTerritorio} aún no tienen un tema clasificado.</>
          )}
        </p>

        {/* Tres cifras que sostienen la frase de arriba */}
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {[
            {
              valor: formatoNumero(resumen.total),
              pie: resumen.total === 1 ? "narrativa" : "narrativas",
            },
            {
              valor:
                resumen.distintas <= 3
                  ? formatoNumero(resumen.distintas)
                  : `${Math.round(concentracion)} %`,
              pie:
                resumen.distintas <= 3
                  ? `${resumen.distintas === 1 ? "relato distinto" : "relatos distintos"}`
                  : "en los 3 relatos más repetidos",
            },
            { valor: `${confirmadas} %`, pie: "confirmado por quien lo contó" },
          ].map(({ valor, pie }) => (
            <div key={pie} className="rounded-sm bg-white/[.04] px-2.5 py-2">
              <dd className="cifra-display text-xl font-extrabold text-primary">{valor}</dd>
              <dt className="mt-0.5 text-[11px] leading-tight text-muted">{pie}</dt>
            </div>
          ))}
        </dl>

        {resumen.distintivo && (
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            Frente al país, aquí se habla{" "}
            <span className="text-primary">
              {resumen.distintivo.razon.toFixed(1).replace(".", ",")} veces más
            </span>{" "}
            de{" "}
            <button
              onClick={() => onTema(resumen.distintivo!.tema)}
              className="foco-dentro text-accent underline decoration-dotted underline-offset-4"
            >
              {temaDe(resumen.distintivo.tema).etiqueta}
            </button>
            .
          </p>
        )}
        {ejePrincipal && (
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Frente al Plan Nacional de Desarrollo, se conecta sobre todo con el eje{" "}
            <button
              onClick={() => onEje(ejePrincipal.id)}
              className="foco-dentro text-primary underline decoration-dotted underline-offset-4"
            >
              {ejePrincipal.numero} · {ejePrincipal.nombre}
            </button>{" "}
            (<span className="cifra">{Math.round(ejePrincipal.porcentaje)} %</span>).
          </p>
        )}

        {/* Temas predominantes */}
        <div className="mt-4 space-y-2">
          {resumen.temas.map(({ tema, total, porcentaje }, i) => {
            const { etiqueta, corta, icono: Icono } = temaDe(tema);
            return (
              <button
                key={tema}
                onClick={() => onTema(tema)}
                aria-label={`Filtrar por ${etiqueta}: ${total} narrativas`}
                className="foco-dentro grid w-full grid-cols-[9rem_1fr_3.5rem] items-center gap-3 rounded-sm px-1 py-0.5 text-xs transition-colors hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-secondary">
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
              </button>
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
                <button
                  onClick={() => onRelato(g.clave)}
                  className="foco-dentro w-full rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-white/5"
                >
                  <span className="flex gap-2.5">
                    <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="text-sm leading-snug text-primary">{g.cuerpo}</span>
                  </span>
                  <span className="mt-1.5 ml-6 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                      <motion.span
                        className="block h-full rounded-full bg-gold-500/80"
                        initial={{ width: 0 }}
                        animate={{ width: `${(g.veces * 100) / maxVeces}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: suave }}
                      />
                    </span>
                    <span className="cifra text-[11px] text-muted">
                      {formatoNumero(g.veces)} {g.veces === 1 ? "vez" : "veces"} ·{" "}
                      {Math.round((g.veces * 100) / resumen.total)} %
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Términos */}
        {resumen.terminos.length > 0 && (
          <div className="rounded-md border border-subtle bg-white/[.02] p-4">
            <p className="etiqueta mb-3">
              {nacional
                ? "Términos más frecuentes"
                : `Términos que distinguen a ${nombreTerritorio}`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumen.terminos.map((t, i) => (
                <motion.button
                  key={t.termino}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  onClick={() => onBuscar(t.termino)}
                  aria-label={`Buscar narrativas que mencionan «${t.termino}»`}
                  title={
                    nacional
                      ? `En ${t.relatos} relatos distintos`
                      : `En ${t.relatos} relatos distintos · ${t.razon.toFixed(1).replace(".", ",")} veces más que en el país`
                  }
                  className="foco-dentro rounded-full border px-2.5 py-1 text-xs transition-transform hover:-translate-y-px"
                  style={{
                    borderColor: `rgba(255,200,0,${0.15 + t.peso * 0.45})`,
                    background: `rgba(255,200,0,${0.04 + t.peso * 0.14})`,
                    color: t.peso > 0.6 ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: t.peso > 0.6 ? 700 : 500,
                  }}
                >
                  {t.termino}
                  <span className="cifra ml-1.5 text-[11px] text-muted">
                    {nacional ? t.veces : `×${t.razon.toFixed(1).replace(".", ",")}`}
                  </span>
                </motion.button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              Se cuentan por relato distinto, no por narrativa
              {nacional ? "." : `, y se comparan con el resto del país.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const cabecera = "etiqueta bg-surface-1 px-3 py-2.5 text-left text-[11px] font-bold";
const celda = "px-3 py-3 align-top";

/** Páginas a mostrar alrededor de la actual; `null` es un hueco «…». */
function numerosDePagina(actual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const cerca = [actual - 1, actual, actual + 1].filter((p) => p > 0 && p < total - 1);
  const paginas = [0, ...cerca, total - 1];
  const salida: (number | null)[] = [];
  let previa = -1;
  for (const p of paginas) {
    if (p - previa > 1) salida.push(null);
    salida.push(p);
    previa = p;
  }
  return salida;
}

/**
 * Marca las coincidencias de la búsqueda.
 *
 * Se busca sobre el texto sin tildes y se corta sobre el original: para el español ambas cadenas
 * tienen la misma longitud (una vocal acentuada sigue ocupando un carácter). Si alguna rareza
 * rompiera esa correspondencia, se muestra el texto tal cual antes que descuadrar el resaltado.
 */
function Resaltado({ texto, q }: { texto: string; q: string }) {
  if (!q) return <>{texto}</>;
  const plano = normalizar(texto);
  if (plano.length !== texto.length) return <>{texto}</>;
  const partes: React.ReactNode[] = [];
  let desde = 0;
  let i = plano.indexOf(q);
  while (i >= 0) {
    if (i > desde) partes.push(texto.slice(desde, i));
    partes.push(
      <mark key={i} className="rounded-xs bg-[rgba(255,200,0,.28)] text-primary">
        {texto.slice(i, i + q.length)}
      </mark>,
    );
    desde = i + q.length;
    i = plano.indexOf(q, desde);
  }
  partes.push(texto.slice(desde));
  return <>{partes}</>;
}

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

/** Dónde se cuenta: el alcance primero y el sitio que más lo repite debajo. */
function Lugares({
  conteo,
  departamentos,
  nombreDe,
}: {
  conteo: [string, number][];
  departamentos: number;
  nombreDe: (c: string) => string;
}) {
  if (!conteo.length)
    return <span className="text-xs text-muted italic">Sin ubicación confirmada</span>;
  const [principal, veces] = conteo[0];
  return (
    <span className="flex items-start gap-1.5 text-sm">
      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" />
      <span className="min-w-0">
        {conteo.length > 1 ? (
          <span className="text-primary">
            <span className="cifra">{conteo.length}</span> municipios
            {departamentos > 1 && (
              <>
                {" · "}
                <span className="cifra">{departamentos}</span> departamentos
              </>
            )}
          </span>
        ) : (
          <span className="text-primary">{nombreDe(principal)}</span>
        )}
        <span className="block text-xs text-muted">
          {conteo.length > 1
            ? `Sobre todo en ${nombreDe(principal)} (${veces})`
            : nombreDe(principal.slice(0, 2))}
        </span>
      </span>
    </span>
  );
}

type BuscarLinea = (id: string | null) => { nombre: string; eje: number } | null;

/** Tema y línea del Plan bajo el relato: como columnas propias la tabla no cabía en un portátil. */
function MetaRelato({
  temas,
  linea,
  conPlan,
  claves,
}: {
  temas: (string | null)[];
  linea: { nombre: string; eje: number } | null;
  conPlan: boolean;
  claves?: string[];
}) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {temas.map((t) => (
        <ChipTema key={t ?? "sin"} tema={t} />
      ))}
      {conPlan &&
        (linea ? (
          <span
            className="flex min-w-0 items-center gap-1.5 text-xs text-muted"
            title={
              claves?.length ? `${linea.nombre} · coincide por: ${claves.join(", ")}` : linea.nombre
            }
          >
            <span className="cifra shrink-0 rounded-xs bg-[rgba(78,139,224,.14)] px-1.5 text-[11px] text-info">
              Eje {linea.eje}
            </span>
            <span className="max-w-[18rem] truncate">{linea.nombre}</span>
          </span>
        ) : (
          <span className="text-xs text-muted italic">Sin relación clara con el Plan</span>
        ))}
    </div>
  );
}

function FilaAnimada({
  i,
  children,
  ...resto
}: { i: number; children: React.ReactNode } & React.ComponentProps<typeof motion.tr>) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03, duration: 0.35, ease: suave }}
      className="border-t border-subtle transition-colors hover:bg-white/[.035]"
      {...resto}
    >
      {children}
    </motion.tr>
  );
}

function TarjetaAnimada({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03, duration: 0.35, ease: suave }}
      className="border-t border-subtle p-3 first:border-t-0"
    >
      {children}
    </motion.li>
  );
}

function Veces({ veces, maximo, i }: { veces: number; maximo: number; i: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
        <motion.span
          className="block h-full rounded-full bg-gold-500"
          initial={{ width: 0 }}
          animate={{ width: `${(veces * 100) / maximo}%` }}
          transition={{ duration: 0.7, delay: i * 0.03, ease: suave }}
        />
      </span>
      <span className="cifra w-7 text-right text-sm font-bold text-primary">
        {formatoNumero(veces)}
      </span>
    </div>
  );
}

type Ordenamiento = { campo: Orden; dir: "asc" | "desc" };

/** Cabecera que ordena. El `aria-sort` es lo que anuncia el lector de pantalla. */
function Ordenable({
  campo,
  orden,
  onOrdenar,
  children,
  className = "",
}: {
  campo: Orden;
  orden: Ordenamiento;
  onOrdenar: (c: Orden) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const activo = orden.campo === campo;
  return (
    <th
      scope="col"
      aria-sort={activo ? (orden.dir === "desc" ? "descending" : "ascending") : "none"}
      className={`${cabecera} ${className}`}
    >
      <button
        onClick={() => onOrdenar(campo)}
        className="foco-dentro flex items-center gap-1 transition-colors hover:text-accent"
      >
        {children}
        <ArrowDownUp className={`size-3 ${activo ? "text-accent" : "text-muted opacity-50"}`} />
      </button>
    </th>
  );
}

/** Lo que hay detrás de un relato agrupado: dónde, cómo llegó y con qué palabras entró al Plan. */
function DetalleGrupo({
  grupo,
  nombreDe,
  onTerritorio,
  onVerTodas,
}: {
  grupo: GrupoNarrativo;
  nombreDe: (c: string) => string;
  onTerritorio: (codigo: string) => void;
  onVerTodas: () => void;
}) {
  return (
    <div className="grid gap-4 border-t border-dashed border-default bg-[rgba(4,12,29,.35)] p-3 sm:grid-cols-3 sm:p-4">
      <div className="sm:col-span-1">
        <p className="etiqueta mb-1.5">Dónde se cuenta</p>
        {grupo.conteoMunicipios.length === 0 ? (
          <p className="text-xs text-muted">Sin ubicación confirmada.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {grupo.conteoMunicipios.slice(0, 5).map(([codigo, n]) => (
              <li key={codigo}>
                <button
                  onClick={() => onTerritorio(codigo)}
                  className="foco-dentro flex w-full items-baseline justify-between gap-2 rounded-xs px-1 py-0.5 text-left hover:bg-white/5"
                >
                  <span className="truncate text-secondary hover:text-primary">
                    {nombreDe(codigo)}
                  </span>
                  <span className="cifra shrink-0 text-muted">{n}</span>
                </button>
              </li>
            ))}
            {grupo.conteoMunicipios.length > 5 && (
              <li className="px-1 text-muted">y {grupo.conteoMunicipios.length - 5} municipios más</li>
            )}
          </ul>
        )}
      </div>
      <div>
        <p className="etiqueta mb-1.5">Cómo llegó</p>
        <ul className="space-y-1 text-xs text-secondary">
          {grupo.canales.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: CANALES[c].color }} />
              {CANALES[c].etiqueta}
            </li>
          ))}
          <li className="text-muted">
            Entre {formatoFecha(grupo.primera)} y {formatoFecha(grupo.ultima)}
          </li>
          {grupo.confirmadas > 0 && (
            <li className="flex items-center gap-1 text-info">
              <BadgeCheck className="size-3" /> {formatoNumero(grupo.confirmadas)} confirmadas
            </li>
          )}
        </ul>
      </div>
      <div>
        {grupo.claves.length > 0 && (
          <>
            <p className="etiqueta mb-1.5">Entró al Plan por</p>
            <p className="flex flex-wrap gap-1">
              {grupo.claves.slice(0, 6).map((c) => (
                <span key={c} className="rounded-xs bg-[rgba(78,139,224,.14)] px-1.5 py-0.5 text-xs text-info">
                  {c}
                </span>
              ))}
            </p>
          </>
        )}
        {grupo.veces > 1 && (
          <button
            onClick={onVerTodas}
            className="mt-2 text-xs text-link hover:underline"
          >
            Ver las {formatoNumero(grupo.veces)} una por una
          </button>
        )}
      </div>
    </div>
  );
}

function TablaAgrupada({
  grupos,
  maximo,
  nombreDe,
  lineaDe,
  claveAnimacion,
  busqueda,
  abierta,
  onAbrir,
  onTerritorio,
  onVerTodas,
  orden,
  onOrdenar,
}: {
  grupos: GrupoNarrativo[];
  maximo: number;
  nombreDe: (c: string) => string;
  lineaDe: BuscarLinea | null;
  claveAnimacion: string;
  busqueda: string;
  abierta: string | null;
  onAbrir: (clave: string) => void;
  onTerritorio: (codigo: string) => void;
  onVerTodas: (grupo: GrupoNarrativo) => void;
  orden: Ordenamiento;
  onOrdenar: (c: Orden) => void;
}) {
  if (!grupos.length) return null;
  const relato = (g: GrupoNarrativo) => (
    <>
      <p className="flex items-start gap-1.5 text-sm leading-snug text-primary">
        <ChevronRight
          className={`mt-0.5 size-3.5 shrink-0 text-muted transition-transform ${
            abierta === g.clave ? "rotate-90 text-accent" : ""
          }`}
        />
        <span>
          <Resaltado texto={g.cuerpo} q={busqueda} />
        </span>
      </p>
      <span className="block pl-5">
        <MetaRelato
          temas={g.temas.slice(0, 2).map((t) => (t === "sin_tema" ? null : t))}
          linea={lineaDe?.(g.pnd) ?? null}
          conPlan={lineaDe !== null}
          claves={g.claves}
        />
      </span>
    </>
  );

  return (
    <>
      <table className="hidden w-full border-collapse @[44rem]:table">
        <caption className="sr-only">
          Relatos agrupados por lo que cuentan. Cada fila se abre con más detalle.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cabecera}>
              Relato
            </th>
            <th scope="col" className={`${cabecera} w-48`}>
              Dónde se cuenta
            </th>
            <Ordenable campo="veces" orden={orden} onOrdenar={onOrdenar} className="w-36">
              Veces
            </Ordenable>
            <Ordenable campo="fecha" orden={orden} onOrdenar={onOrdenar} className="w-28">
              Último
            </Ordenable>
          </tr>
        </thead>
        <tbody key={claveAnimacion}>
          {grupos.map((g, i) => (
            <Fragment key={g.clave}>
              <FilaAnimada
                i={i}
                tabIndex={0}
                role="button"
                aria-expanded={abierta === g.clave}
                onClick={() => onAbrir(g.clave)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  onAbrir(g.clave);
                }}
                className={`foco-dentro cursor-pointer border-t border-subtle transition-colors hover:bg-white/[.035] ${
                  abierta === g.clave ? "bg-white/[.04]" : ""
                }`}
              >
                <td className={celda}>{relato(g)}</td>
                <td className={celda}>
                  <Lugares
                    conteo={g.conteoMunicipios}
                    departamentos={g.departamentos.length}
                    nombreDe={nombreDe}
                  />
                </td>
                <td className={celda}>
                  <Veces veces={g.veces} maximo={maximo} i={i} />
                </td>
                <td className={`${celda} cifra text-right text-xs whitespace-nowrap text-secondary`}>
                  {formatoFecha(g.ultima)}
                </td>
              </FilaAnimada>
              {/* Siempre montada: una fila que aparece y desaparece rompería el borde de la tabla. */}
              <tr>
                <td colSpan={4} className="border-0 p-0">
                  <AnimatePresence initial={false}>
                    {abierta === g.clave && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: suave }}
                        className="overflow-clip"
                      >
                        <DetalleGrupo
                          grupo={g}
                          nombreDe={nombreDe}
                          onTerritorio={onTerritorio}
                          onVerTodas={() => onVerTodas(g)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      <ul key={`t-${claveAnimacion}`} className="@[44rem]:hidden">
        {grupos.map((g, i) => (
          <TarjetaAnimada key={g.clave} i={i}>
            <button onClick={() => onAbrir(g.clave)} className="w-full text-left">
              {relato(g)}
            </button>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3">
              <Lugares
                conteo={g.conteoMunicipios}
                departamentos={g.departamentos.length}
                nombreDe={nombreDe}
              />
              <div>
                <Veces veces={g.veces} maximo={maximo} i={i} />
                <p className="cifra mt-1 text-right text-[11px] text-muted">
                  {formatoFecha(g.ultima)}
                </p>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {abierta === g.clave && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: suave }}
                  className="overflow-clip"
                >
                  <div className="mt-3 -mx-3 -mb-3">
                    <DetalleGrupo
                      grupo={g}
                      nombreDe={nombreDe}
                      onTerritorio={onTerritorio}
                      onVerTodas={() => onVerTodas(g)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TarjetaAnimada>
        ))}
      </ul>
    </>
  );
}

const CLASES = {
  mal_interpretado: "Corregida: se había interpretado mal",
  cambio_de_posicion: "Corregida: cambio de posición",
} as const;

function CanalYEstado({ fila }: { fila: FilaNarrativa }) {
  const canal = CANALES[fila.aporte.canal];
  return (
    <span className="flex flex-col items-start gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
        <span className="size-2 rounded-full" style={{ background: canal.color }} />
        {canal.etiqueta}
      </span>
      {fila.confirmada ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-[11px] whitespace-nowrap text-info">
          <BadgeCheck className="size-3" /> Confirmada
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-subtle px-2 py-0.5 text-[11px] whitespace-nowrap text-muted">
          Sin confirmar
        </span>
      )}
    </span>
  );
}

function TablaTodas({
  filas,
  nombreDe,
  lineaDe,
  claveAnimacion,
  busqueda,
  orden,
  onOrdenar,
}: {
  filas: FilaNarrativa[];
  nombreDe: (c: string) => string;
  lineaDe: BuscarLinea | null;
  claveAnimacion: string;
  busqueda: string;
  orden: Ordenamiento;
  onOrdenar: (c: Orden) => void;
}) {
  if (!filas.length) return null;
  const lugaresDe = (f: FilaNarrativa): [string, number][] =>
    f.aporte.municipios.map((m) => [m, 1]);
  const relato = (f: FilaNarrativa) => (
    <>
      <p className="text-sm leading-snug text-primary">
        <Resaltado texto={f.cuerpo} q={busqueda} />
      </p>
      <MetaRelato
        temas={[f.aporte.tema]}
        linea={lineaDe?.(f.pnd?.linea ?? null) ?? null}
        conPlan={lineaDe !== null}
        claves={f.pnd?.claves}
      />
      {f.version > 1 && f.clase !== "propuesta" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-accent">
          <PenLine className="size-3" /> {CLASES[f.clase]} · v{f.version}
        </p>
      )}
    </>
  );
  return (
    <>
      <table className="hidden w-full border-collapse @[44rem]:table">
        <caption className="sr-only">Todas las narrativas, una por aporte.</caption>
        <thead>
          <tr>
            <th scope="col" className={cabecera}>
              Narrativa
            </th>
            <th scope="col" className={`${cabecera} w-48`}>
              Territorio
            </th>
            <th scope="col" className={`${cabecera} w-32`}>
              Canal y estado
            </th>
            <Ordenable campo="fecha" orden={orden} onOrdenar={onOrdenar} className="w-28">
              Fecha
            </Ordenable>
          </tr>
        </thead>
        <tbody key={claveAnimacion}>
          {filas.map((f, i) => (
            <FilaAnimada key={f.aporteId} i={i}>
              <td className={celda}>{relato(f)}</td>
              <td className={celda}>
                <Lugares
                  conteo={lugaresDe(f)}
                  departamentos={new Set(f.aporte.municipios.map((m) => m.slice(0, 2))).size}
                  nombreDe={nombreDe}
                />
              </td>
              <td className={celda}>
                <CanalYEstado fila={f} />
              </td>
              <td className={`${celda} cifra text-right text-xs whitespace-nowrap text-secondary`}>
                {formatoFecha(f.aporte.fecha)}
              </td>
            </FilaAnimada>
          ))}
        </tbody>
      </table>
      <ul key={`t-${claveAnimacion}`} className="@[44rem]:hidden">
        {filas.map((f, i) => (
          <TarjetaAnimada key={f.aporteId} i={i}>
            {relato(f)}
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <Lugares
                conteo={lugaresDe(f)}
                departamentos={new Set(f.aporte.municipios.map((m) => m.slice(0, 2))).size}
                nombreDe={nombreDe}
              />
              <div className="flex flex-col items-end gap-1">
                <CanalYEstado fila={f} />
                <p className="cifra text-[11px] text-muted">{formatoFecha(f.aporte.fecha)}</p>
              </div>
            </div>
          </TarjetaAnimada>
        ))}
      </ul>
    </>
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
