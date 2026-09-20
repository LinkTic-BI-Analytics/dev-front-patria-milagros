"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  Link2,
  Presentation,
  Keyboard,
  MapPin,
  MousePointerClick,
  X,
} from "lucide-react";
import {
  METRICAS,
  SIN_TEMA,
  REGLAS_CONTEO,
  describirFiltros,
  fechaEnBogota,
  formatoNumero,
  nombrePropio,
  type Metrica,
} from "@/lib/datos/catalogos";
import {
  ejeMeses,
  enTerritorio,
  filtrar,
  resumir,
  valoresMapa,
  type Filtros,
} from "@/lib/datos/agregar";
import { actualizarTablero } from "@/app/(tablero)/acciones";
import { resumenEjes } from "@/lib/datos/ejes";
import { ESTADO_INICIAL, escribirEstado, type EstadoVista } from "@/lib/datos/estadoUrl";
import { titular } from "@/lib/datos/titulares";
import { PAISES_EN_EL_MAPA, cifrasPorPais } from "@/lib/datos/internacional";
import type { DatosTablero } from "@/lib/datos/tipos";
import type { Ambito } from "@/components/mapa/MapaColombia";
import { Encabezado } from "./Encabezado";
import { ControlesSuperiores } from "./ControlesMapa";
import { TarjetasKpi } from "./TarjetasKpi";
import { Narrativas, type Pestana } from "./Narrativas";
import { Presentacion, type PasoPresentacion } from "./Presentacion";
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

export function Tablero({
  datos: datosIniciales,
  inicial = ESTADO_INICIAL,
}: {
  datos: DatosTablero;
  /** Vista con la que abrir: sale de la URL, para poder compartir «lo que estoy viendo». */
  inicial?: EstadoVista;
}) {
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
  const [filtros, setFiltros] = useState<Filtros>(inicial.filtros);
  const [metrica, setMetrica] = useState<Metrica>(inicial.metrica);
  const [departamento, setDepartamento] = useState<string | null>(inicial.departamento);
  const [seleccion, setSeleccion] = useState<string | null>(inicial.seleccion);
  const [modo3d, setModo3d] = useState(inicial.modo3d);
  const [ambito, setAmbito] = useState<Ambito>(inicial.ambito);
  // El modal de ejes: abierto y, si se pidió por un eje concreto, con cuál abrir.
  const [ejesAbiertos, setEjesAbiertos] = useState<{ abierto: boolean; eje: string | null }>({
    abierto: false,
    eje: null,
  });
  // La pestaña de narrativas vive aquí: la mueven el modal de ejes y el bloque del Plan.
  const [pestana, setPestana] = useState<Pestana>(inicial.pestana);
  const [irANarrativas, setIrANarrativas] = useState(false);

  const eje = useMemo(() => ejeMeses(datos), [datos]);
  // El «hoy» del tablero es el corte de los datos: así la tendencia no cambia con el reloj de quien
  // mira ni se desfasa en otra zona horaria.
  const corte = fechaEnBogota(datos.actualizadoEn);
  const mesEnCurso = eje.at(-1) === corte.slice(0, 7);
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
  const resumen = useMemo(
    () => resumir(filtrados, codigo, eje, corte),
    [filtrados, codigo, eje, corte],
  );

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
    () => (ejesAbiertos.abierto && datos.pnd ? resumenEjes(datos, filtradosSinEje, codigo) : null),
    [ejesAbiertos.abierto, datos, filtradosSinEje, codigo],
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
    () => describirFiltros({ ...filtros, ejes: [] }, datos.pnd),
    [filtros, datos.pnd],
  );
  const filtrosDelPanel = useMemo(() => describirFiltros(filtros, datos.pnd), [filtros, datos.pnd]);

  // Lo que ocupan los controles decide el encuadre del mapa: al añadir una fila de filtros el
  // mapa respira en vez de esconder el norte del país bajo los chips.
  const [controles, setControles] = useState<HTMLDivElement | null>(null);
  const [margenes, setMargenes] = useState({ top: 72, bottom: 56 });
  useEffect(() => {
    const el = controles;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => {
      const alto = (entrada.target as HTMLElement).offsetHeight;
      const top = Math.min(Math.ceil(alto / 8) * 8, 220);
      setMargenes((m) => (m.top === top ? m : { ...m, top }));
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [controles]);

  // La URL sigue a la vista, sin ensuciar el historial: quien comparte el enlace comparte lo
  // que tiene en pantalla. `replaceState` y no `push`: cada clic en el mapa no es una página.
  const consulta = escribirEstado(
    { ambito, departamento, seleccion, metrica, modo3d, filtros, pestana },
    datos.pnd,
  );
  useEffect(() => {
    const url = `${window.location.pathname}${consulta}`;
    if (url !== `${window.location.pathname}${window.location.search}`)
      window.history.replaceState(null, "", url);
  }, [consulta]);
  const [copiado, setCopiado] = useState(false);
  const copiarEnlace = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${consulta}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: el enlace ya está en la barra.
    }
  }, [consulta]);

  // Posición del territorio entre sus pares: «152 aportes» no dice si es mucho o poco.
  const posicion = useMemo(() => {
    if (!codigo) return null;
    const v = valores[metrica];
    const lista =
      codigo.length === 2
        ? [...v.departamentos]
        : [...v.municipios].filter(([c]) => c.startsWith(codigo.slice(0, 2)));
    const ordenada = lista.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const i = ordenada.findIndex(([c]) => c === codigo);
    return i < 0 ? { puesto: 0, de: ordenada.length } : { puesto: i + 1, de: ordenada.length };
  }, [codigo, valores, metrica]);

  const conteoEjes = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const a of filtradosSinEje.aportes) {
      if (!a.eje || !enTerritorio(a.municipios, codigo)) continue;
      conteo[a.eje] = (conteo[a.eje] ?? 0) + 1;
    }
    return conteo;
  }, [filtradosSinEje, codigo]);

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
  // Desde un relato al mapa: se abre su departamento y se marca el municipio.
  const irATerritorio = useCallback((c: string) => {
    if (c.length === 5) {
      setDepartamento(c.slice(0, 2));
      setSeleccion(c);
    } else {
      setDepartamento(c);
      setSeleccion(null);
    }
    setAmbito("nacional");
    document.getElementById("tablero")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const tituloTerritorio = codigo ? nombre(codigo) : "Colombia";

  const anuncio = `${tituloTerritorio}: ${formatoNumero(resumen.aportes)} aportes, ${formatoNumero(
    resumen.necesidades,
  )} necesidades y ${formatoNumero(resumen.alertasActivas)} alertas activas.${
    filtrosDelPanel.length ? ` Filtrado por ${filtrosDelPanel.join(", ")}.` : ""
  }`;
  const [vivo, setVivo] = useState("");
  useEffect(() => {
    const espera = setTimeout(() => setVivo(anuncio), 400);
    return () => clearTimeout(espera);
  }, [anuncio]);

  const municipiosDelDepto = departamento
    ? Object.keys(datos.municipios).filter((c) => c.startsWith(departamento)).length
    : 0;
  // Municipios del catálogo en el territorio a la vista: el denominador de la cobertura.
  const municipiosDelTerritorio = useMemo(() => {
    const claves = Object.keys(datos.municipios);
    if (!codigo) return claves.length;
    if (codigo.length === 5) return 1;
    return claves.filter((c) => c.startsWith(codigo)).length;
  }, [datos.municipios, codigo]);

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

  const titulo = useMemo(
    () =>
      titular(resumen, {
        territorio: tituloTerritorio,
        lider: ranking[0] ? { nombre: ranking[0].nombre, valor: ranking[0].valor } : null,
        nacional: codigo === null,
      }),
    [resumen, tituloTerritorio, ranking, codigo],
  );

  // ── Modo presentación: el recorrido de siempre, en pasos y a mano ──
  const [presentando, setPresentando] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
  // El departamento líder se calcula aparte del ranking: ese cambia de nivel al entrar a uno,
  // y el guion de la presentación quedaría reescribiéndose a sí mismo.
  const liderNacional = useMemo(() => {
    const [mejor] = [...valores.aportes.departamentos].sort((a, b) => b[1] - a[1]);
    return mejor?.[0] ?? null;
  }, [valores]);
  const pasos: PasoPresentacion[] = useMemo(() => {
    const lider = liderNacional;
    const limpio = () => {
      setFiltros({ temas: [], canales: [], ejes: [] });
      setEjesAbiertos({ abierto: false, eje: null });
    };
    return [
      {
        titulo: "Panorama nacional",
        nota: `${formatoNumero(datos.aportes.length)} aportes de la ciudadanía, ubicados en el mapa por municipio.`,
        aplicar: () => {
          limpio();
          setAmbito("nacional");
          salir();
          setMetrica("aportes");
          setModo3d(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        titulo: "Dónde se concentra",
        nota: lider
          ? `${nombre(lider)} encabeza la participación: el mapa baja a sus municipios.`
          : "El mapa baja al detalle municipal.",
        aplicar: () => {
          limpio();
          setAmbito("nacional");
          if (lider) entrar(lider);
        },
      },
      {
        titulo: "Lo que urge",
        nota: `${formatoNumero(resumen.alertasActivas)} alertas activas: el mapa se repinta con esa cifra.`,
        aplicar: () => {
          setMetrica("alertas");
          setModo3d(true);
        },
      },
      {
        titulo: "La escucha en el mundo",
        nota: "La vista internacional queda lista para cuando la base registre país de origen.",
        aplicar: () => {
          setModo3d(false);
          setMetrica("aportes");
          cambiarAmbito("internacional");
        },
      },
      {
        titulo: "Contra el Plan",
        nota: "Cada aporte se cruza con los seis ejes del Plan Nacional de Desarrollo.",
        aplicar: () => {
          cambiarAmbito("nacional");
          setEjesAbiertos({ abierto: true, eje: null });
        },
      },
      {
        titulo: "Lo que la gente cuenta",
        nota: "Y debajo, las voces: relatos agrupados, sin que los redacte un modelo.",
        aplicar: () => {
          setEjesAbiertos({ abierto: false, eje: null });
          setPestana("panorama");
          setTimeout(
            () => document.getElementById("narrativas")?.scrollIntoView({ behavior: "smooth" }),
            120,
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.aportes.length, liderNacional, resumen.alertasActivas, cambiarAmbito, entrar, salir]);

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
      <div className="flex min-h-dvh flex-col" inert={ejesAbiertos.abierto}>
        {/* Saltos de teclado: llegar a lo cualitativo sin recorrer el mapa entero. */}
        <nav aria-label="Saltos de contenido" className="sr-only focus-within:not-sr-only">
          <ul className="flex gap-2 bg-surface-3 p-2 text-sm">
            {[
              ["#panel-territorial", "Saltar al panorama del territorio"],
              ["#narrativas", "Saltar a las narrativas"],
            ].map(([destino, texto]) => (
              <li key={destino}>
                <a
                  href={destino}
                  className="inline-block rounded-sm bg-action-primary px-3 py-1.5 font-bold text-action-primary-text"
                >
                  {texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Lo que cambió, para quien no ve el mapa. Con retardo: al arrastrar el mapa cambiaría
            en cada cuadro y el lector de pantalla no pararía de hablar. */}
        <p className="sr-only" aria-live="polite" aria-atomic>
          {vivo}
        </p>

        <Encabezado
          proceso={datos.proceso.nombre}
          actualizadoEn={datos.actualizadoEn}
          hayPnd={datos.pnd !== null}
          ejesFiltrados={filtros.ejes.length}
          onEjes={() => setEjesAbiertos({ abierto: true, eje: null })}
          onPrecargarEjes={cargarModalEjes}
          actualizando={actualizando}
          falloActualizar={falloActualizar}
          onActualizar={actualizar}
        />

        <main
          id="tablero"
          className="grid flex-1 items-start gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_25rem] lg:grid-rows-[auto_auto] xl:grid-cols-[minmax(0,1fr)_28rem]"
        >
          {/* ── Mapa: el protagonista ── */}
          <motion.section
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: suave }}
            className="@container relative h-[72svh] min-h-[28rem] min-w-0 overflow-hidden rounded-lg border border-subtle bg-mapa shadow-[var(--shadow-deep)] lg:col-start-1 lg:row-start-1 lg:h-[calc(100dvh-7.75rem)]"
            aria-label="Mapa de la participación"
          >
            {/* Los controles van antes que el mapa en el DOM: el tabulador recorre miga, ámbito,
                métrica y filtros, y solo después entra al lienzo. */}
            <ControlesSuperiores
              medidor={setControles}
              departamento={departamento}
              nombreDepto={departamento ? nombre(departamento) : ""}
              municipios={municipiosDelDepto}
              ambito={ambito}
              totalPaises={PAISES_EN_EL_MAPA}
              totalDepartamentos={Object.keys(datos.departamentos).length}
              onSalir={() => (ambito === "internacional" ? cambiarAmbito("nacional") : salir())}
              onAmbito={cambiarAmbito}
              metrica={metrica}
              onMetrica={setMetrica}
              filtros={filtros}
              onFiltros={setFiltros}
              conteoTemas={conteoTemas}
              conteoEjes={conteoEjes}
              pnd={datos.pnd}
            />

            <MapaColombia
              valores={valores}
              cifrasPaises={cifrasPaises}
              metrica={metrica}
              ambito={ambito}
              onAmbito={cambiarAmbito}
              departamento={departamento}
              seleccion={seleccion}
              modo3d={modo3d}
              onModo3d={() => setModo3d((v) => !v)}
              departamentos={datos.departamentos}
              municipios={datos.municipios}
              onSeleccionar={setSeleccion}
              onEntrar={entrar}
              onSalir={salir}
              pausado={ejesAbiertos.abierto}
              resaltado={resaltado}
              margenes={margenes}
              // Pista de interacción y acceso a lo cualitativo. Las pistas se apartan a los 8 s
              // (`data-pistas` lo pone el mapa) y vuelven con el cursor o el foco.
              pie={
                <div className="vidrio flex items-center gap-4 rounded-full p-1.5 text-xs whitespace-nowrap text-secondary @4xl:pl-4">
                  {(ambito === "internacional"
                    ? [
                        [MousePointerClick, "Pase el cursor: cifras del país"],
                        [MapPin, "Clic en Colombia: detalle nacional"],
                        [Keyboard, "Esc: volver a Colombia"],
                      ]
                    : [
                        [MousePointerClick, "Clic: seleccionar"],
                        [MapPin, "Doble clic: explorar municipios"],
                        [Keyboard, "Esc: subir un nivel"],
                      ]
                  ).map(([Icono, texto]) => {
                    const I = Icono as typeof MapPin;
                    return (
                      <span
                        key={texto as string}
                        className="hidden items-center gap-1.5 group-data-[pistas=si]/pie:@4xl:flex"
                      >
                        <I className="size-3.5 text-accent" /> {texto as string}
                      </span>
                    );
                  })}
                  <button
                    onClick={() =>
                      document.getElementById("narrativas")?.scrollIntoView({ behavior: "smooth" })
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
                  className="group absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-action-primary py-2 pr-3 pl-4 text-xs font-extrabold tracking-[0.04em] whitespace-nowrap text-action-primary-text uppercase shadow-glow-gold sm:bottom-20"
                >
                  Ver municipios de {nombre(deptoElegido)}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ── Panel territorial ── */}
          <aside
            id="panel-territorial"
            aria-label="Panorama del territorio"
            className="scroll-fino flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start lg:sticky lg:top-[4.75rem] lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:pr-1 [&>*]:shrink-0"
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: suave }}
              className="panel relative overflow-hidden p-4 md:col-span-2 lg:col-span-1"
            >
              <div className="pointer-events-none absolute inset-0 bg-[url('/linea-grafica-patria/assets/fondo-bandera-dark.png')] bg-cover bg-center opacity-[.14]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <p className="etiqueta text-accent">Panorama · {nivel}</p>
                  {/* Una sola pastilla a la vez: o dice que está filtrado, o que las cifras cuadran. */}
                  {filtrosDelPanel.length > 0 ? (
                    <button
                      onClick={() => setFiltros({ temas: [], canales: [], ejes: [] })}
                      className="flex items-center gap-1 rounded-full border border-gold-600/60 bg-[rgba(255,200,0,.1)] px-2 py-0.5 text-[11px] text-accent"
                    >
                      Vista filtrada <X className="size-3" />
                    </button>
                  ) : (
                    coincideControl && (
                      <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] text-success">
                        <BadgeCheck className="size-3" /> Cifras conciliadas
                      </span>
                    )
                  )}
                </div>
                <motion.div
                  key={codigo ?? "pais"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: suave }}
                >
                  {/* El tamaño cede ante el nombre: «Archipiélago de San Andrés» no cabe a 3xl. */}
                  <h2
                    className={`titulo-display mt-1 font-black text-balance uppercase ${
                      tituloTerritorio.length > 40
                        ? "text-lg"
                        : tituloTerritorio.length > 24
                          ? "text-xl"
                          : tituloTerritorio.length > 14
                            ? "text-2xl"
                            : "text-3xl"
                    } line-clamp-3`}
                  >
                    {tituloTerritorio}
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    {codigo && codigo.length === 5
                      ? `${nombre(codigo.slice(0, 2))} · código DIVIPOLA ${codigo}`
                      : codigo
                        ? `${formatoNumero(resumen.municipiosConAportes)} de ${formatoNumero(
                            Object.keys(datos.municipios).filter((c) => c.startsWith(codigo))
                              .length,
                          )} municipios con aportes`
                        : `${formatoNumero(resumen.municipiosConAportes)} municipios con aportes`}
                  </p>
                  {/* Un número solo no dice si es mucho: al lado va su puesto entre los demás. */}
                  {posicion &&
                    (posicion.puesto > 0 ? (
                      <p className="mt-1 text-xs text-muted">
                        <span className="cifra text-secondary">{posicion.puesto}.º</span> entre{" "}
                        <span className="cifra text-secondary">{posicion.de}</span>{" "}
                        {codigo?.length === 2 ? "departamentos" : "municipios"} con{" "}
                        {METRICAS[metrica].plural}
                        {resumen.porcentaje !== null && (
                          <>
                            {" · "}
                            <span className="cifra text-secondary">
                              {resumen.porcentaje.toFixed(1).replace(".", ",")} %
                            </span>{" "}
                            de los ubicados
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">
                        Sin {METRICAS[metrica].plural} con estos filtros
                      </p>
                    ))}
                </motion.div>
                {/* Titular: la lectura que el panel quiere que se lleve, calculada por reglas. */}
                {titulo && (
                  <p className="mt-2.5 border-t border-subtle pt-2 text-sm leading-snug text-accent">
                    {titulo.texto}
                  </p>
                )}
                <button
                  onClick={copiarEnlace}
                  className="mt-2 flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-accent"
                >
                  {copiado ? <Check className="size-3" /> : <Link2 className="size-3" />}
                  {copiado ? "Enlace copiado" : "Copiar enlace de esta vista"}
                </button>
                {filtrosDelPanel.length > 0 && (
                  <p className="mt-2.5 border-t border-subtle pt-2 text-xs text-secondary">
                    <span className="cifra text-primary">{formatoNumero(resumen.aportes)}</span> de{" "}
                    <span className="cifra text-primary">{formatoNumero(aportesSinFiltros)}</span>{" "}
                    aportes (
                    {aportesSinFiltros
                      ? Math.round((resumen.aportes * 100) / aportesSinFiltros)
                      : 0}
                    %) · <span className="text-muted">{filtrosDelPanel.join(" · ")}</span>
                  </p>
                )}
              </div>
            </motion.div>

            <TarjetasKpi
              r={resumen}
              nacional={codigo === null}
              metrica={metrica}
              onMetrica={setMetrica}
              totalMunicipios={municipiosDelTerritorio}
              canalesActivos={filtros.canales}
              onCanal={(c) =>
                setFiltros((f) => ({
                  ...f,
                  canales: f.canales.includes(c)
                    ? f.canales.filter((x) => x !== c)
                    : [...f.canales, c],
                }))
              }
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
              detalle={
                resumen.evolucion[0]?.clave.length === 10
                  ? "Aportes por semana"
                  : mesEnCurso
                    ? "Aportes por mes · el último va en curso"
                    : "Aportes por mes"
              }
              i={2}
            >
              <GraficaEvolucion evolucion={resumen.evolucion} />
            </Seccion>

            <Seccion
              titulo="Estado de atención de las necesidades"
              detalle="Derivado de las actuaciones"
              i={3}
            >
              <EstadoAtencionBarra atencion={resumen.atencion} />
            </Seccion>

            <Seccion
              titulo={`${departamento ? "Municipios" : "Departamentos"} con más ${METRICAS[metrica].plural}`}
              detalle={METRICAS[metrica].etiqueta}
              i={4}
            >
              <Ranking
                filas={ranking}
                onResaltar={setResaltado}
                accion={departamento ? "Seleccionar municipio" : "Explorar departamento"}
                onElegir={(c) => (departamento ? setSeleccion(c) : entrar(c))}
              />
            </Seccion>

            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="px-1 pb-2 text-[11px] leading-relaxed text-muted md:col-span-2 lg:col-span-1"
            >
              {/* El método está a un clic, no ocupando sitio permanente. */}
              <details className="group">
                <summary className="cursor-pointer list-none hover:text-secondary">
                  <span className="underline decoration-dotted underline-offset-2">
                    ¿Cómo se cuenta?
                  </span>
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {REGLAS_CONTEO.map((regla) => (
                    <li key={regla}>· {regla}</li>
                  ))}
                  {coincideControl && (
                    <li className="flex items-center gap-1.5 text-success">
                      <BadgeCheck className="size-3.5" /> Totales nacionales conciliados con los
                      indicadores oficiales de la base.
                    </li>
                  )}
                </ul>
              </details>
              <p className="mt-1.5">Catálogo DIVIPOLA {datos.catalogoVersion}.</p>
              <button
                onClick={() => {
                  pasos[0].aplicar();
                  setPresentando(true);
                }}
                className="mt-2 flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-accent"
              >
                <Presentation className="size-3" /> Modo presentación
              </button>
            </motion.footer>
          </aside>

          {/* ── Lo cualitativo: narrativas bajo el mapa ── */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <Narrativas
              datos={datos}
              filtrados={filtrados}
              filtradosSinEje={filtradosSinEje}
              filtros={filtros}
              onFiltros={setFiltros}
              onQuitarTerritorio={salir}
              onTerritorio={irATerritorio}
              onAbrirEje={(id) => setEjesAbiertos({ abierto: true, eje: id })}
              pestana={pestana}
              onPestana={setPestana}
              codigo={codigo}
              nombreTerritorio={tituloTerritorio}
            />
          </div>
        </main>
      </div>

      {/* El scroll a las narrativas espera a que el modal termine de salir: mientras está
          abierto el `<body>` no hace scroll y el salto se perdería. */}
      <AnimatePresence>
        {presentando && <Presentacion pasos={pasos} onSalir={() => setPresentando(false)} />}
      </AnimatePresence>

      <AnimatePresence
        onExitComplete={() => {
          if (!irANarrativas) return;
          setIrANarrativas(false);
          document.getElementById("narrativas")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {resumenDeEjes && datos.pnd && (
          <ModalEjes
            pnd={datos.pnd}
            resumen={resumenDeEjes}
            ejeInicial={ejesAbiertos.eje}
            nombreTerritorio={tituloTerritorio}
            nombreDe={nombre}
            filtrosActivos={filtrosDelModal}
            ejesFiltrados={filtros.ejes}
            onFiltrar={alternarEje}
            onLimpiarFiltros={() => setFiltros((f) => ({ ...f, temas: [], canales: [] }))}
            onVerNarrativas={(id) => {
              setFiltros((f) => (f.ejes.includes(id) ? f : { ...f, ejes: [...f.ejes, id] }));
              setPestana("narrativas");
              setIrANarrativas(true);
              setEjesAbiertos({ abierto: false, eje: null });
            }}
            onCerrar={() => setEjesAbiertos({ abierto: false, eje: null })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
