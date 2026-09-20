"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Keyboard,
  MapPin,
  MousePointerClick,
  X,
  Filter,
} from "lucide-react";
import {
  CANALES,
  METRICAS,
  SIN_TEMA,
  formatoNumero,
  nombrePropio,
  temaDe,
  type Metrica,
} from "@/lib/datos/catalogos";
import { ejeMeses, filtrar, resumir, valoresMapa, type Filtros } from "@/lib/datos/agregar";
import { actualizarTablero } from "@/app/(tablero)/acciones";
import { resumenEjes } from "@/lib/datos/ejes";
import { cifrasPorPais } from "@/lib/datos/internacional";
import type { DatosTablero } from "@/lib/datos/tipos";
import type { Ambito } from "@/components/mapa/MapaColombia";
import { Encabezado } from "./Encabezado";
import { BarraFiltros, MigaTerritorio, SelectorMetrica } from "./ControlesMapa";
import { TarjetasKpi } from "./TarjetasKpi";
import { Narrativas } from "./Narrativas";
import { EstadoAtencionBarra, GraficaEvolucion, GraficaTemas, Ranking, Seccion } from "./Graficas";
import { EASE } from "@/lib/ui/movimiento";
import { useEscape, vieneDeCampo } from "@/lib/ui/useEscape";

const MapaColombia = dynamic(() => import("@/components/mapa/MapaColombia"), {
  ssr: false,
  loading: () => <div className="shimmer absolute inset-0" />,
});

// El modal se descarga aparte. Se precarga al acercarse al botón (y en un rato ocioso);
// si aun así no ha llegado, un velo cubre la espera para que el clic nunca parezca muerto.
const cargarModalEjes = () => import("@/components/ejes/ModalEjes").then((m) => m.ModalEjes);
const ModalEjes = dynamic(cargarModalEjes, {
  loading: () => (
    <div role="status" className="fixed inset-0 z-50 grid place-items-center bg-[rgba(3,8,20,.9)]">
      <span className="size-3 animate-pulso rounded-full bg-gold-500" />
      <span className="sr-only">Abriendo los ejes articuladores</span>
    </div>
  ),
});

const suave = EASE.salida;

export function Tablero({ datos: datosIniciales }: { datos: DatosTablero }) {
  // Los datos llegan con la página y se pueden volver a leer sin recargarla: filtros, territorio
  // y cámara del mapa se quedan como están.
  const [datos, setDatos] = useState(datosIniciales);
  const router = useRouter();
  const [actualizando, iniciarActualizacion] = useTransition();
  const [falloActualizar, setFalloActualizar] = useState(false);
  const actualizar = useCallback(
    () =>
      iniciarActualizacion(async () => {
        try {
          const nuevos = await actualizarTablero();
          // Sesión vencida: no hay datos que mostrar, se vuelve al acceso.
          if (!nuevos) return router.replace("/acceso");
          setDatos(nuevos);
          setFalloActualizar(false);
        } catch {
          setFalloActualizar(true);
        }
      }),
    [router],
  );
  const [filtros, setFiltros] = useState<Filtros>({
    temas: [],
    canales: [],
    ejes: [],
  });
  const [metrica, setMetrica] = useState<Metrica>("aportes");
  const [departamento, setDepartamento] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [modo3d, setModo3d] = useState(false);
  const [ambito, setAmbito] = useState<Ambito>("nacional");
  const [ejesAbiertos, setEjesAbiertos] = useState(false);

  const eje = useMemo(() => ejeMeses(datos), [datos]);
  const mesEnCurso =
    eje.at(-1) ===
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date(datos.actualizadoEn))
      .slice(0, 7);
  const filtrados = useMemo(() => filtrar(datos, filtros), [datos, filtros]);
  // Sin el filtro de eje: lo comparten el modal y el bloque del Plan, que comparan los seis.
  const filtradosSinEje = useMemo(
    () => (filtros.ejes.length ? filtrar(datos, { ...filtros, ejes: [] }) : filtrados),
    [datos, filtros, filtrados],
  );
  const valores = useMemo(
    () => ({
      aportes: valoresMapa(filtrados, "aportes"),
      necesidades: valoresMapa(filtrados, "necesidades"),
      alertas: valoresMapa(filtrados, "alertas"),
    }),
    [filtrados],
  );
  const codigo = ambito === "internacional" ? null : (seleccion ?? departamento);
  const cifrasPaises = useMemo(() => cifrasPorPais(filtrados), [filtrados]);
  const resumen = useMemo(() => resumir(filtrados, codigo, eje), [filtrados, codigo, eje]);

  // La gráfica de temas es a la vez el filtro: si se filtrara a sí misma, al elegir un tema
  // quedaría una sola barra y no habría con qué comparar ni qué más marcar.
  const temasDelTerritorio = useMemo(
    () =>
      filtros.temas.length
        ? resumir(filtrar(datos, { ...filtros, temas: [] }), codigo, eje).temas
        : resumen.temas,
    [datos, filtros, codigo, eje, resumen.temas],
  );

  // Conteo de temas sin el filtro de tema, para el selector.
  const conteoTemas = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const a of filtrar(datos, {
      temas: [],
      canales: filtros.canales,
      ejes: filtros.ejes,
    }).aportes)
      conteo[a.tema ?? SIN_TEMA] = (conteo[a.tema ?? SIN_TEMA] ?? 0) + 1;
    return conteo;
  }, [datos, filtros.canales, filtros.ejes]);

  // Para el modal, y solo con él abierto: los ejes sin el filtro de eje (si no, al filtrar uno
  // los demás aparecerían en cero), pero respetando tema y canal.
  const resumenDeEjes = useMemo(
    () => (ejesAbiertos && datos.pnd ? resumenEjes(datos, filtradosSinEje, codigo) : null),
    [ejesAbiertos, datos, filtradosSinEje, codigo],
  );
  // Para que el panel pueda decir «152 de 807»: el territorio sin ningún filtro.
  const hayFiltros = filtros.temas.length + filtros.canales.length + filtros.ejes.length > 0;
  const aportesSinFiltros = useMemo(
    () =>
      hayFiltros
        ? resumir(filtrar(datos, { temas: [], canales: [], ejes: [] }), codigo, eje).aportes
        : resumen.aportes,
    [hayFiltros, datos, codigo, eje, resumen.aportes],
  );
  const filtrosDelModal = useMemo(
    () => [
      ...filtros.temas.map((t) => (t === SIN_TEMA ? "Sin clasificar" : temaDe(t).corta)),
      ...filtros.canales.map((c) => CANALES[c].etiqueta),
    ],
    [filtros.temas, filtros.canales],
  );
  const filtrosDelPanel = [
    ...filtrosDelModal,
    ...filtros.ejes.map((id) => {
      const e = datos.pnd?.ejes.find((x) => x.id === id);
      return e ? `Eje ${e.numero}` : id;
    }),
  ];

  const deptoElegido =
    ambito === "nacional" && !departamento && seleccion?.length === 2 ? seleccion : null;

  const entrar = useCallback((d: string) => {
    setDepartamento(d);
    setSeleccion(null);
  }, []);
  const salir = useCallback(() => {
    setDepartamento(null);
    setSeleccion(null);
  }, []);
  // Al mirar el mundo se sale del detalle territorial: son dos lecturas distintas.
  const cambiarAmbito = useCallback(
    (siguiente: Ambito) => {
      setAmbito(siguiente);
      if (siguiente === "internacional") salir();
    },
    [salir],
  );
  // Con el tablero ya quieto, se adelanta la descarga del modal de ejes.
  useEffect(() => {
    const espera = setTimeout(cargarModalEjes, 6000);
    return () => clearTimeout(espera);
  }, []);

  // Esc sube UN nivel: municipio → departamento → país; y del mundo, a Colombia.
  // Es la capa base: modal y popovers se apilan encima y la tapan mientras estén abiertos.
  useEscape((e) => {
    if (vieneDeCampo(e)) return;
    if (seleccion) setSeleccion(null);
    else if (departamento) salir();
    else if (ambito === "internacional") cambiarAmbito("nacional");
  });

  const alternarEje = useCallback(
    (id: string) =>
      setFiltros((f) => ({
        ...f,
        ejes: f.ejes.includes(id) ? f.ejes.filter((e) => e !== id) : [...f.ejes, id],
      })),
    [],
  );

  const nombre = (c: string) =>
    nombrePropio(
      (c.length === 2 ? datos.departamentos[c]?.nombre : datos.municipios[c]?.nombre) ?? c,
    );

  const municipiosDelDepto = departamento
    ? Object.keys(datos.municipios).filter((c) => c.startsWith(departamento)).length
    : 0;

  const ranking = useMemo(() => {
    const v = valores[metrica];
    const fuente = departamento
      ? [...v.municipios].filter(([c]) => c.startsWith(departamento))
      : [...v.departamentos];
    return fuente
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c, n]) => ({ codigo: c, nombre: nombre(c), valor: n }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valores, metrica, departamento]);

  const sinFiltros = !filtros.temas.length && !filtros.canales.length && !filtros.ejes.length;
  const coincideControl =
    sinFiltros &&
    datos.control !== null &&
    datos.control.aportes_recibidos === filtrados.aportes.length &&
    datos.control.necesidades === filtrados.expedientes.length &&
    datos.control.municipios_con_aportes === resumir(filtrados, null, []).municipiosConAportes;

  const nivel = seleccion
    ? seleccion.length === 2
      ? "Departamento"
      : "Municipio"
    : departamento
      ? "Departamento"
      : "País";

  return (
    <>
      {/* Con el modal abierto el tablero queda inerte: ni foco ni clics ni lector de pantalla. */}
      <div className="flex min-h-dvh flex-col" inert={ejesAbiertos}>
        <Encabezado
          proceso={datos.proceso.nombre}
          actualizadoEn={datos.actualizadoEn}
          hayPnd={datos.pnd !== null}
          ejesFiltrados={filtros.ejes.length}
          onEjes={() => setEjesAbiertos(true)}
          onPrecargarEjes={cargarModalEjes}
          actualizando={actualizando}
          falloActualizar={falloActualizar}
          onActualizar={actualizar}
        />

        <main className="grid flex-1 items-start gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="flex min-w-0 flex-col gap-3">
            {/* ── Mapa: el protagonista ── */}
            <motion.section
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: suave }}
              className="relative h-[72vh] min-h-[28rem] overflow-hidden rounded-lg border border-subtle bg-[#040C1D] shadow-[var(--shadow-deep)] lg:h-[calc(100dvh-7.75rem)]"
              aria-label="Mapa"
            >
              <MapaColombia
                valores={valores}
                cifrasPaises={cifrasPaises}
                metrica={metrica}
                ambito={ambito}
                onAmbito={cambiarAmbito}
                departamento={departamento}
                seleccion={seleccion}
                modo3d={modo3d}
                departamentos={datos.departamentos}
                municipios={datos.municipios}
                onSeleccionar={setSeleccion}
                onEntrar={entrar}
                onSalir={salir}
                pausado={ejesAbiertos}
                // Pista de interacción y acceso a lo cualitativo
                pie={
                  <div className="vidrio flex items-center gap-4 rounded-full py-1.5 pr-1.5 pl-1.5 text-xs whitespace-nowrap text-secondary 2xl:pl-4">
                    {ambito === "internacional" ? (
                      <>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <MousePointerClick className="size-3.5 text-accent" /> Pase el cursor:
                          cifras del país
                        </span>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <MapPin className="size-3.5 text-accent" /> Clic en Colombia: detalle
                          nacional
                        </span>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <Keyboard className="size-3.5 text-accent" /> Esc: volver a Colombia
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <MousePointerClick className="size-3.5 text-accent" /> Clic: seleccionar
                        </span>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <MapPin className="size-3.5 text-accent" /> Doble clic: explorar
                          municipios
                        </span>
                        <span className="hidden items-center gap-1.5 2xl:flex">
                          <Keyboard className="size-3.5 text-accent" /> Esc: subir un nivel
                        </span>
                      </>
                    )}
                    <button
                      onClick={() =>
                        document
                          .getElementById("narrativas")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="group pointer-events-auto flex items-center gap-1.5 rounded-full bg-action-primary px-3 py-1.5 font-bold text-action-primary-text shadow-glow-gold transition-transform hover:-translate-y-px"
                    >
                      Ver narrativas
                      <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </div>
                }
              />

              {/* Marco y viñeta */}
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_120px_rgba(3,8,20,.85)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" />

              {/* Controles superiores */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <MigaTerritorio
                    departamento={departamento}
                    nombreDepto={departamento ? nombre(departamento) : ""}
                    municipios={municipiosDelDepto}
                    ambito={ambito}
                    onSalir={() =>
                      ambito === "internacional" ? cambiarAmbito("nacional") : salir()
                    }
                  />
                  <SelectorMetrica
                    metrica={metrica}
                    onCambiar={setMetrica}
                    modo3d={modo3d}
                    onModo3d={() => setModo3d((v) => !v)}
                    ambito={ambito}
                    onAmbito={cambiarAmbito}
                  />
                </div>
                <BarraFiltros
                  filtros={filtros}
                  onCambiar={setFiltros}
                  conteoTemas={conteoTemas}
                  pnd={datos.pnd}
                />
              </div>

              {/* Bajar a municipios sin depender del doble clic (que en táctil no existe) */}
              <AnimatePresence>
                {deptoElegido && (
                  <motion.button
                    key={deptoElegido}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: suave }}
                    onClick={() => entrar(deptoElegido)}
                    className="group absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-action-primary py-2 pr-3 pl-4 text-xs font-extrabold tracking-[0.04em] whitespace-nowrap text-action-primary-text uppercase shadow-glow-gold sm:bottom-20"
                  >
                    Ver municipios de {nombre(deptoElegido)}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.section>

            {/* ── Lo cualitativo: narrativas bajo el mapa ── */}
            <Narrativas
              datos={datos}
              filtrados={filtrados}
              filtradosSinEje={filtradosSinEje}
              filtros={filtros}
              onFiltros={setFiltros}
              onQuitarTerritorio={salir}
              codigo={codigo}
              nombreTerritorio={codigo ? nombre(codigo) : "Colombia"}
            />
          </div>

          {/* ── Panel territorial ── */}
          <aside className="scroll-fino flex flex-col gap-3 lg:sticky lg:top-[4.75rem] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:pr-1 [&>*]:shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: suave }}
              className="panel relative overflow-hidden p-5"
            >
              <div className="pointer-events-none absolute inset-0 bg-[url('/linea-grafica-patria/assets/fondo-bandera-dark.png')] bg-cover bg-center opacity-[.14]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="etiqueta text-accent">Panorama · {nivel}</p>
                  <AnimatePresence>
                    {seleccion && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setSeleccion(null)}
                        className="flex items-center gap-1 rounded-full border border-default px-2 py-0.5 text-[11px] text-secondary hover:text-primary"
                      >
                        <X className="size-3" /> Quitar selección
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <motion.div
                  key={codigo ?? "pais"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: suave }}
                >
                  <h2 className="titulo-display mt-1 text-3xl font-black uppercase">
                    {codigo ? nombre(codigo) : "Colombia"}
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    {codigo && codigo.length === 5
                      ? `${nombre(codigo.slice(0, 2))} · código DIVIPOLA ${codigo}`
                      : codigo
                        ? `${formatoNumero(resumen.municipiosConAportes)} de ${formatoNumero(
                            Object.keys(datos.municipios).filter((c) => c.startsWith(codigo))
                              .length,
                          )} municipios con aportes ubicados`
                        : `${formatoNumero(resumen.municipiosConAportes)} municipios con participación registrada`}
                  </p>
                </motion.div>
                {/* El panel dice cuándo mira una parte: si no, 152 aportes parecen el total. */}
                {filtrosDelPanel.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border border-gold-600/40 bg-[rgba(255,200,0,.07)] px-3 py-2 text-xs">
                    <Filter className="size-3.5 shrink-0 text-accent" />
                    <span className="text-secondary">
                      <span className="cifra text-primary">{formatoNumero(resumen.aportes)}</span>{" "}
                      de{" "}
                      <span className="cifra text-primary">{formatoNumero(aportesSinFiltros)}</span>{" "}
                      aportes (
                      {aportesSinFiltros
                        ? Math.round((resumen.aportes * 100) / aportesSinFiltros)
                        : 0}
                      %) · {filtrosDelPanel.join(" · ")}
                    </span>
                    <button
                      onClick={() => setFiltros({ temas: [], canales: [], ejes: [] })}
                      className="ml-auto text-link hover:underline"
                    >
                      Quitar filtros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <TarjetasKpi
              r={resumen}
              nacional={codigo === null}
              metrica={metrica}
              onMetrica={setMetrica}
            />

            <Seccion titulo="¿De qué hablan?" detalle="Aportes por tema · clic para filtrar" i={1}>
              <GraficaTemas
                temas={temasDelTerritorio}
                seleccionados={filtros.temas}
                onTema={(t) =>
                  setFiltros((f) => ({
                    ...f,
                    temas: f.temas.includes(t) ? f.temas.filter((x) => x !== t) : [...f.temas, t],
                  }))
                }
              />
            </Seccion>

            <Seccion
              titulo="Evolución de la participación"
              detalle={mesEnCurso ? "Aportes por mes · el último va en curso" : "Aportes por mes"}
              i={2}
            >
              <GraficaEvolucion meses={resumen.meses} />
            </Seccion>

            <Seccion
              titulo="Estado de atención de las necesidades"
              detalle="Derivado de las actuaciones"
              i={3}
            >
              <EstadoAtencionBarra atencion={resumen.atencion} />
            </Seccion>

            <Seccion
              titulo={
                departamento ? "Municipios con más registros" : "Departamentos con más registros"
              }
              detalle={METRICAS[metrica].etiqueta}
              i={4}
            >
              <Ranking
                filas={ranking}
                accion={departamento ? "Seleccionar municipio" : "Explorar departamento"}
                onElegir={(c) => (departamento ? setSeleccion(c) : entrar(c))}
              />
            </Seccion>

            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="space-y-1.5 px-1 pb-2 text-[11px] leading-relaxed text-muted"
            >
              {coincideControl && (
                <p className="flex items-center gap-1.5 text-success">
                  <BadgeCheck className="size-3.5" /> Totales nacionales conciliados con los
                  indicadores oficiales de la base.
                </p>
              )}
              <p>
                Un aporte o necesidad en varios municipios se cuenta una sola vez por territorio.
                Los aportes sin ubicación confirmada suman al total nacional, no al mapa. Catálogo
                DIVIPOLA {datos.catalogoVersion}.
              </p>
            </motion.footer>
          </aside>
        </main>
      </div>

      <AnimatePresence>
        {resumenDeEjes && datos.pnd && (
          <ModalEjes
            pnd={datos.pnd}
            resumen={resumenDeEjes}
            nombreTerritorio={codigo ? nombre(codigo) : "Colombia"}
            filtrosActivos={filtrosDelModal}
            ejesFiltrados={filtros.ejes}
            onFiltrar={alternarEje}
            onLimpiarFiltros={() => setFiltros((f) => ({ ...f, temas: [], canales: [] }))}
            onCerrar={() => setEjesAbiertos(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
