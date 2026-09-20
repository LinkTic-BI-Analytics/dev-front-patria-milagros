# Sistema de Escucha y Planeación Nacional

Tablero territorial de la participación ciudadana en Colombia. Muestra **dónde** se registran los
aportes de la ciudadanía (departamentos y municipios), **de qué** hablan (24 sectores del Gobierno),
**cómo avanza su atención** (necesidades y alertas), **qué cuentan** (narrativas) y **con qué ejes del
Plan Nacional de Desarrollo 2026–2030** se relacionan.

> Guía técnica completa, convenciones y trampas conocidas: [`AGENTS.md`](AGENTS.md).
> Plan de experiencia de usuario y su estado: [`docs/hoja-de-ruta-ux.md`](docs/hoja-de-ruta-ux.md).

## Qué ofrece

- **Mapa protagonista (Mapbox).** Colombia por departamentos; un clic selecciona y el botón «Ver
  municipios» (o doble clic) abre el departamento. Tres métricas (aportes, necesidades, alertas), vista
  2D/3D y filtros por tema, canal y eje del Plan.
- **Vista Mundo.** Globo que se ajusta al tamaño del mapa y gira con suavidad; se detiene al
  explorarlo y tiene pausa. Hoy solo Colombia trae datos (la base aún no registra país).
- **Panel territorial.** KPI accionables (un clic lleva esa cifra al mapa), temas, evolución mensual,
  estado de atención y ranking. Indica cuándo se está viendo una parte filtrada («152 de 807»).
- **Narrativas ciudadanas.** Panorama cualitativo, cruce con el Plan y tabla de relatos (agrupados o
  todos) con búsqueda, filtros visibles como chips removibles y vacíos con salida.
- **Ejes articuladores.** Modal con los 6 ejes del Plan en una órbita 3D (flechas, teclado, rueda,
  arrastre y swipe): comparación de los seis, ficha de cada eje con sus líneas, necesidades, alertas y
  el relato que más se repite, y filtro del tablero por eje.
- **Datos en vivo.** Cada visita lee la base; el encabezado dice hace cuánto y permite actualizar sin
  recargar ni perder filtros.
- **Vistas que se comparten.** Territorio, métrica, filtros y pestaña viajan en la dirección: el
  botón «Copiar enlace de esta vista» entrega exactamente lo que hay en pantalla.
- **Modo presentación.** Un recorrido de seis pasos por el tablero, que avanza a mano (espacio o
  flechas), para mostrarlo en una reunión.
- **En el teléfono** los filtros viven en una hoja que sube desde abajo y la tabla se vuelve
  tarjetas: nada de scroll horizontal.
- **Acceso** con un token único institucional. Si la sesión caduca, se avisa y se vuelve a donde
  se estaba.

Nada lo redacta un modelo: las síntesis se agrupan contando y la relación con el Plan se hace por
palabras clave, verificable contra la tabla.

## Arranque

```bash
cp .env.example .env.local   # completar valores
pnpm install
pnpm dev                     # http://localhost:3000
```

| Variable                                               | Uso                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                             | Proyecto Supabase                                                     |
| `SUPABASE_SECRET_KEY`                                  | **Solo servidor.** El esquema `participacion` no da permisos a `anon` |
| `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPBOX_STYLE` | Mapa base                                                             |
| `ACCESS_TOKEN`                                         | Token único de acceso al tablero                                      |
| `SESSION_SECRET`                                       | Firma de la cookie de sesión (`openssl rand -base64 32`)              |

## Comandos

| Comando                                  | Qué hace                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, build y servidor de producción                                                |
| `pnpm lint` · `pnpm exec tsc --noEmit`   | Lint y revisión de tipos                                                                  |
| `node scripts/preparar-geo.mjs`          | Regenera `public/data/geo/*.json` y `src/lib/geo/cajas.json` desde los GeoJSON originales |
| `node scripts/generar-iconos.mjs`        | Regenera `favicon.ico` y `apple-icon.png` desde `src/app/icon.svg` (macOS + Chrome)       |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · motion · mapbox-gl · recharts ·
Supabase (solo servidor) · pnpm. Identidad visual en `public/linea-grafica-patria/`.

## Estructura

```
src/app/            Rutas: (tablero)/ (página, acciones, loading, error) y acceso/ (login)
src/proxy.ts        Guardia de sesión
src/lib/datos/      Lectura en servidor (tablero.ts), agregación pura en cliente (agregar, narrativas, ejes), catálogos
src/lib/pnd/        Catálogo del Plan y alineador por palabras clave
src/lib/auth/       Sesión firmada (HMAC)
src/lib/ui/         Sistema de movimiento y Esc por capas
src/components/ui/  Piezas compartidas: Segmentado (radiogroup) y Pista (tooltip por portal)
src/components/     tablero/ (panel, narrativas, encabezado), mapa/ (Mapbox, globo), ejes/ (modal 3D)
public/data/        Cartografía original y generada
baas/               Copia de referencia del esquema de la base
docs/               Hoja de ruta UX e inventario técnico
```

## Cómo se cuentan las cosas

Reglas del esquema, replicadas en `src/lib/datos/agregar.ts`: una necesidad o aporte en varios
municipios cuenta **una vez** por territorio, y los aportes sin ubicación confirmada suman al total
nacional pero no al mapa. Sin filtros, los totales se contrastan con el RPC `participacion.indicadores`.
El cruce con la cartografía es por código DIVIPOLA.

## Plan Nacional de Desarrollo y confidencialidad

`src/lib/pnd/catalogo.json` describe los 6 ejes y 43 líneas del Plan (borrador de uso interno) con el
vocabulario para relacionar cada aporte con una línea; ese vocabulario **no viaja al navegador**.

El documento fuente (`top_secret/*.pdf`) es **confidencial y solo existe en local**: está en
`.gitignore`, se excluye del build (`next.config.ts`) y un hook `pre-commit` local lo bloquea. El hook
no se versiona; en cada clon hay que recrearlo (script en `AGENTS.md` §8).

## Despliegue

Vercel con el preset de Next.js. Cargar las variables de la tabla en Production y Preview;
`SUPABASE_SECRET_KEY` solo como variable de servidor. La página es dinámica: cada visita consulta la
base.
