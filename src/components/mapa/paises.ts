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

/**
 * Giro continuo del globo sobre su eje, como la Tierra: el centro se corre al occidente
 * unos grados por segundo. Se pausa cuando la persona interactúa o se detiene a mirar un
 * país, y se reanuda sola un momento después.
 */
export function crearGiro(map: mapboxgl.Map, gradosPorSegundo = 6) {
  let animacion = 0;
  let anterior = 0;
  let reanudacion: ReturnType<typeof setTimeout> | null = null;
  let activo = false;

  const paso = (ahora: number) => {
    if (anterior) {
      const avance = ((ahora - anterior) / 1000) * gradosPorSegundo;
      const { lng, lat } = map.getCenter();
      map.setCenter([(((lng - avance + 540) % 360) - 180), lat]);
    }
    anterior = ahora;
    animacion = requestAnimationFrame(paso);
  };

  const arrancar = () => {
    cancelAnimationFrame(animacion);
    anterior = 0;
    animacion = requestAnimationFrame(paso);
  };
  const frenar = () => {
    cancelAnimationFrame(animacion);
    animacion = 0;
    anterior = 0;
  };
  const cancelarReanudacion = () => {
    if (reanudacion) clearTimeout(reanudacion);
    reanudacion = null;
  };

  const control = {
    iniciar() {
      if (activo || reducirMovimiento()) return;
      activo = true;
      arrancar();
    },
    detener() {
      activo = false;
      cancelarReanudacion();
      frenar();
    },
    /** Pausa sin perder el estado: el giro sigue "encendido". */
    pausar() {
      if (!activo) return;
      cancelarReanudacion();
      frenar();
    },
    reanudarPronto(espera = 2500) {
      if (!activo) return;
      cancelarReanudacion();
      reanudacion = setTimeout(arrancar, espera);
    },
    destruir() {
      control.detener();
      for (const evento of ["mousedown", "touchstart", "wheel", "dragstart"] as const)
        map.off(evento, control.pausar);
      for (const evento of ["mouseup", "touchend", "dragend"] as const)
        map.off(evento, alSoltar);
    },
  };

  const alSoltar = () => control.reanudarPronto();
  for (const evento of ["mousedown", "touchstart", "wheel", "dragstart"] as const)
    map.on(evento, control.pausar);
  for (const evento of ["mouseup", "touchend", "dragend"] as const) map.on(evento, alSoltar);

  return control;
}
