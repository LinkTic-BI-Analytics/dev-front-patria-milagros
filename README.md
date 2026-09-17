# Sistema de Planeación Nacional

Tablero territorial de la participación ciudadana en Colombia. El mapa (Mapbox) muestra el país por
departamentos; doble clic en un departamento abre sus municipios. El panel lateral resume aportes,
necesidades, alertas, temas, evolución y estado de atención del territorio seleccionado.

## Arranque

```bash
cp .env.example .env.local   # completar valores
pnpm install
pnpm dev
```

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto Supabase |
| `SUPABASE_SECRET_KEY` | Solo servidor. El esquema `participacion` no da permisos a `anon` |
| `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPBOX_STYLE` | Mapa base |
| `ACCESS_TOKEN` | Token único de acceso al tablero |
| `SESSION_SECRET` | Firma de la cookie de sesión (`openssl rand -base64 32`) |

## Cartografía

`public/data/*.geojson` son los originales. `node scripts/preparar-geo.mjs` genera las versiones
livianas de `public/data/geo/` y las cajas por departamento (`src/lib/geo/cajas.json`). El cruce con la
base es por código DIVIPOLA (`DPTO` / `MPIOS` = `territorio.codigo`).

## Cuentas

Las reglas R1/R2 del esquema se respetan en `src/lib/datos/agregar.ts`: un aporte o necesidad en
varios municipios cuenta una vez por territorio, y los aportes sin ubicación confirmada suman al total
nacional pero no al mapa. Sin filtros, los totales se contrastan con el RPC `participacion.indicadores`.

## Conexión con el PND

`src/lib/pnd/catalogo.json` describe los ejes y líneas temáticas del Plan Nacional de Desarrollo
2026–2030 (borrador) con el vocabulario para relacionar cada narrativa con una línea
(`src/lib/pnd/alinear.ts`, por palabras clave y sin IA). El vocabulario se usa solo en el servidor;
al navegador llegan los nombres.

El documento fuente es confidencial y **no se versiona**: vive en `top_secret/` en el equipo local
(`/top_secret/*.pdf` está en `.gitignore`).

## Temas

Los temas son los 24 sectores del Gobierno nacional (`src/lib/datos/catalogos.ts`). La base guarda la
etiqueta oficial completa y `resolverTema` la traduce a la clave del catálogo.
