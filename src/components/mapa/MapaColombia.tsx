"use client";

import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MousePointerClick } from "lucide-react";
import cajas from "@/lib/geo/cajas.json";
import {
  METRICAS,
  RAMPA_MAPA,
  formatoNumero,
  nombrePropio,
  type Metrica,
} from "@/lib/datos/catalogos";
import type { ValoresMapa } from "@/lib/datos/agregar";
import type { DatosTablero } from "@/lib/datos/tipos";

type Props = {
  valores: Record<Metrica, ValoresMapa>;
  metrica: Metrica;
  departamento: string | null;
  seleccion: string | null;
  modo3d: boolean;
  departamentos: DatosTablero["departamentos"];
  municipios: DatosTablero["municipios"];
  onSeleccionar: (codigo: string | null) => void;
  onEntrar: (dpto: string) => void;
  onSalir: () => void;
};

type Objetivo = { fuente: "departamentos" | "municipios"; codigo: string; dpto: string };
type Punto = Objetivo & { x: number; y: number; ancho: number; alto: number };
type FC = FeatureCollection<Geometry, { codigo: string; dpto?: string }>;

// Territorio continental: San Andrés queda a la vista en el borde sin encoger el país.
const COLOMBIA: mapboxgl.LngLatBoundsLike = [
  [-79.1, -4.25],
  [-66.85, 12.5],
];
const RELLENO_VACIO = "rgba(78, 139, 224, 0.16)";
const exp = (e: unknown) => e as mapboxgl.ExpressionSpecification;

const estado = (clave: string) => exp(["boolean", ["feature-state", clave], false]);
const colorPorT = exp([
  "case",
  ["<", ["coalesce", ["feature-state", "t"], -1], 0],
  RELLENO_VACIO,
  [
    "interpolate-lab",
    ["linear"],
    ["feature-state", "t"],
    0,
    RAMPA_MAPA[0],
    0.25,
    RAMPA_MAPA[1],
    0.5,
    RAMPA_MAPA[2],
    0.75,
    RAMPA_MAPA[3],
    1,
    RAMPA_MAPA[4],
  ],
]);

const reducirMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function relleno(tamano: { width: number; height: number }) {
  const compacto = tamano.width < 640;
  return compacto
    ? { top: 120, bottom: 70, left: 20, right: 20 }
    : { top: 72, bottom: 24, left: 40, right: 40 };
}

/** Viste el estilo base de Mapbox con el navy de la marca y apaga lo que distrae. */
function vestirMapaBase(map: mapboxgl.Map) {
  const visibles = new Set(["country-label", "continent-label", "water-point-label"]);
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

  // Extrusiones (modo 3D)
  map.addLayer({
    id: "dep-3d",
    type: "fill-extrusion",
    source: "departamentos",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": colorPorT,
      "fill-extrusion-height": exp(["*", ["coalesce", ["feature-state", "h"], 0], 300000]),
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
    },
  });
  map.addLayer({
    id: "mun-3d",
    type: "fill-extrusion",
    source: "municipios",
    filter: ninguno,
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": colorPorT,
      "fill-extrusion-height": exp(["*", ["coalesce", ["feature-state", "h"], 0], 50000]),
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
    },
  });

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
        { "font-scale": 0.62, "text-font": exp(["literal", ["DIN Pro Medium", "Arial Unicode MS Regular"]]) },
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
  const geoRef = useRef<{ dep: FC; mun: FC } | null>(null);
  const ultimo = useRef(props);
  const [capasListas, setCapasListas] = useState(false);
  const [introTerminada, setIntroTerminada] = useState(false);
  const [punto, setPunto] = useState<Punto | null>(null);

  useEffect(() => {
    ultimo.current = props;
  });

  // Montaje: mapa, capas, intro e interacción.
  useEffect(() => {
    if (!contenedor.current) return;
    let cancelado = false;
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

    const geo = Promise.all([
      fetch("/data/geo/departamentos.json").then((r) => r.json() as Promise<FC>),
      fetch("/data/geo/municipios.json").then((r) => r.json() as Promise<FC>),
    ]);

    map.on("style.load", () => vestirMapaBase(map));

    map.on("load", async () => {
      if (!reducirMovimiento()) {
        map.easeTo({ center: [-74, 4.5], zoom: 1.9, duration: 2200, easing: (t) => t });
      }
      const [dep, mun] = await geo;
      if (cancelado) return;
      geoRef.current = { dep, mun };
      agregarCapas(map, dep, mun);
      setCapasListas(true);

      const aterrizar = () => {
        map.fitBounds(COLOMBIA, {
          padding: relleno(map.getContainer().getBoundingClientRect()),
          duration: reducirMovimiento() ? 0 : 2800,
          curve: 1.5,
          essential: true,
        });
        map.once("moveend", () => !cancelado && setIntroTerminada(true));
      };
      if (map.isMoving()) map.once("moveend", aterrizar);
      else aterrizar();
    });

    // Qué hay bajo el cursor, en orden de prioridad.
    const objetivo = (p: mapboxgl.PointLike): Objetivo | null => {
      const { departamento } = ultimo.current;
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

    map.on("mousemove", (e) => {
      if (!map.getLayer("dep-relleno")) return;
      const o = objetivo(e.point);
      marcarHover(o);
      map.getCanvas().style.cursor = o ? "pointer" : "";
      setPunto(
        o
          ? {
              ...o,
              x: e.point.x,
              y: e.point.y,
              ancho: map.getContainer().clientWidth,
              alto: map.getContainer().clientHeight,
            }
          : null,
      );
    });
    map.on("mouseout", () => {
      marcarHover(null);
      setPunto(null);
    });

    map.on("click", (e) => {
      if (!map.getLayer("dep-relleno")) return;
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
      const { departamento, onEntrar, onSalir } = ultimo.current;
      if (!o) return onSalir();
      if (o.dpto !== departamento) onEntrar(o.dpto);
    });

    const observador = new ResizeObserver(() => map.resize());
    observador.observe(contenedor.current);

    return () => {
      cancelado = true;
      observador.disconnect();
      map.remove();
      mapaRef.current = null;
    };
  }, []);

  // Colores y cifras según métrica, filtros y nivel.
  const { valores, metrica, departamento, seleccion, departamentos, municipios } = props;
  useEffect(() => {
    const map = mapaRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !capasListas) return;
    const v = valores[metrica];

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
  }, [valores, metrica, departamento, capasListas, departamentos, municipios]);

  // Selección
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !capasListas || !seleccion) return;
    const id = { source: seleccion.length === 2 ? "departamentos" : "municipios", id: seleccion };
    map.setFeatureState(id, { sel: true });
    return () => {
      if (map.getSource(id.source)) map.setFeatureState(id, { sel: false });
    };
  }, [seleccion, capasListas]);

  // Nivel: nacional ↔ departamento
  const { modo3d } = props;
  useEffect(() => {
    const map = mapaRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !capasListas) return;

    const filtro = exp(["==", ["get", "dpto"], departamento ?? "__"]);
    for (const capa of ["mun-relleno", "mun-brillo", "mun-borde", "mun-3d", "mun-resplandor", "mun-contorno"])
      map.setFilter(capa, filtro);
    map.setPaintProperty("mun-relleno", "fill-opacity", departamento ? 0.94 : 0);
    map.setPaintProperty("mun-borde", "line-opacity", departamento ? 1 : 0);

    for (const f of geo.dep.features) {
      const codigo = f.properties.codigo;
      map.setFeatureState(
        { source: "departamentos", id: codigo },
        { atenuado: Boolean(departamento) && codigo !== departamento, activo: codigo === departamento },
      );
    }

    map.setLayoutProperty("dep-3d", "visibility", modo3d && !departamento ? "visible" : "none");
    map.setLayoutProperty("mun-3d", "visibility", modo3d && departamento ? "visible" : "none");

    if (!introTerminada) return;
    const caja = departamento ? (cajas as Record<string, number[]>)[departamento] : null;
    map.fitBounds(
      caja
        ? [
            [caja[0], caja[1]],
            [caja[2], caja[3]],
          ]
        : COLOMBIA,
      {
        padding: relleno(map.getContainer().getBoundingClientRect()),
        duration: reducirMovimiento() ? 0 : 1700,
        pitch: modo3d ? 52 : 0,
        bearing: modo3d ? -14 : 0,
        essential: true,
        maxZoom: 9.5,
      },
    );
  }, [departamento, modo3d, capasListas, introTerminada]);

  // Esc vuelve a la vista nacional
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") ultimo.current.onSalir();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  // Leyenda
  const v = valores[metrica];
  const maxEscala = departamento
    ? Math.max(
        0,
        ...[...v.municipios].filter(([c]) => c.startsWith(departamento)).map(([, n]) => n),
      )
    : Math.max(0, ...v.departamentos.values());
  const nombreDepto = departamento ? nombrePropio(departamentos[departamento]?.nombre ?? "") : "";

  return (
    <div className="absolute inset-0">
      {/* mapbox-gl.css fija position: relative en el contenedor: se envuelve para ocupar todo */}
      <div className="absolute inset-0">
        <div ref={contenedor} className="h-full w-full" />
      </div>

      {/* Carga de cartografía */}
      <AnimatePresence>
        {!capasListas && (
          <motion.div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4">
              <span className="size-3 animate-pulso rounded-full bg-gold-500" />
              <p className="etiqueta">Cargando cartografía nacional</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {/* Al abrir un departamento el cursor puede seguir sobre él: ese tooltip ya no aplica. */}
        {punto && !(punto.fuente === "departamentos" && punto.codigo === departamento) && (
          <Tooltip
            key="tooltip"
            punto={punto}
            valores={valores}
            metrica={metrica}
            departamento={departamento}
            departamentos={departamentos}
            municipios={municipios}
          />
        )}
      </AnimatePresence>

      {/* Leyenda */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: introTerminada ? 1 : 0, y: introTerminada ? 0 : 12 }}
        transition={{ duration: 0.6 }}
        className="vidrio pointer-events-none absolute bottom-4 left-4 w-64 rounded-md p-3.5 sm:bottom-6 sm:left-6"
      >
        <p className="etiqueta mb-2 truncate">
          {METRICAS[metrica].etiqueta} · {departamento ? nombreDepto : "Colombia"}
        </p>
        <div
          className="h-2.5 rounded-full"
          style={{ background: `linear-gradient(90deg, ${RAMPA_MAPA.join(",")})` }}
        />
        <div className="cifra mt-1.5 flex justify-between text-xs text-secondary">
          <span>1</span>
          <span>{formatoNumero(maxEscala)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span
            className="size-3 rounded-[3px] border border-default"
            style={{ background: RELLENO_VACIO }}
          />
          Sin registros
        </div>
      </motion.div>
    </div>
  );
}

function Tooltip({
  punto,
  valores,
  metrica,
  departamento,
  departamentos,
  municipios,
}: {
  punto: Punto;
  valores: Record<Metrica, ValoresMapa>;
  metrica: Metrica;
  departamento: string | null;
  departamentos: DatosTablero["departamentos"];
  municipios: DatosTablero["municipios"];
}) {
  const esMunicipio = punto.fuente === "municipios";
  const nombre = esMunicipio
    ? municipios[punto.codigo]?.nombre
    : departamentos[punto.codigo]?.nombre;
  const nivel = esMunicipio ? "municipios" : "departamentos";
  const izquierda = punto.x + 280 > punto.ancho ? punto.x - 256 : punto.x + 18;
  const arriba = punto.y + 230 > punto.alto ? punto.y - 214 : punto.y + 18;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, left: izquierda, top: arriba }}
      animate={{ opacity: 1, scale: 1, left: izquierda, top: arriba }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.6 }}
      className="vidrio pointer-events-none absolute z-20 w-60 rounded-md bg-surface-1/90! p-3.5 shadow-[var(--shadow-deep)]"
    >
      <p className="etiqueta mb-0.5">
        {esMunicipio
          ? nombrePropio(departamentos[punto.dpto]?.nombre ?? "Municipio")
          : "Departamento"}
      </p>
      <p className="font-display text-[1rem] leading-tight font-extrabold">
        {nombre ? nombrePropio(nombre) : `Código ${punto.codigo}`}
      </p>
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
              {formatoNumero(valores[m][nivel].get(punto.codigo) ?? 0)}
            </dd>
          </div>
        ))}
      </dl>
      {!esMunicipio && punto.codigo !== departamento && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-subtle pt-2.5 text-xs text-muted">
          <MousePointerClick className="size-3.5" /> Doble clic para ver sus municipios
        </p>
      )}
    </motion.div>
  );
}
