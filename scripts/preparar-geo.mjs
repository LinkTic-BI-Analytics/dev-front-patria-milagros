// Prepara los GeoJSON de public/data para el mapa.
//
// - Redondea coordenadas a 5 decimales (~1 m) y quita puntos repetidos.
// - Deja solo el código DIVIPOLA como propiedad: los nombres salen de la base.
// - Fusiona los municipios que vienen partidos en varias features con el mismo
//   código, para que el estado por código pinte el municipio completo.
// - Escribe la caja (bbox) de cada departamento para acercar el mapa.
//
// Los originales no se tocan. Uso: node scripts/preparar-geo.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const leer = (f) => JSON.parse(readFileSync(join(raiz, "public/data", f), "utf8"));

const redondear = (n) => Math.round(n * 1e5) / 1e5;

function anillo(coords) {
  const out = [];
  for (const [x, y] of coords) {
    const p = [redondear(x), redondear(y)];
    const u = out[out.length - 1];
    if (!u || u[0] !== p[0] || u[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

function poligonos(geom) {
  const lista = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return lista
    .map((pol) => pol.map(anillo).filter(Boolean))
    .filter((pol) => pol.length > 0);
}

function caja(pols) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const pol of pols)
    for (const [x, y] of pol[0]) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  return [x0, y0, x1, y1].map(redondear);
}

function coleccion(features, codigoDe, extra = () => ({})) {
  const porCodigo = new Map();
  for (const f of features) {
    const codigo = codigoDe(f.properties);
    const actual = porCodigo.get(codigo);
    const pols = poligonos(f.geometry);
    if (actual) actual.pols.push(...pols);
    else porCodigo.set(codigo, { pols, props: { codigo, ...extra(f.properties) } });
  }
  return {
    porCodigo,
    geojson: {
      type: "FeatureCollection",
      features: [...porCodigo.values()].map(({ pols, props }) => ({
        type: "Feature",
        properties: props,
        geometry:
          pols.length === 1
            ? { type: "Polygon", coordinates: pols[0] }
            : { type: "MultiPolygon", coordinates: pols },
      })),
    },
  };
}

const deptos = coleccion(leer("colombia-departamentos.geojson").features, (p) => p.DPTO);
const mpios = coleccion(
  leer("colombia-municipios.geojson").features,
  (p) => p.MPIOS,
  (p) => ({ dpto: p.DPTO }),
);

const cajas = {};
for (const [codigo, { pols }] of deptos.porCodigo) cajas[codigo] = caja(pols);

mkdirSync(join(raiz, "public/data/geo"), { recursive: true });
writeFileSync(join(raiz, "public/data/geo/departamentos.json"), JSON.stringify(deptos.geojson));
writeFileSync(join(raiz, "public/data/geo/municipios.json"), JSON.stringify(mpios.geojson));
writeFileSync(join(raiz, "src/lib/geo/cajas.json"), JSON.stringify(cajas, null, 2) + "\n");

console.log(
  `departamentos: ${deptos.porCodigo.size} · municipios: ${mpios.porCodigo.size} · cajas: ${Object.keys(cajas).length}`,
);
