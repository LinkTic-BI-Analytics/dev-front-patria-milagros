import type mapboxgl from "mapbox-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { colorPorT, estado, exp, reducirMovimiento } from "./estilo";

// La vista internacional: el mundo por países y el giro del globo sobre su propio eje.

export type PropsPais = { codigo: string; nombre: string; continente: string; lon: number; lat: number };
export type MapaPaises = FeatureCollection<Geometry, PropsPais>;

export const CAPAS_PAISES = [
  "pais-relleno",
  "pais-brillo",
  "pais-borde",
  "pais-resplandor",
  "pais-contorno",
] as const;

export function agregarCapasPaises(map: mapboxgl.Map, data: MapaPaises) {
  map.addSource("paises", { type: "geojson", data, promoteId: "codigo" });

  map.addLayer({
    id: "pais-relleno",
    type: "fill",
    source: "paises",
    layout: { visibility: "none" },
    paint: { "fill-color": colorPorT, "fill-opacity": 0.88 },
  });
  map.addLayer({
    id: "pais-brillo",
    type: "fill",
    source: "paises",
    layout: { visibility: "none" },
    paint: { "fill-color": "#FFFFFF", "fill-opacity": exp(["case", estado("hover"), 0.14, 0]) },
  });
  map.addLayer({
    id: "pais-borde",
    type: "line",
    source: "paises",
    layout: { visibility: "none" },
    paint: {
      "line-color": "rgba(237,241,247,0.22)",
      "line-width": exp(["interpolate", ["linear"], ["zoom"], 1, 0.4, 5, 1.2]),
    },
  });
  map.addLayer({
    id: "pais-resplandor",
    type: "line",
    source: "paises",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#FFC800",
      "line-width": 8,
      "line-blur": 8,
      "line-opacity": exp(["case", estado("hover"), 0.5, estado("activo"), 0.75, 0]),
    },
  });
  map.addLayer({
    id: "pais-contorno",
    type: "line",
    source: "paises",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#FFE58A",
      "line-width": 1.6,
      "line-opacity": exp(["case", estado("hover"), 0.8, estado("activo"), 1, 0]),
    },
  });
}

/** El GeoJSON trae el continente en inglés. */
const CONTINENTES: Record<string, string> = {
  Africa: "África",
  Antarctica: "Antártida",
  Asia: "Asia",
  Europe: "Europa",
  "North America": "Norteamérica",
  Oceania: "Oceanía",
  "South America": "Suramérica",
  "Seven seas (open ocean)": "Océano abierto",
};
export const continenteEs = (continente: string) => CONTINENTES[continente] ?? continente;

const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Franjas del contenedor que ocupan los controles: el disco se encuadra en lo que queda. */
export type LibreGlobo = { top: number; bottom: number };

/**
 * Zoom con el que el disco del globo mide `k` veces el lado menor del contenedor, sin salirse
 * de la franja libre ni de los costados. Es la inversa exacta de la cámara de Mapbox: enfoca
 * con distancia focal `1.5 · alto` (fov de 36.87°), pero en globo se aleja un factor cos 45°
 * para igualar la escala de Mercator a esa latitud; el contorno visible de una esfera de radio
 * `R = 512 · 2^zoom / 2π` sale de ahí. Se acota a 2.6 porque más arriba el globo empieza a
 * fundirse con Mercator y la relación deja de valer.
 */
export function zoomGlobo(
  ancho: number,
  alto: number,
  libre: LibreGlobo = { top: 64, bottom: 8 },
  k = 0.85,
) {
  const focal = 1.5 * alto;
  const distancia = focal * Math.SQRT1_2;
  const diametro = Math.min(
    k * Math.min(ancho, alto),
    alto - libre.top - libre.bottom - 8,
    ancho - 24,
  );
  // Un contenedor aún sin medir (o diminuto) daría un logaritmo sin sentido.
  if (!(diametro > 0)) return 0.3;
  const s = diametro / (2 * focal);
  const radio = s * distancia * (s + Math.hypot(s, 1));
  return acotar(Math.log2((2 * Math.PI * radio) / 512), 0.3, 2.6);
}

// El giro, en grados por segundo y segundos. Tres grados por segundo son unos 19 px/s en el
// ecuador del disco: se nota que gira sin marear; en pantallas angostas el disco es menor.
const CRUCERO = 3;
const CRUCERO_COMPACTO = 2.4;
const ANCHO_COMPACTO = 640;
/** Acelera con calma y frena más rápido: quien se detiene a mirar no quiere perseguir el país. */
const TAU_ACELERAR = 0.9;
const TAU_FRENAR = 0.3;
const TAU_ZOOM = 0.35;
const TAU_LATITUD = 4;
/** Tras un gesto la persona sigue mirando; tras un vuelo nuestro basta un respiro. */
const ESPERA_GESTO = 1500;
const ESPERA_PROGRAMATICA = 150;
/** Niveles de zoom por encima del encuadre en los que el giro se apaga del todo. */
const ZOOM_QUIETO = 1.5;
const LATITUD_BASE = 8;
const V_MINIMA = 0.02;
const ZOOM_ASENTADO = 0.002;

/**
 * Giro continuo del globo sobre su eje, como la Tierra. Es un integrador de velocidad angular:
 * cada cuadro acerca la velocidad a su objetivo con una rampa exponencial, así que arrancar,
 * frenar y reanudar nunca dan tirones.
 *
 * Convive con la cámara en vez de pelear con ella: `jumpTo` cancela cualquier vuelo, inercia o
 * gesto en curso, así que mientras la persona agarra el globo o el mapa se mueve por su cuenta
 * el giro calla (velocidad 0 y ni un `jumpTo`). Por lo mismo hay un solo `jumpTo` por cuadro, y
 * el zoom de reencuadre viaja dentro de él.
 */
export function crearGiro(map: mapboxgl.Map) {
  let animacion = 0;
  let anterior = 0;
  let activo = false;
  let v = 0;

  let zoomBase = map.getZoom();
  let zoomObjetivo: number | null = null;
  let zoomSinRampa = false;
  let rellenoPendiente: mapboxgl.PaddingOptions | null = null;
  let ancho = map.getContainer().clientWidth;

  let agarrado = false;
  let ocupado = false;
  let libreDesde = 0;
  let ultimoFueGesto = false;
  /** Nuestro `jumpTo` también emite `movestart`: no debe contarse como movimiento ajeno. */
  let propio = false;

  let frenado = false;
  let liberarEn = Infinity;
  let bloqueado = false;
  // Con movimiento reducido el globo nace quieto: solo gira si la persona lo pide.
  let pausado = reducirMovimiento();

  const paso = (ahora: number) => {
    animacion = requestAnimationFrame(paso);
    // Un cuadro largo (pestaña en segundo plano, recolección de basura) no debe verse como salto.
    const dt = anterior ? Math.min((ahora - anterior) / 1000, 1 / 30) : 0;
    anterior = ahora;

    if (agarrado || map.isMoving()) {
      v = 0;
      ocupado = true;
      return;
    }
    if (ocupado) {
      ocupado = false;
      libreDesde = ahora;
    }
    if (ahora - libreDesde < (ultimoFueGesto ? ESPERA_GESTO : ESPERA_PROGRAMATICA)) return;

    if (frenado && ahora >= liberarEn) frenado = false;
    const zoom = map.getZoom();
    const nominal = ancho < ANCHO_COMPACTO ? CRUCERO_COMPACTO : CRUCERO;
    // Al acercarse, la persona está leyendo un lugar: el globo se aquieta solo.
    const objetivo =
      bloqueado || pausado || frenado
        ? 0
        : nominal * acotar(1 - (zoom - zoomBase) / ZOOM_QUIETO, 0, 1);
    v += (objetivo - v) * (1 - Math.exp(-dt / (objetivo > v ? TAU_ACELERAR : TAU_FRENAR)));
    if (objetivo === 0 && v < V_MINIMA) v = 0;

    let zoomSiguiente: number | null = null;
    if (zoomObjetivo !== null) {
      const falta = zoomObjetivo - zoom;
      if (zoomSinRampa || Math.abs(falta) < ZOOM_ASENTADO) {
        zoomSiguiente = zoomObjetivo;
        zoomObjetivo = null;
      } else {
        zoomSiguiente = zoom + falta * (1 - Math.exp(-dt / TAU_ZOOM));
      }
    }
    if (v < V_MINIMA && zoomSiguiente === null && !rellenoPendiente) return;

    const { lng, lat } = map.getCenter();
    // La latitud vuelve a la de base al ritmo del giro: con la rampa y sin arrastrar a quien
    // se acercó a mirar otra región.
    const haciaBase = (LATITUD_BASE - lat) * (1 - Math.exp(-dt / TAU_LATITUD)) * (v / nominal);
    const destino: mapboxgl.CameraOptions = {
      center: [((lng - v * dt + 540) % 360) - 180, lat + haciaBase],
    };
    // `jumpTo` mira si la clave existe, no su valor: un `zoom: undefined` dejaría el mapa en NaN.
    if (zoomSiguiente !== null) destino.zoom = zoomSiguiente;
    if (rellenoPendiente) {
      destino.padding = rellenoPendiente;
      rellenoPendiente = null;
    }
    propio = true;
    map.jumpTo(destino);
    propio = false;
  };

  const alAgarrar = () => {
    agarrado = true;
    ultimoFueGesto = true;
  };
  const alSoltar = () => {
    agarrado = false;
  };
  const alLevantarDedo = (e: TouchEvent) => {
    if (e.touches.length === 0) agarrado = false;
  };
  // Mapbox marca con `originalEvent` lo que nace de un gesto de la persona.
  const esGesto = (e: object) => Boolean((e as { originalEvent?: unknown }).originalEvent);
  const alMoverse = (e: object) => {
    if (!propio) ultimoFueGesto = esGesto(e);
  };
  const alTerminarGesto = (e: object) => {
    if (esGesto(e)) ultimoFueGesto = true;
  };
  // Un zoom de la persona manda sobre el reencuadre que estuviera en camino.
  const alZoomAjeno = (e: object) => {
    if (esGesto(e)) zoomObjetivo = null;
  };
  const alRedimensionar = () => {
    ancho = map.getContainer().clientWidth;
  };
  // Al volver a la pestaña el reloj arranca de cero: nada de compensar el tiempo oculto.
  const alCambiarVisibilidad = () => {
    anterior = 0;
  };

  const FIN_DE_GESTO = ["dragend", "zoomend", "rotateend", "pitchend"] as const;
  // La rueda no está en la lista: con gestos cooperativos llega sin hacer zoom, y el zoom de
  // verdad ya se ve en `isMoving()`.
  map.on("mousedown", alAgarrar);
  map.on("touchstart", alAgarrar);
  map.on("movestart", alMoverse);
  map.on("zoomstart", alZoomAjeno);
  map.on("resize", alRedimensionar);
  for (const evento of FIN_DE_GESTO) map.on(evento, alTerminarGesto);
  // Se suelta en la ventana: el botón puede levantarse fuera del mapa, o nunca (cambio de app).
  window.addEventListener("mouseup", alSoltar);
  window.addEventListener("touchend", alLevantarDedo);
  window.addEventListener("touchcancel", alSoltar);
  window.addEventListener("blur", alSoltar);
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  const control = {
    /** Enciende el giro. `zoomEncuadre` es el zoom del disco completo: de él sale el factor por zoom. */
    iniciar(zoomEncuadre: number) {
      zoomBase = zoomEncuadre;
      ancho = map.getContainer().clientWidth;
      if (activo) return;
      activo = true;
      v = 0;
      anterior = 0;
      animacion = requestAnimationFrame(paso);
    },
    detener() {
      activo = false;
      cancelAnimationFrame(animacion);
      animacion = 0;
      anterior = 0;
      v = 0;
      ocupado = false;
      frenado = false;
      zoomObjetivo = null;
      rellenoPendiente = null;
    },
    /** Alguien se detuvo a mirar: baja a cero con rampa y espera a `soltar`. */
    frenarSuave() {
      frenado = true;
      liberarEn = Infinity;
    },
    /** Deja de frenar dentro de `ms`; si ya había una salida más próxima, se respeta. */
    soltar(ms = 0) {
      if (frenado) liberarEn = Math.min(liberarEn, performance.now() + ms);
    },
    /**
     * Reencuadra el disco (el contenedor cambió de tamaño). Con el giro encendido el zoom viaja
     * dentro del bucle; apagado, se salta directo. Nunca `easeTo`: moriría en el siguiente cuadro.
     */
    fijarZoom(z: number, relleno?: mapboxgl.PaddingOptions) {
      zoomBase = z;
      if (activo) {
        zoomObjetivo = z;
        zoomSinRampa = reducirMovimiento();
        if (relleno) rellenoPendiente = relleno;
        return;
      }
      if (map.isMoving()) return;
      map.jumpTo(relleno ? { zoom: z, padding: relleno } : { zoom: z });
    },
    /** Pausa impuesta desde fuera (un modal encima): el globo no gira a espaldas de nadie. */
    bloquear(b: boolean) {
      bloqueado = b;
    },
    /** Pausa pedida por la persona con el botón «Giro automático». */
    pausaUsuario(b: boolean) {
      pausado = b;
    },
    velocidad: () => v,
    destruir() {
      control.detener();
      map.off("mousedown", alAgarrar);
      map.off("touchstart", alAgarrar);
      map.off("movestart", alMoverse);
      map.off("zoomstart", alZoomAjeno);
      map.off("resize", alRedimensionar);
      for (const evento of FIN_DE_GESTO) map.off(evento, alTerminarGesto);
      window.removeEventListener("mouseup", alSoltar);
      window.removeEventListener("touchend", alLevantarDedo);
      window.removeEventListener("touchcancel", alSoltar);
      window.removeEventListener("blur", alSoltar);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    },
  };

  return control;
}
