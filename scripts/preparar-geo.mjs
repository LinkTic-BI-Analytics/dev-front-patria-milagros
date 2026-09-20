// Prepara los GeoJSON de public/data para el mapa.
//
// - Redondea coordenadas a 5 decimales (~1 m) y quita puntos repetidos.
// - Deja solo el código DIVIPOLA como propiedad: los nombres salen de la base.
// - Fusiona los municipios que vienen partidos en varias features con el mismo
//   código, para que el estado por código pinte el municipio completo.
// - Escribe la caja (bbox) de cada departamento para acercar el mapa.
// - Adelgaza el mapa mundial: 177 países con ~170 propiedades cada uno pasan a
//   código, nombre en español, continente y punto de etiqueta.
//
// Los originales no se tocan. Uso: node scripts/preparar-geo.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const leer = (f) => JSON.parse(readFileSync(join(raiz, "public/data", f), "utf8"));

const redondear = (n) => Math.round(n * 1e5) / 1e5;
// A escala mundial, 3 decimales (~100 m) sobran y pesan la mitad.
const redondearMundo = (n) => Math.round(n * 1e3) / 1e3;

function anillo(coords, precision = redondear) {
  const out = [];
  for (const [x, y] of coords) {
    const p = [precision(x), precision(y)];
    const u = out[out.length - 1];
    if (!u || u[0] !== p[0] || u[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

function poligonos(geom, precision = redondear) {
  const lista = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return lista
    .map((pol) => pol.map((c) => anillo(c, precision)).filter(Boolean))
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

function coleccion(features, codigoDe, extra = () => ({}), precision = redondear) {
  const porCodigo = new Map();
  for (const f of features) {
    const codigo = codigoDe(f.properties);
    const actual = porCodigo.get(codigo);
    const pols = poligonos(f.geometry, precision);
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

// Mapa mundial para la vista internacional.
const paises = coleccion(
  leer("internacional.geojson").features,
  (p) => p.ADM0_A3,
  (p) => ({
    nombre: p.NAME_ES || p.NAME || p.ADMIN,
    continente: p.CONTINENT,
    lon: redondearMundo(p.LABEL_X),
    lat: redondearMundo(p.LABEL_Y),
  }),
  redondearMundo,
);

const cajas = {};
for (const [codigo, { pols }] of deptos.porCodigo) cajas[codigo] = caja(pols);

mkdirSync(join(raiz, "public/data/geo"), { recursive: true });
const salidas = {
  "public/data/geo/departamentos.json": JSON.stringify(deptos.geojson),
  "public/data/geo/municipios.json": JSON.stringify(mpios.geojson),
  "public/data/geo/paises.json": JSON.stringify(paises.geojson),
};
for (const [ruta, contenido] of Object.entries(salidas)) writeFileSync(join(raiz, ruta), contenido);
writeFileSync(join(raiz, "src/lib/geo/cajas.json"), JSON.stringify(cajas, null, 2) + "\n");

// Huella del contenido: el navegador puede cachear la cartografía para siempre porque, cuando
// cambia, cambia la URL. No sirve `catalogoVersion`: es de la base, no de estos archivos.
const version = createHash("sha256")
  .update(Object.values(salidas).join(""))
  .digest("hex")
  .slice(0, 10);
writeFileSync(
  join(raiz, "src/lib/geo/version.json"),
  `${JSON.stringify({ version }, null, 2)}\n`,
);

console.log(
  `departamentos: ${deptos.porCodigo.size} · municipios: ${mpios.porCodigo.size} · cajas: ${Object.keys(cajas).length} · países: ${paises.porCodigo.size} · versión: ${version}`,
);
