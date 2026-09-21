"use client";

import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, type MotionValue } from "motion/react";
import { Box, Globe, Layers, MapPinOff, MousePointerClick, Pause, Play } from "lucide-react";
import cajas from "@/lib/geo/cajas.json";
import { version as versionGeo } from "@/lib/geo/version.json";
import {
  METRICAS,
  RAMPA_MAPA,
  formatoNumero,
  nombrePropio,
  type Metrica,
} from "@/lib/datos/catalogos";
import type { ValoresMapa } from "@/lib/datos/agregar";
import { COLOMBIA_ISO, SIN_DATOS, type CifrasPais } from "@/lib/datos/internacional";
import type { DatosTablero } from "@/lib/datos/tipos";
import { RELLENO_VACIO, colorPorT, estado, exp, reducirMovimiento } from "./estilo";
import { RESORTE } from "@/lib/ui/movimiento";
import {
  CAPAS_PAISES,
  agregarCapasPaises,
  continenteEs,
  crearGiro,
  zoomGlobo,
  type LibreGlobo,
  type MapaPaises,
  type PropsPais,
} from "./paises";

export type Ambito = "nacional" | "internacional";

type Props = {
  valores: Record<Metrica, ValoresMapa>;
  cifrasPaises: Map<string, CifrasPais>;
  metrica: Metrica;
  ambito: Ambito;
  onAmbito: (ambito: Ambito) => void;
  departamento: string | null;
  seleccion: string | null;
  modo3d: boolean;
  departamentos: DatosTablero["departamentos"];
  municipios: DatosTablero["municipios"];
  onSeleccionar: (codigo: string | null) => void;
  onEntrar: (dpto: string) => void;
  onSalir: () => void;
  onModo3d: () => void;
  /** Hay algo encima del mapa (el modal de ejes): el globo no gira a espaldas de nadie. */
  pausado?: boolean;
  /** Alto real de los controles de arriba y de la franja de abajo, medido por el Tablero. */
  margenes?: { top: number; bottom: number };
  /** Cuántos países y departamentos hay en el catálogo, para la leyenda y la miga. */
  totalPaises?: number;
  /** Territorio señalado desde fuera (el ranking del panel): se ilumina en el mapa. */
  resaltado?: string | null;
  /** Lo que acompaña a la leyenda en la franja inferior (pista de uso, accesos). */
  pie?: React.ReactNode;
};

type Objetivo = { fuente: "departamentos" | "municipios" | "paises"; codigo: string; dpto: string };

/**
 * ¿Se puede pintar? Basta con que estén nuestras capas: si el mapa se rehízo (React puede
 * volver a correr los efectos), todavía no existen y hay que esperar a que vuelva a cargar.
 * No se usa `isStyleLoaded()`: justo después de agregar las capas devuelve falso y el efecto
 * se saltaría para siempre, dejando el mapa sin colores.
 */
const mapaListo = (map: mapboxgl.Map | null): map is mapboxgl.Map =>
  Boolean(map && map.getLayer("dep-relleno") && map.getLayer("pais-relleno"));

/** Encuadre del globo: centro que deja a Colombia a la vista y franja libre bajo los controles. */
const CENTRO_MUNDO: [number, number] = [-62, 8];
const libreGlobo = (margenes: Margenes): LibreGlobo => ({
  top: margenes.top + 8,
  bottom: 8,
});
const rellenoGlobo = (libre: LibreGlobo) => ({
  top: libre.top,
  bottom: libre.bottom,
  left: 0,
  right: 0,
});
const TOOLTIP = { ancho: 240, alto: 214, margen: 18 };
type FC = FeatureCollection<Geometry, { codigo: string; dpto?: string }>;

// Territorio continental: San Andrés queda a la vista en el borde sin encoger el país.
const SIN_MUNICIPIOS: FC = { type: "FeatureCollection", features: [] };

const COLOMBIA: mapboxgl.LngLatBoundsLike = [
  [-79.1, -4.25],
  [-66.85, 12.5],
];
type Margenes = { top: number; bottom: number };
const MARGENES_BASE: Margenes = { top: 72, bottom: 56 };

/**
 * Padding del encuadre. Sale de lo que miden los controles, no de números fijos: al añadir un
 * filtro la barra crece una fila y «La Guajira» quedaba debajo de los chips.
 */
function relleno(tamano: { width: number; height: number }, margenes: Margenes = MARGENES_BASE) {
  const lado = tamano.width < 640 ? 20 : 40;
  return {
    top: margenes.top + 12,
    bottom: Math.max(24, margenes.bottom + 12),
    left: lado,
    right: lado,
  };
}

/** Vuela al territorio vigente con el padding que dejan los controles. */
function encuadrar(
  map: mapboxgl.Map,
  {
    departamento,
    modo3d,
    margenes,
    duracion,
  }: { departamento: string | null; modo3d: boolean; margenes?: Margenes; duracion: number },
) {
  const caja = departamento ? (cajas as Record<string, number[]>)[departamento] : null;
  map.fitBounds(
    caja
      ? [
          [caja[0], caja[1]],
          [caja[2], caja[3]],
        ]
      : COLOMBIA,
    {
      padding: relleno(map.getContainer().getBoundingClientRect(), margenes),
      duration: reducirMovimiento() ? 0 : duracion,
      pitch: modo3d ? 52 : 0,
      bearing: modo3d ? -14 : 0,
      essential: true,
      maxZoom: 9.5,
    },
  );
}

/** Viste el estilo base de Mapbox con el navy de la marca y apaga lo que distrae. */
const CAPAS_ETIQUETA = ["country-label", "continent-label", "water-point-label"];

function vestirMapaBase(map: mapboxgl.Map) {
  const visibles = new Set(CAPAS_ETIQUETA);
  for (const capa of map.getStyle()?.layers ?? []) {
    const { id, type } = capa;
    try {
      if (type === "background") map.setPaintProperty(id, "background-color", "#081733");
      else if (id === "water") map.setPaintProperty(id, "fill-color", "#040C1D");
      else if (id === "land-structure-polygon") map.setPaintProperty(id, "fill-color", "#081733");
      else if (id === "admin-0-boundary" || id === "admin-0-boundary-disputed")
        map.setPaintProperty(id, "line-color", "rgba(237,241,247,0.28)");
      else if (id === "admin-0-boundary-bg")
        map.setPaintProperty(id, "line-color", "rgba(4,12,29,0.6)");
      else if (visibles.has(id)) {
        map.setPaintProperty(id, "text-color", "rgba(237,241,247,0.3)");
        map.setPaintProperty(id, "text-halo-color", "#06142A");
        // El tablero está en español: «Brasil», no «Brazil». El estilo trae `name_es`; si una
        // capa no lo tuviera, `coalesce` deja el nombre original.
        map.setLayoutProperty(id, "text-field", exp(["coalesce", ["get", "name_es"], ["get", "name"]]));
      } else map.setLayoutProperty(id, "visibility", "none");
    } catch {
      // Una capa del estilo que no admite la propiedad: se deja como viene.
    }
  }
  map.setFog({
    color: "rgb(11, 29, 66)",
    "high-color": "rgb(0, 49, 137)",
    "horizon-blend": 0.05,
    "space-color": "rgb(3, 8, 20)",
    "star-intensity": 0.5,
    range: [-1, 10],
  });
}

function agregarCapas(map: mapboxgl.Map, dep: FC, mun: FC) {
  map.addSource("departamentos", { type: "geojson", data: dep, promoteId: "codigo" });
  map.addSource("municipios", { type: "geojson", data: mun, promoteId: "codigo" });
  map.addSource("cifras", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

  const ninguno = exp(["==", ["get", "dpto"], "__"]);

  // Departamentos
  map.addLayer({
    id: "dep-relleno",
    type: "fill",
    source: "departamentos",
    paint: {
      "fill-color": colorPorT,
      "fill-opacity": exp(["case", estado("activo"), 0, estado("atenuado"), 0.22, 0.9]),
    },
  });
  map.addLayer({
    id: "dep-brillo",
    type: "fill",
    source: "departamentos",
    paint: {
      "fill-color": "#FFFFFF",
      "fill-opacity": exp(["case", estado("hover"), 0.12, 0]),
    },
  });
  map.addLayer({
    id: "dep-borde",
    type: "line",
    source: "departamentos",
    paint: {
      "line-color": "rgba(237,241,247,0.3)",
      "line-width": exp(["interpolate", ["linear"], ["zoom"], 4, 0.6, 8, 1.4]),
    },
  });

  // Municipios del departamento abierto
  map.addLayer({
    id: "mun-relleno",
    type: "fill",
    source: "municipios",
    filter: ninguno,
    paint: {
      "fill-color": colorPorT,
      "fill-opacity": 0,
      "fill-opacity-transition": { duration: 700, delay: 350 },
    },
  });
  map.addLayer({
    id: "mun-brillo",
    type: "fill",
    source: "municipios",
    filter: ninguno,
    paint: { "fill-color": "#FFFFFF", "fill-opacity": exp(["case", estado("hover"), 0.14, 0]) },
  });
  map.addLayer({
    id: "mun-borde",
    type: "line",
    source: "municipios",
    filter: ninguno,
    paint: {
      "line-color": "rgba(237,241,247,0.16)",
      "line-width": exp(["interpolate", ["linear"], ["zoom"], 6, 0.4, 10, 1]),
      "line-opacity": 0,
      "line-opacity-transition": { duration: 700, delay: 350 },
    },
  });

  // Extrusiones (modo 3D). Nacen aplastadas: al encenderlas crecen desde el suelo mientras la
  // cámara se inclina, en vez de aparecer de golpe a su altura final.
  const colorTorre = exp(["case", estado("hover"), "#FFE58A", colorPorT]);
  map.addLayer({
    id: "dep-3d",
    type: "fill-extrusion",
    source: "departamentos",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": colorTorre,
      "fill-extrusion-height": exp(["*", ["coalesce", ["feature-state", "h"], 0], 300000]),
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-vertical-scale": 0,
      "fill-extrusion-vertical-scale-transition": { duration: 900, delay: 250 },
    },
  });
  map.addLayer({
    id: "mun-3d",
    type: "fill-extrusion",
    source: "municipios",
    filter: ninguno,
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": colorTorre,
      "fill-extrusion-height": exp(["*", ["coalesce", ["feature-state", "h"], 0], 50000]),
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-vertical-scale": 0,
      "fill-extrusion-vertical-scale-transition": { duration: 900, delay: 250 },
    },
  });

  // Velo de relevo: las propiedades con `feature-state` no transicionan, así que un cambio de
  // métrica salta de color. Estas capas son constantes, sí transicionan, y cubren el salto.
  for (const [prefijo, fuente, filtro] of [
    ["dep", "departamentos", undefined],
    ["mun", "municipios", ninguno],
  ] as const) {
    map.addLayer({
      id: `${prefijo}-velo`,
      type: "fill",
      source: fuente,
      ...(filtro ? { filter: filtro } : {}),
      paint: {
        "fill-color": "#081733",
        "fill-opacity": 0,
        "fill-opacity-transition": { duration: 140 },
      },
    });
  }

  // Resplandor y contorno de hover / selección
  for (const [fuente, prefijo, filtro] of [
    ["departamentos", "dep", undefined],
    ["municipios", "mun", ninguno],
  ] as const) {
    map.addLayer({
      id: `${prefijo}-resplandor`,
      type: "line",
      source: fuente,
      ...(filtro ? { filter: filtro } : {}),
      paint: {
        "line-color": "#FFC800",
        "line-width": 9,
        "line-blur": 9,
        "line-opacity": exp([
          "case",
          estado("sel"),
          0.85,
          estado("activo"),
          0.7,
          estado("hover"),
          0.45,
          0,
        ]),
      },
    });
    map.addLayer({
      id: `${prefijo}-contorno`,
      type: "line",
      source: fuente,
      ...(filtro ? { filter: filtro } : {}),
      paint: {
        "line-color": "#FFE58A",
        "line-width": 1.8,
        "line-opacity": exp([
          "case",
          estado("sel"),
          1,
          estado("activo"),
          0.9,
          estado("hover"),
          0.75,
          0,
        ]),
      },
    });
  }

  // Cifras sobre el mapa
  map.addLayer({
    id: "cifras-texto",
    type: "symbol",
    source: "cifras",
    layout: {
      "text-field": exp([
        "format",
        ["to-string", ["get", "valor"]],
        { "font-scale": 1 },
        "\n",
        {},
        ["get", "nombre"],
        {
          "font-scale": 0.62,
          "text-font": exp(["literal", ["DIN Pro Medium", "Arial Unicode MS Regular"]]),
        },
      ]),
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": exp(["interpolate", ["linear"], ["get", "t"], 0, 13, 1, 19]),
      "text-line-height": 1.1,
      "symbol-sort-key": exp(["-", 0, ["get", "valor"]]),
      "text-padding": 4,
    },
    paint: {
      "text-color": "#F4F7FB",
      "text-halo-color": "rgba(4,12,29,0.92)",
      "text-halo-width": 1.6,
      "text-halo-blur": 0.4,
      "text-opacity-transition": { duration: 500 },
    },
  });
}

export default function MapaColombia(props: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<mapboxgl.Map | null>(null);
  const geoRef = useRef<{ dep: FC; mun: FC; paises: MapaPaises } | null>(null);
  const giroRef = useRef<ReturnType<typeof crearGiro> | null>(null);
  // Alguien movió la cámara a mano: el reencuadre automático deja de mandar hasta que se cambie
  // de nivel, de ámbito o de vista.
  const camaraManual = useRef(false);
  const pintadoAlguna = useRef(false);
  const introRef = useRef(false);
  const margenesPrevios = useRef(MARGENES_BASE);
  const [paises, setPaises] = useState<Map<string, PropsPais>>(new Map());
  const ultimo = useRef(props);
  const velo = useRef<HTMLDivElement>(null);
  const ambitoPrevio = useRef<Ambito>("nacional");
  const [capasListas, setCapasListas] = useState(false);
  const [municipiosListos, setMunicipiosListos] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [introTerminada, setIntroTerminada] = useState(false);
  // El tooltip sigue al cursor con valores de movimiento: React solo se entera cuando cambia
  // el territorio bajo el cursor, no en cada píxel.
  const [bajoCursor, setBajoCursor] = useState<Objetivo | null>(null);
  const xCursor = useMotionValue(0);
  const yCursor = useMotionValue(0);
  const xTooltip = useSpring(xCursor, RESORTE.tooltip);
  const yTooltip = useSpring(yCursor, RESORTE.tooltip);
  const tooltip = useRef({ xCursor, yCursor, xTooltip, yTooltip });
  const [giroPausado, setGiroPausado] = useState(false);
  // Las pistas de uso se dicen y se apartan: vuelven con el cursor o el foco sobre la franja.
  const [tecladoEnMapa, setTecladoEnMapa] = useState(false);

  useEffect(() => {
    ultimo.current = props;
  });

  // Las pistas se dicen y se apartan: aparecen al aterrizar y en cada cambio de nivel, y a los
  // 8 s se quitan de en medio. Vuelven mientras el cursor o el foco estén sobre la franja.
  // El «mostrar» se ajusta al renderizar (patrón de estado derivado de props), no en un efecto:
  // así no hay un render de más por cada cambio de territorio.
  const claveNivel = `${props.ambito}|${props.departamento}|${introTerminada}`;
  const [pistas, setPistas] = useState({ clave: claveNivel, ver: false, fijas: false });
  if (pistas.clave !== claveNivel)
    setPistas({ clave: claveNivel, ver: introTerminada, fijas: false });
  useEffect(() => {
    if (!pistas.ver || pistas.fijas) return;
    const reloj = setTimeout(() => setPistas((p) => ({ ...p, ver: false })), 8000);
    return () => clearTimeout(reloj);
  }, [pistas]);
  const asomarPistas = (fijar: boolean) =>
    setPistas((p) => ({ ...p, ver: fijar, fijas: fijar }));

  // Montaje: mapa, capas, intro e interacción.
  useEffect(() => {
    // React puede volver a montar los efectos (modo estricto, Suspense): un solo mapa por contenedor.
    if (!contenedor.current || mapaRef.current) return;
    // Aquí no hay mapa nuestro vivo, así que lo que quede dentro es el lienzo de una instancia
    // anterior que React desmontó (modo estricto, recarga en caliente). Mapbox avisa de ello y
    // pierde interactividad: se deja el contenedor limpio antes de crear el nuevo.
    contenedor.current.replaceChildren();
    let cancelado = false;
    const limpiezas: (() => void)[] = [];
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    const map = new mapboxgl.Map({
      container: contenedor.current,
      style: process.env.NEXT_PUBLIC_MAPBOX_STYLE,
      projection: "globe",
      center: [-115, 18],
      zoom: 1.15,
      doubleClickZoom: false,
      attributionControl: false,
      // La página tiene scroll (narrativas debajo): el zoom con rueda pide Ctrl/⌘.
      cooperativeGestures: true,
      locale: {
        "ScrollZoomBlocker.CtrlMessage": "Use Ctrl + rueda para acercar el mapa",
        "ScrollZoomBlocker.CmdMessage": "Use ⌘ + rueda para acercar el mapa",
        "TouchPanBlocker.Message": "Use dos dedos para mover el mapa",
      },
      maxPitch: 65,
    });
    mapaRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

    // La versión va en la URL: el navegador puede cachear la cartografía un año y, cuando se
    // regenera, pide la nueva sola.
    const traer = <T,>(nombre: string) =>
      fetch(`/data/geo/${nombre}.json?v=${versionGeo}`).then((r) => {
        if (!r.ok) throw new Error(`${nombre}: ${r.status}`);
        return r.json() as Promise<T>;
      });
    const geo = Promise.all([
      traer<FC>("departamentos"),
      traer<MapaPaises>("paises"),
    ]);
    // Los municipios pesan 2 MB y no hacen falta hasta entrar a un departamento: bajan en
    // paralelo, pero la entrada no los espera.
    const geoMunicipios = traer<FC>("municipios");
    geo.catch(() => !cancelado && setFallo(true));
    geoMunicipios.catch(() => {});

    // Un fallo antes de tener estilo (token, red) deja el lienzo en negro: se dice, no se calla.
    let conEstilo = false;
    map.on("error", () => !conEstilo && !cancelado && setFallo(true));
    map.on("style.load", () => {
      conEstilo = true;
      vestirMapaBase(map);
    });

    map.on("load", async () => {
      // Un solo vuelo: un primer `easeTo` lineal que luego cortaba el `fitBounds` quebraba la
      // trayectoria. La geometría ligera (sin municipios) llega antes que el estilo casi siempre.
      let dep: FC, mundo: MapaPaises;
      try {
        [dep, mundo] = await geo;
      } catch {
        return;
      }
      if (cancelado) return;
      const geometria = { dep, mun: SIN_MUNICIPIOS, paises: mundo };
      geoRef.current = geometria;
      agregarCapas(map, dep, SIN_MUNICIPIOS);
      geoMunicipios
        .then((mun) => {
          if (cancelado || geoRef.current !== geometria) return;
          geometria.mun = mun;
          (map.getSource("municipios") as mapboxgl.GeoJSONSource | undefined)?.setData(mun);
          setMunicipiosListos(true);
        })
        .catch(() => {});
      agregarCapasPaises(map, mundo);
      giroRef.current = crearGiro(map);
      setPaises(new Map(mundo.features.map((f) => [f.properties.codigo, f.properties])));
      setCapasListas(true);

      // Del globo a Colombia. Se vuela directo: encadenar el "moveend" del giro de entrada
      // dejaba el mapa esperando un evento que, según la carga, podía no llegar.
      map.fitBounds(COLOMBIA, {
        padding: relleno(map.getContainer().getBoundingClientRect(), ultimo.current.margenes),
        duration: reducirMovimiento() ? 0 : 2800,
        curve: 1.2,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        essential: true,
      });
      const aterrizado = setTimeout(() => {
        if (cancelado) return;
        introRef.current = true;
        setIntroTerminada(true);
      }, reducirMovimiento() ? 0 : 2900);
      limpiezas.push(() => clearTimeout(aterrizado));
    });

    // Qué hay bajo el cursor, en orden de prioridad.
    const objetivo = (p: mapboxgl.PointLike): Objetivo | null => {
      const { departamento, ambito } = ultimo.current;
      if (ambito === "internacional") {
        if (!map.getLayer("pais-relleno")) return null;
        const f = map.queryRenderedFeatures(p, { layers: ["pais-relleno"] })[0];
        const codigo = String(f?.properties?.codigo ?? "");
        return codigo ? { fuente: "paises", codigo, dpto: codigo } : null;
      }
      const capas = departamento
        ? ["mun-3d", "mun-relleno", "dep-relleno"]
        : ["dep-3d", "dep-relleno"];
      const existentes = capas.filter((c) => map.getLayer(c));
      for (const f of map.queryRenderedFeatures(p, { layers: existentes })) {
        const codigo = String(f.properties?.codigo ?? "");
        if (!codigo) continue;
        if (f.source === "municipios") {
          return { fuente: "municipios", codigo, dpto: String(f.properties?.dpto) };
        }
        if (codigo === departamento) continue;
        return { fuente: "departamentos", codigo, dpto: codigo };
      }
      return null;
    };

    let hover: Objetivo | null = null;
    const marcarHover = (siguiente: Objetivo | null) => {
      if (hover?.codigo === siguiente?.codigo) return;
      if (hover) map.setFeatureState({ source: hover.fuente, id: hover.codigo }, { hover: false });
      if (siguiente)
        map.setFeatureState({ source: siguiente.fuente, id: siguiente.codigo }, { hover: true });
      hover = siguiente;
    };

    // Hover: como mucho una consulta al mapa por cuadro, y sin tooltip donde no hay cursor.
    const sinHover = window.matchMedia("(hover: none)").matches;
    let pendiente: mapboxgl.Point | null = null;
    let cuadro = 0;
    let visible = false;
    let quieto: ReturnType<typeof setTimeout> | undefined;

    const ocultar = () => {
      marcarHover(null);
      visible = false;
      setBajoCursor(null);
    };
    const atender = () => {
      cuadro = 0;
      const p = pendiente;
      if (!p || !map.getLayer("dep-relleno")) return;
      const o = objetivo(p);
      const cambio = o?.codigo !== hover?.codigo;
      marcarHover(o);
      map.getCanvas().style.cursor = o ? "pointer" : "";

      const { ambito, cifrasPaises, metrica } = ultimo.current;
      if (ambito === "internacional") {
        // El globo solo se detiene donde hay algo que leer; sobre el resto sigue su curso.
        const conDatos = o ? (cifrasPaises.get(o.codigo)?.[metrica] ?? 0) > 0 : false;
        if (conDatos) giroRef.current?.frenarSuave();
        else giroRef.current?.soltar(600);
        // Cursor aparcado: a los 4 s el globo retoma el giro y el tooltip se retira.
        clearTimeout(quieto);
        quieto = setTimeout(() => {
          giroRef.current?.soltar(0);
          ocultar();
        }, 4000);
      }

      if (!o) {
        if (visible) ocultar();
        return;
      }
      const { clientWidth: ancho, clientHeight: alto } = map.getContainer();
      const x =
        p.x + TOOLTIP.ancho + 2 * TOOLTIP.margen > ancho
          ? p.x - TOOLTIP.ancho - TOOLTIP.margen
          : p.x + TOOLTIP.margen;
      const y =
        p.y + TOOLTIP.alto + TOOLTIP.margen > alto ? p.y - TOOLTIP.alto : p.y + TOOLTIP.margen;
      const t = tooltip.current;
      t.xCursor.set(x);
      t.yCursor.set(y);
      if (!visible) {
        // Al reaparecer nace en su sitio: no cruza el mapa volando desde la posición anterior.
        t.xTooltip.jump(x);
        t.yTooltip.jump(y);
        visible = true;
      }
      if (cambio) setBajoCursor(o);
    };

    map.on("mousemove", (e) => {
      if (sinHover) return;
      pendiente = e.point;
      if (!cuadro) cuadro = requestAnimationFrame(atender);
    });
    map.on("mouseout", () => {
      pendiente = null;
      clearTimeout(quieto);
      ocultar();
      giroRef.current?.soltar(0);
    });
    limpiezas.push(() => {
      cancelAnimationFrame(cuadro);
      clearTimeout(quieto);
    });

    map.on("click", (e) => {
      if (!map.getLayer("dep-relleno")) return;
      // En el mundo no hay selección: se mira y, sobre Colombia, se entra al detalle.
      if (ultimo.current.ambito === "internacional") {
        // Un clic basta: el doble clic no existe en táctil y nadie lo adivina con ratón.
        if (objetivo(e.point)?.codigo === COLOMBIA_ISO) ultimo.current.onAmbito("nacional");
        return;
      }
      const o = objetivo(e.point);
      const { departamento, onSeleccionar } = ultimo.current;
      // Con un departamento abierto, los vecinos atenuados solo se exploran con doble clic.
      if (o && departamento && o.fuente === "departamentos") return;
      onSeleccionar(o?.codigo ?? null);
    });

    map.on("dblclick", (e) => {
      e.preventDefault();
      if (!map.getLayer("dep-relleno")) return;
      const o = objetivo(e.point);
      const { departamento, onEntrar, onSalir, ambito, onAmbito } = ultimo.current;
      if (ambito === "internacional") {
        if (o?.codigo === COLOMBIA_ISO) onAmbito("nacional");
        return;
      }
      if (!o) return onSalir();
      if (o.dpto !== departamento) onEntrar(o.dpto);
    });

    // Un movimiento hecho a mano manda sobre el reencuadre automático.
    const aMano = (e: object) => {
      if ("originalEvent" in e && e.originalEvent) camaraManual.current = true;
    };
    map.on("dragend", () => (camaraManual.current = true));
    map.on("zoomend", aMano);
    map.on("rotateend", aMano);
    map.on("pitchend", aMano);

    // El teclado mueve el mapa cuando el lienzo tiene el foco: hay que decirlo.
    const lienzo = map.getCanvas();
    const conFoco = () => setTecladoEnMapa(true);
    const sinFoco = () => setTecladoEnMapa(false);
    lienzo.addEventListener("focus", conFoco);
    lienzo.addEventListener("blur", sinFoco);
    limpiezas.push(() => {
      lienzo.removeEventListener("focus", conFoco);
      lienzo.removeEventListener("blur", sinFoco);
    });

    let reencuadre: ReturnType<typeof setTimeout> | undefined;
    const observador = new ResizeObserver(() => {
      map.resize();
      clearTimeout(reencuadre);
      reencuadre = setTimeout(() => {
        if (camaraManual.current || mapaRef.current !== map) return;
        if (ultimo.current.ambito === "internacional") {
          const { clientWidth: w, clientHeight: h } = map.getContainer();
          const libre = libreGlobo(ultimo.current.margenes ?? MARGENES_BASE);
          giroRef.current?.fijarZoom(zoomGlobo(w, h, libre), rellenoGlobo(libre));
        } else if (introRef.current)
          encuadrar(map, { ...ultimo.current, margenes: ultimo.current.margenes, duracion: 300 });
      }, 200);
    });
    limpiezas.push(() => clearTimeout(reencuadre));
    observador.observe(contenedor.current);

    return () => {
      cancelado = true;
      for (const limpiar of limpiezas) limpiar();
      observador.disconnect();
      giroRef.current?.destruir();
      giroRef.current = null;
      geoRef.current = null;
      map.remove();
      mapaRef.current = null;
      // El próximo mapa arranca de cero: sin esto, los efectos pintarían sobre un estilo a medio cargar.
      setCapasListas(false);
      setMunicipiosListos(false);
      setIntroTerminada(false);
    };
  }, []);

  // Colores y cifras según métrica, filtros y nivel.
  const {
    valores,
    cifrasPaises,
    ambito,
    metrica,
    departamento,
    seleccion,
    departamentos,
    municipios,
  } = props;
  useEffect(() => {
    const map = mapaRef.current;
    const geo = geoRef.current;
    if (!mapaListo(map) || !geo || !capasListas) return;
    const v = valores[metrica];

    const pintar = () => {
    if (!mapaListo(map) || mapaRef.current !== map) return;

    if (ambito === "internacional") {
      const maxPais = Math.max(0, ...[...cifrasPaises.values()].map((c) => c[metrica]));
      for (const f of geo.paises.features) {
        const n = cifrasPaises.get(f.properties.codigo)?.[metrica] ?? 0;
        map.setFeatureState(
          { source: "paises", id: f.properties.codigo },
          {
            t: n > 0 && maxPais ? Math.sqrt(n / maxPais) : -1,
            activo: f.properties.codigo === COLOMBIA_ISO,
          },
        );
      }
      const conDatos: Feature[] = [];
      for (const f of geo.paises.features) {
        const n = cifrasPaises.get(f.properties.codigo)?.[metrica] ?? 0;
        if (n === 0) continue;
        conDatos.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [f.properties.lon, f.properties.lat] },
          properties: { valor: n, t: 1, nombre: f.properties.nombre },
        });
      }
      (map.getSource("cifras") as mapboxgl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: conDatos,
      });
      return;
    }

    // Color con raíz cuadrada (los conteos son muy desiguales); altura 3D lineal y comparable.
    const maxDep = Math.max(0, ...v.departamentos.values());
    for (const f of geo.dep.features) {
      const n = v.departamentos.get(f.properties.codigo) ?? 0;
      map.setFeatureState(
        { source: "departamentos", id: f.properties.codigo },
        { t: n > 0 ? Math.sqrt(n / maxDep) : -1, h: n > 0 ? n / maxDep : 0 },
      );
    }

    const delDepto = departamento
      ? geo.mun.features.filter((f) => f.properties.dpto === departamento)
      : [];
    const maxMun = Math.max(0, ...delDepto.map((f) => v.municipios.get(f.properties.codigo) ?? 0));
    for (const f of delDepto) {
      const n = v.municipios.get(f.properties.codigo) ?? 0;
      map.setFeatureState(
        { source: "municipios", id: f.properties.codigo },
        { t: n > 0 ? Math.sqrt(n / maxMun) : -1, h: n > 0 ? n / maxMun : 0 },
      );
    }

    // Cifras: centroides oficiales de la base (DIVIPOLA), no del polígono.
    const puntos: Feature[] = [];
    if (departamento) {
      for (const [codigo, n] of v.municipios) {
        const t = municipios[codigo];
        if (!codigo.startsWith(departamento) || !t?.lat || !t?.lon || n === 0) continue;
        puntos.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [t.lon, t.lat] },
          properties: { valor: n, t: Math.sqrt(n / maxMun), nombre: nombrePropio(t.nombre) },
        });
      }
    } else {
      for (const [codigo, n] of v.departamentos) {
        const t = departamentos[codigo];
        if (!t?.lat || !t?.lon || n === 0) continue;
        puntos.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [t.lon, t.lat] },
          properties: { valor: n, t: Math.sqrt(n / maxDep), nombre: nombrePropio(t.nombre) },
        });
      }
    }
    (map.getSource("cifras") as mapboxgl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: puntos,
    });
    };

    const velar = (opacidad: number) => {
      if (mapaRef.current !== map) return;
      for (const capa of ["dep-velo", "mun-velo"])
        if (map.getLayer(capa)) map.setPaintProperty(capa, "fill-opacity", opacidad);
    };

    // La primera pintura no relevaba nada: se pinta y ya. Después, el velo sube, los colores
    // cambian detrás y el velo baja: así un cambio de métrica funde en vez de saltar.
    if (!pintadoAlguna.current || reducirMovimiento()) {
      pintadoAlguna.current = true;
      pintar();
      return;
    }
    velar(0.55);
    const relevo = setTimeout(() => {
      pintar();
      velar(0);
    }, 150);
    return () => {
      clearTimeout(relevo);
      pintar();
      velar(0);
    };
  }, [
    valores,
    cifrasPaises,
    ambito,
    metrica,
    departamento,
    capasListas,
    municipiosListos,
    departamentos,
    municipios,
  ]);

  // Resaltado desde el panel: pasar el cursor por el ranking enciende ese territorio.
  const { resaltado = null } = props;
  useEffect(() => {
    const map = mapaRef.current;
    if (!mapaListo(map) || !capasListas || !resaltado || ambito === "internacional") return;
    const id = { source: resaltado.length === 2 ? "departamentos" : "municipios", id: resaltado };
    map.setFeatureState(id, { hover: true });
    return () => {
      if (mapaRef.current === map && map.getSource(id.source))
        map.setFeatureState(id, { hover: false });
    };
  }, [resaltado, capasListas, ambito]);

  // Selección
  useEffect(() => {
    const map = mapaRef.current;
    if (!mapaListo(map) || !capasListas || !seleccion || ambito === "internacional") return;
    const id = { source: seleccion.length === 2 ? "departamentos" : "municipios", id: seleccion };
    map.setFeatureState(id, { sel: true });
    return () => {
      if (map.getSource(id.source)) map.setFeatureState(id, { sel: false });
    };
  }, [seleccion, capasListas, ambito]);

  // Nivel: nacional ↔ departamento
  const { modo3d } = props;
  useEffect(() => {
    const map = mapaRef.current;
    const geo = geoRef.current;
    if (!mapaListo(map) || !geo || !capasListas) return;

    const filtro = exp(["==", ["get", "dpto"], departamento ?? "__"]);
    for (const capa of [
      "mun-relleno",
      "mun-brillo",
      "mun-borde",
      "mun-3d",
      "mun-resplandor",
      "mun-contorno",
    ])
      map.setFilter(capa, filtro);
    map.setPaintProperty("mun-relleno", "fill-opacity", departamento ? 0.94 : 0);
    map.setPaintProperty("mun-borde", "line-opacity", departamento ? 1 : 0);

    for (const f of geo.dep.features) {
      const codigo = f.properties.codigo;
      map.setFeatureState(
        { source: "departamentos", id: codigo },
        {
          atenuado: Boolean(departamento) && codigo !== departamento,
          activo: codigo === departamento,
        },
      );
    }

    // Las torres crecen desde el suelo mientras la cámara se inclina, y se aplastan antes de
    // esconderse. Sin los dos cuadros de espera la transición no arranca: la capa acaba de nacer.
    const nacional = ambito === "nacional";
    const esperas: ReturnType<typeof setTimeout>[] = [];
    const suave = !reducirMovimiento();
    for (const [capa, activa] of [
      ["dep-3d", nacional && modo3d && !departamento],
      ["mun-3d", nacional && modo3d && Boolean(departamento)],
    ] as const) {
      if (activa) {
        map.setLayoutProperty(capa, "visibility", "visible");
        const subir = () =>
          mapaRef.current === map && map.setPaintProperty(capa, "fill-extrusion-vertical-scale", 1);
        if (suave) requestAnimationFrame(() => requestAnimationFrame(subir));
        else subir();
      } else {
        map.setPaintProperty(capa, "fill-extrusion-vertical-scale", 0);
        const ocultar = () =>
          mapaRef.current === map && map.setLayoutProperty(capa, "visibility", "none");
        if (suave) esperas.push(setTimeout(ocultar, 1000));
        else ocultar();
      }
    }

    // Se vuelve a un encuadre calculado: lo que la persona moviera a mano ya no aplica.
    camaraManual.current = false;
    if (introTerminada && nacional)
      encuadrar(map, { departamento, modo3d, margenes: props.margenes, duracion: 1700 });
    return () => esperas.forEach(clearTimeout);
  }, [departamento, modo3d, capasListas, introTerminada, ambito, props.margenes]);

  // Los controles crecieron o menguaron (una fila de filtros más): se reencuadra sin drama.
  const margenes = props.margenes;
  useEffect(() => {
    const map = mapaRef.current;
    const previos = margenesPrevios.current;
    const actuales = margenes ?? MARGENES_BASE;
    margenesPrevios.current = actuales;
    if (!mapaListo(map) || !capasListas || !introTerminada) return;
    if (ambito !== "nacional" || camaraManual.current) return;
    if (Math.abs(actuales.top - previos.top) < 24 && Math.abs(actuales.bottom - previos.bottom) < 24)
      return;
    encuadrar(map, { departamento, modo3d, margenes: actuales, duracion: 300 });
  }, [margenes, ambito, departamento, modo3d, capasListas, introTerminada]);

  // Ámbito: Colombia ↔ el mundo girando
  useEffect(() => {
    const map = mapaRef.current;
    const giro = giroRef.current;
    if (!mapaListo(map) || !capasListas || !giro) return;

    const internacional = ambito === "internacional";
    const cambiarCapas = () => {
      if (!mapaListo(map)) return;
      for (const capa of CAPAS_PAISES)
        map.setLayoutProperty(capa, "visibility", internacional ? "visible" : "none");
      for (const capa of [
        "dep-relleno",
        "dep-brillo",
        "dep-borde",
        "dep-resplandor",
        "dep-contorno",
        "dep-velo",
      ])
        map.setLayoutProperty(capa, "visibility", internacional ? "none" : "visible");
      for (const capa of [
        "mun-relleno",
        "mun-brillo",
        "mun-borde",
        "mun-resplandor",
        "mun-contorno",
        "mun-velo",
      ])
        map.setLayoutProperty(capa, "visibility", internacional ? "none" : "visible");
      // En el mundo, los nombres de países y continentes ceden el paso a la cifra de Colombia.
      for (const [capa, opacidad] of [
        ["continent-label", internacional ? 0.18 : 0.3],
        ["country-label", internacional ? 0.5 : 0.3],
      ] as const)
        if (map.getLayer(capa)) map.setPaintProperty(capa, "text-opacity", opacidad);
    };
    // Las capas con feature-state no transicionan: el relevo se hace bajo un velo breve, en vez
    // de un corte seco. En la primera pasada (carga) no hay nada que relevar.
    const hayRelevo = ambitoPrevio.current !== ambito && !reducirMovimiento();
    ambitoPrevio.current = ambito;
    let relevo: ReturnType<typeof setTimeout> | undefined;
    if (hayRelevo) {
      velo.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], {
        duration: 750,
        easing: "ease-in-out",
      });
      relevo = setTimeout(cambiarCapas, 225);
    } else cambiarCapas();
    const limpiar = () => clearTimeout(relevo);

    if (!internacional) {
      giro.detener();
      return limpiar;
    }
    // El disco se encuadra según el contenedor: ocupa ~85 % del lado menor en cualquier pantalla.
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const libre = libreGlobo(props.margenes ?? MARGENES_BASE);
    const zoom = zoomGlobo(w, h, libre);
    camaraManual.current = false;
    map.easeTo({
      center: CENTRO_MUNDO,
      zoom,
      pitch: 0,
      bearing: 0,
      padding: rellenoGlobo(libre),
      duration: reducirMovimiento() ? 0 : 2200,
      easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      essential: true,
    });
    // Sin temporizador: mientras dura el vuelo el giro calla (`isMoving`) y luego arranca con rampa.
    giro.iniciar(zoom);
    return limpiar;
    // `margenes` se lee al entrar al mundo; su cambio lo atiende el efecto de reencuadre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambito, capasListas]);

  // Algo encima del mapa, o la persona pidió pausa: el globo se queda quieto.
  const { pausado = false } = props;
  useEffect(() => {
    giroRef.current?.bloquear(pausado);
  }, [pausado, capasListas]);
  useEffect(() => {
    giroRef.current?.pausaUsuario(giroPausado);
  }, [giroPausado, capasListas]);

  // Leyenda
  const v = valores[metrica];
  const maxEscala =
    ambito === "internacional"
      ? Math.max(0, ...[...cifrasPaises.values()].map((c) => c[metrica]))
      : departamento
        ? Math.max(
            0,
            ...[...v.municipios].filter(([c]) => c.startsWith(departamento)).map(([, n]) => n),
          )
        : Math.max(0, ...v.departamentos.values());
  const nombreDepto = departamento ? nombrePropio(departamentos[departamento]?.nombre ?? "") : "";
  const paisesConDatos = [...cifrasPaises.values()].filter((c) => c[metrica] > 0).length;

  return (
    <div className="absolute inset-0">
      {/* mapbox-gl.css fija position: relative en el contenedor: se envuelve para ocupar todo */}
      <div className="absolute inset-0">
        <div ref={contenedor} className="h-full w-full" />
      </div>
      {/* Velo del relevo Colombia ↔ Mundo */}
      <div ref={velo} className="pointer-events-none absolute inset-0 bg-[#040C1D] opacity-0" />

      {/* El mapa puede fallar (token, red) sin tumbar el tablero: las cifras siguen a la vista */}
      {fallo && (
        <div
          role="alert"
          className="absolute inset-0 z-30 grid place-items-center bg-[#040C1D] p-6"
        >
          <div className="max-w-sm text-center">
            <MapPinOff className="mx-auto size-8 text-accent" />
            <p className="font-display mt-3 text-lg font-extrabold">No se pudo cargar el mapa</p>
            <p className="mt-1 text-sm text-secondary">
              Las cifras y las narrativas siguen disponibles. Revise la conexión e intente de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 h-10 rounded-sm bg-action-primary px-4 text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Carga de cartografía */}
      <AnimatePresence>
        {!capasListas && !fallo && (
          <motion.div
            role="status"
            className="pointer-events-none absolute inset-0 grid place-items-center"
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4">
              <span className="size-3 animate-pulso rounded-full bg-gold-500" />
              <p className="etiqueta">Cargando cartografía</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {/* Al abrir un departamento —o al irse al mundo— el cursor puede seguir sobre lo de antes:
            ese tooltip ya no habla de lo que hay en pantalla. */}
        {bajoCursor &&
          (bajoCursor.fuente === "paises") === (ambito === "internacional") &&
          !(bajoCursor.fuente === "departamentos" && bajoCursor.codigo === departamento) && (
            <Tooltip
              key="tooltip"
              objetivo={bajoCursor}
              x={xTooltip}
              y={yTooltip}
              valores={valores}
              metrica={metrica}
              departamento={departamento}
              departamentos={departamentos}
              municipios={municipios}
              paises={paises}
              cifrasPaises={cifrasPaises}
            />
          )}
      </AnimatePresence>

      {/* Junto a los controles de Mapbox: pausa del globo en el mundo, vista 3D en Colombia.
          Nunca coinciden, así que comparten sitio. */}
      {capasListas && (
        <div className="absolute right-[10px] bottom-[150px] z-10 flex flex-col gap-1.5">
          {ambito === "internacional" ? (
            <button
              onClick={() => setGiroPausado((p) => !p)}
              aria-pressed={!giroPausado}
              aria-label={giroPausado ? "Reanudar el giro del globo" : "Pausar el giro del globo"}
              className="vidrio grid size-[29px] place-items-center rounded-md text-secondary transition-colors hover:text-accent pointer-coarse:size-11"
            >
              {giroPausado ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>
          ) : (
            <button
              onClick={props.onModo3d}
              aria-pressed={modo3d}
              aria-label="Vista 3D"
              className={`vidrio grid size-[29px] place-items-center rounded-md transition-colors pointer-coarse:size-11 ${
                modo3d ? "border-gold-500! text-accent" : "text-secondary hover:text-accent"
              }`}
            >
              {modo3d ? <Box className="size-3.5" /> : <Layers className="size-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* Franja inferior única: leyenda y pista comparten fila y no pueden pisarse */}
      <div
        className="group/pie pointer-events-none absolute inset-x-3 bottom-4 flex items-end gap-3 pr-10 sm:inset-x-6 sm:bottom-6"
        data-pistas={pistas.ver ? "si" : "no"}
        onPointerEnter={() => asomarPistas(true)}
        onPointerLeave={() => asomarPistas(false)}
        onFocusCapture={() => asomarPistas(true)}
        onBlurCapture={() => asomarPistas(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: introTerminada ? 1 : 0, y: introTerminada ? 0 : 12 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-auto shrink-0"
        >
          <Leyenda
            metrica={metrica}
            ambito={ambito}
            territorio={
              ambito === "internacional" ? "Mundo" : departamento ? nombreDepto : "Colombia"
            }
            max={maxEscala}
            paisesConDatos={paisesConDatos}
            onCentrarColombia={() =>
              mapaRef.current?.easeTo({ center: [-74, 4.5], duration: 900, essential: true })
            }
          />
        </motion.div>
        {/* La pista aparece al aterrizar, no a un tiempo fijo */}
        <motion.div
          initial={false}
          animate={{ opacity: introTerminada ? 1 : 0, y: introTerminada ? 0 : 10 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex min-w-0 flex-1 justify-center"
        >
          {tecladoEnMapa ? (
            <p className="vidrio rounded-full px-4 py-1.5 text-xs whitespace-nowrap text-secondary">
              Flechas: mover · <span className="cifra">+</span>/<span className="cifra">−</span>:
              acercar · Esc: subir un nivel
            </p>
          ) : (
            props.pie
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Leyenda de la escala. El color va por raíz cuadrada (los conteos son muy desiguales), así que
 * la marca del medio del degradado vale el 25 % del máximo, no el 50 %: se rotula para no mentir.
 */
function Leyenda({
  metrica,
  ambito,
  territorio,
  max,
  paisesConDatos,
  onCentrarColombia,
}: {
  metrica: Metrica;
  ambito: Ambito;
  territorio: string;
  max: number;
  paisesConDatos: number;
  onCentrarColombia: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const marcas = max >= 8 ? [1, Math.round(max * 0.25), Math.round(max * 0.5625), max] : [1, max];

  // En el mundo, con un solo país con registros, un degradado de un solo punto no dice nada.
  if (ambito === "internacional" && paisesConDatos === 1)
    return (
      <button
        onClick={onCentrarColombia}
        className="vidrio flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-secondary transition-colors hover:text-primary"
      >
        <span className="size-2.5 rounded-[3px] bg-gold-500" />
        <span>
          <span className="text-primary">Colombia</span> ·{" "}
          <span className="cifra text-primary">{formatoNumero(max)}</span>{" "}
          {METRICAS[metrica].plural}
          <span className="block text-[11px] text-muted">único país con registros</span>
        </span>
      </button>
    );

  const cuerpo = (
    <>
      <p className="etiqueta mb-2 truncate">
        {METRICAS[metrica].etiqueta} · {territorio}
      </p>
      <div
        className="h-2.5 rounded-full"
        style={{ background: `linear-gradient(90deg, ${RAMPA_MAPA.join(",")})` }}
      />
      {max > 0 ? (
        <div className="cifra mt-1.5 flex justify-between text-xs text-secondary">
          {marcas.map((n, i) => (
            <span key={i}>{formatoNumero(n)}</span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-muted">Sin registros con estos filtros</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span
          className="size-3 rounded-[3px] border border-default"
          style={{ background: RELLENO_VACIO }}
        />
        {ambito === "internacional" ? `Sin ${METRICAS[metrica].plural}` : "Sin registros"}
      </div>
      {max >= 8 && <p className="mt-1 text-[11px] text-muted">Escala de raíz cuadrada</p>}
    </>
  );

  return (
    <>
      {/* En pantallas estrechas la leyenda se pliega: si no, tapa medio mapa. */}
      <div className="sm:hidden">
        {abierta && <div className="vidrio mb-2 w-56 rounded-md p-3">{cuerpo}</div>}
        <button
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="vidrio flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-secondary"
        >
          <span
            className="h-2.5 w-8 rounded-full"
            style={{ background: `linear-gradient(90deg, ${RAMPA_MAPA.join(",")})` }}
          />
          Escala
        </button>
      </div>
      <div className="vidrio hidden w-64 rounded-md p-3.5 sm:block">{cuerpo}</div>
    </>
  );
}

function Tooltip({
  objetivo: punto,
  x,
  y,
  valores,
  metrica,
  departamento,
  departamentos,
  municipios,
  paises,
  cifrasPaises,
}: {
  objetivo: Objetivo;
  x: MotionValue<number>;
  y: MotionValue<number>;
  valores: Record<Metrica, ValoresMapa>;
  metrica: Metrica;
  departamento: string | null;
  departamentos: DatosTablero["departamentos"];
  municipios: DatosTablero["municipios"];
  paises: Map<string, PropsPais>;
  cifrasPaises: Map<string, CifrasPais>;
}) {
  const esPais = punto.fuente === "paises";
  const esMunicipio = punto.fuente === "municipios";
  const pais = esPais ? paises.get(punto.codigo) : undefined;
  const cifras = esPais ? (cifrasPaises.get(punto.codigo) ?? SIN_DATOS) : null;
  const nombre = esPais
    ? pais?.nombre
    : esMunicipio
      ? municipios[punto.codigo]?.nombre
      : departamentos[punto.codigo]?.nombre;
  const nivel = esMunicipio ? "municipios" : "departamentos";
  const sinDatos = cifras !== null && Object.values(cifras).every((n) => n === 0);

  return (
    // Sin desenfoque de fondo: se mueve en cada cuadro sobre un lienzo WebGL y sería carísimo.
    <motion.div
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      className="pointer-events-none absolute top-0 left-0 z-20 w-60 rounded-md border border-[var(--glass-border)] bg-surface-1/95 p-3.5 shadow-[var(--shadow-deep)]"
    >
      <p className="etiqueta mb-0.5">
        {esPais
          ? continenteEs(pais?.continente ?? "País")
          : esMunicipio
            ? nombrePropio(departamentos[punto.dpto]?.nombre ?? "Municipio")
            : "Departamento"}
      </p>
      <p className="font-display text-[1rem] leading-tight font-extrabold">
        {esPais
          ? (nombre ?? punto.codigo)
          : nombre
            ? nombrePropio(nombre)
            : `Código ${punto.codigo}`}
      </p>
      {sinDatos ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Globe className="size-3.5" /> Sin registros internacionales
        </p>
      ) : (
        <dl className="mt-3 space-y-1.5">
          {(Object.keys(METRICAS) as Metrica[]).map((m) => (
            <div key={m} className="flex items-center justify-between text-sm">
              <dt className={m === metrica ? "font-semibold text-primary" : "text-secondary"}>
                {m === metrica && (
                  <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-gold-500" />
                )}
                {METRICAS[m].etiqueta}
              </dt>
              <dd className={`cifra ${m === metrica ? "text-accent" : "text-secondary"}`}>
                {formatoNumero(cifras ? cifras[m] : (valores[m][nivel].get(punto.codigo) ?? 0))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {esPais && sinDatos ? null : esPais ? (
        <p className="mt-3 flex items-center gap-1.5 border-t border-subtle pt-2.5 text-xs text-muted">
          {punto.codigo === COLOMBIA_ISO ? (
            <>
              <MousePointerClick className="size-3.5" /> Clic para ver el detalle nacional
            </>
          ) : (
            <>
              <Globe className="size-3.5" /> Sin datos internacionales registrados
            </>
          )}
        </p>
      ) : (
        !esMunicipio &&
        punto.codigo !== departamento && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-subtle pt-2.5 text-xs text-muted">
            <MousePointerClick className="size-3.5" /> Doble clic para ver sus municipios
          </p>
        )
      )}
    </motion.div>
  );
}
