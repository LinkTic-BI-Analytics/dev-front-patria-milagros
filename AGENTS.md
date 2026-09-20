<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sistema de Escucha y Planeación Nacional — guía técnica

Guía para quien (persona o agente) vaya a tocar este repositorio. El bloque de arriba lo gestiona
`next dev`: **no se edita ni se borra**. Todo lo demás de este archivo es del proyecto.
Para personas hay una versión corta en `README.md`; el detalle histórico está en `docs/`.

## 1. Qué es y para quién

- **Producto.** Tablero de lectura para el Gobierno de Colombia. La ciudadanía registra aportes
  (dolores, problemáticas, propuestas) por tres canales (`web`, `asistida`, `voz_transcrita`). El
  tablero muestra **dónde** ocurren (departamentos y municipios DIVIPOLA), **de qué** hablan (24
  sectores del Gobierno), **cómo avanza su atención** (necesidades/expedientes y alertas) y **con
  qué ejes y líneas del PND 2026–2030** se relacionan. El mapa es el protagonista.
- **Usuarios.** Personal institucional con un único token compartido. No hay roles ni usuarios. El
  tablero **no escribe** datos.
- **Tono.** Dark-first, marca «Patria Milagro» (`public/linea-grafica-patria/`), mucha animación,
  globo 3D y órbita 3D de ejes. Español de Colombia en toda la interfaz **y en el código**
  (nombres de variables, componentes y comentarios en español).
- **Principio de confianza.** Nada lo redacta un modelo. La generalidad narrativa y la relación con
  el PND salen de contar y de palabras clave, «sin inteligencia artificial», verificables contra la
  tabla. No introducir IA generativa en el producto sin que el cliente lo pida.

## 2. Stack (versiones exactas en `package.json`)

Next.js **16.3.5** (App Router, `src/`), React **19.2**, TypeScript estricto, Tailwind **v4**
(`@theme inline`), motion **13** (`motion/react`), mapbox-gl **3.30**, recharts **3**, lucide-react,
`@supabase/supabase-js` (solo servidor), pnpm. Sin tests automatizados: se verifica con lint, tipos,
build y un recorrido en navegador (§11).

Particularidades de Next 16 que ya se usan aquí (leer `node_modules/next/dist/docs/` antes de tocar):
`src/proxy.ts` reemplaza a `middleware`; `cookies()` es asíncrono; `error.tsx` recibe `retry` además
de `reset`; en `next/image`, `priority` está obsoleto → `preload`; `connection()` fuerza render
dinámico; las server actions son POST públicos y **validan la sesión ellas mismas**.

## 3. Mapa de carpetas

```
AGENTS.md / CLAUDE.md / README.md   Documentación (CLAUDE.md importa este archivo).
docs/hoja-de-ruta-ux.md             Auditoría UX (130 hallazgos) y plan por oleadas, con estado.
docs/inventario-tecnico.md          Instantánea técnica detallada (19-sep-2026). Manda este AGENTS.md.
baas/                               COPIA de referencia del esquema de la base. Aquí no se ejecuta.
scripts/preparar-geo.mjs            GeoJSON originales → public/data/geo/*.json + src/lib/geo/cajas.json
scripts/generar-iconos.mjs          icon.svg → favicon.ico + apple-icon.png (macOS + Chrome)
top_secret/                         PDF confidencial del PND. SOLO LOCAL (§8).
public/data/*.geojson               Originales (no se tocan). public/data/geo/*.json: generados.
public/linea-grafica-patria/        Kit de marca: tokens, assets, guía.
src/proxy.ts                        Guardia de sesión.
src/app/
  layout.tsx, globals.css           <html data-theme="dark">, fuentes, utilidades propias, overrides.
  not-found.tsx, global-error.tsx   404 y fallo antes del layout, los dos con la marca.
  (tablero)/layout.tsx              El fondo vivo (aurora): solo donde se ve.
  styles/tokens.css, tailwind-theme.css   COPIAS del kit de marca: no se editan (se sobrescribe en globals.css).
  (tablero)/page.tsx                Server Component: connection() → obtenerTablero() → <Tablero datos>.
  (tablero)/acciones.ts             Server action `actualizarTablero` (botón «Actualizar» del encabezado).
  (tablero)/loading.tsx, error.tsx  Esqueleto y error con marca (retry, digest copiable, cerrar sesión).
  acceso/                           Login: page, FormularioAcceso (cliente), acciones `ingresar`/`salir`.
src/lib/
  supabase/servidor.ts              clienteServidor(): llave secreta, esquema `participacion`.
  auth/sesion.ts                    Cookie firmada HMAC (§5).
  datos/tipos.ts                    Contrato servidor→cliente `DatosTablero`.
  datos/tablero.ts                  obtenerTablero(): toda la lectura y el armado en servidor.
  datos/agregar.ts                  Puro, en cliente: filtrar, enTerritorio, valoresMapa, resumir, ejeMeses (R1/R2).
  datos/narrativas.ts               Puro: cuerpoDe, narrativasDe, agruparNarrativas, terminosClave, generalidad, alineacionPnd.
  datos/ejes.ts                     resumenEjes(): lo que muestra el modal de ejes (por eje: líneas, necesidades, alertas, relato).
  datos/catalogos.ts                TEMAS (24 + sin_tema), CANALES, ESTADOS_ATENCION, METRICAS, RAMPA_MAPA, formatos.
  datos/internacional.ts            cifrasPorPais(): único punto para enchufar datos por país.
  datos/titulares.ts                titular(): la frase del héroe, por reglas y en orden de prioridad.
  datos/estadoUrl.ts                leerEstado()/escribirEstado(): la vista compartible en la URL.
  pnd/catalogo.json, cargar.ts, alinear.ts   Catálogo del Plan (6 ejes, 43 líneas) y alineador por palabras clave.
  geo/cajas.json                    bbox por departamento.
  ui/movimiento.ts                  EASE, DUR, RESORTE y reducirMovimiento(): ÚNICA fuente de curvas y tiempos.
  ui/useEscape.ts                   Pila de Esc por capas (§9).
src/components/
  Proveedores.tsx                   <MotionConfig reducedMotion="user">.
  tablero/Tablero.tsx               Orquestador cliente: estado global y memos de agregación.
  tablero/Encabezado.tsx            Ejes articuladores, «Datos en vivo», «Actualizado hace X min» (botón), Salir.
  tablero/ControlesMapa.tsx         MigaTerritorio, SelectorMetrica (ámbito, métrica, 2D/3D), BarraFiltros.
  tablero/TarjetasKpi.tsx           KPI; aportes/necesidades/alertas son botones que cambian la métrica del mapa.
  tablero/Graficas.tsx              Seccion, GraficaTemas, GraficaEvolucion, EstadoAtencionBarra, Ranking.
  tablero/Narrativas.tsx            Pestañas Panorama / Plan Nacional / Narrativas, chips de filtros, tablas.
  tablero/AlineacionPnd.tsx         Bloque del Plan (exporta SIN_RELACION).
  tablero/EstadoVacio.tsx           Vacío con causa y salida. CifraAnimada.tsx: variantes mono/display.
  tablero/Presentacion.tsx          Modo presentación: seis pasos, siempre a mano.
  ui/Segmentado.tsx, ui/Pista.tsx   Radiogroup con pastilla y tooltip por portal.
  mapa/MapaColombia.tsx             Mapbox: capas, intro, interacción, tooltip, leyenda + `pie`, error.
  mapa/paises.ts                    Capas pais-*, zoomGlobo() y crearGiro() (integrador del giro).
  mapa/estilo.ts                    Expresiones y escala de color compartidas.
  ejes/ModalEjes.tsx, useOrbita.ts  Modal de ejes: órbita 3D, panorama, ficha del eje; el hook lleva todos los gestos.
```

## 4. Flujo de datos

1. `proxy.ts` valida la cookie → `(tablero)/page.tsx` llama a `connection()` (sin caché) y a
   `obtenerTablero()`.
2. **Supabase solo en servidor.** `SUPABASE_SECRET_KEY` (rol `service_role`). El esquema
   `participacion` tiene RLS sin políticas y `revoke` a `anon`/`authenticated`: **nunca** se consulta
   desde el navegador ni se le pone prefijo `NEXT_PUBLIC_` a esa llave.
3. **PostgREST corta en 1000 filas.** El helper `todas()` pagina con `.range()` y **siempre** con un
   orden estable (`id`, o `codigo,version`). Sin orden la paginación duplica o pierde filas.
4. Un `Promise.all` lee `territorio`, `aporte` (no retirados), `ubicacion`,
   `vinculo_aporte_expediente`, `expediente_territorio`, `actuacion`, `alerta`, `sintesis`, el RPC
   `indicadores(p_proceso)` (si falla → `null`, no tumba nada) y `cargarPnd()`.
5. **Armado en servidor:** síntesis vigente = mayor `version`; ubicación confirmada = municipios de 5
   dígitos con `estado = confirmada`; fechas en `America/Bogota`; tema por `resolverTema`; alineación
   PND una vez por aporte (síntesis vigente ?? `relato_original`) → `eje` y `linea`; estado del
   expediente derivado de actuaciones (respuesta > remisión > recepción > sin respuesta).
6. **Contrato `DatosTablero`** viaja como props. **No viajan** `relato_original` ni el vocabulario
   (`claves`, `sectores`) del catálogo del Plan.
7. **Agregación en cliente** (`Tablero.tsx`, todo `useMemo`): `filtrar(datos, {temas, canales, ejes})`
   → `valoresMapa`, `resumir(filtrados, codigo, ejeMeses)`, `cifrasPorPais`. `codigo = seleccion ??
departamento` (`null` en ámbito internacional). `enTerritorio` compara por prefijo DIVIPOLA.
   - Lo que **es a la vez gráfica y filtro** se calcula sin su propio filtro: temas sin filtro de tema;
     ejes (modal y pestaña Plan) con `filtradosSinEje`. Si no, al filtrar quedaría una sola barra.
8. **Reglas de conteo** (de `07_conteo.sql`, replicadas en `agregar.ts`):
   - **R1.** Una necesidad en N municipios es **una** en el departamento y en el país.
   - **R2.** Un aporte sin ubicación confirmada cuenta en el total nacional y en ningún territorio.
   - Siempre se cuentan elementos **distintos por nivel**; nunca se suman subtotales.
   - Un aporte sin eje no pasa el filtro por eje (no hay asignación por descarte).
9. **Control.** Sin filtros, los totales del cliente deben coincidir con el RPC `indicadores`
   (`control`). El pie del panel lo dice cuando concilian.
10. **La vista viaja en la URL** (`estadoUrl.ts`): ámbito, territorio, métrica, 2D/3D, filtros y
    pestaña. Se escribe con `replaceState` (cada clic en el mapa no es una página del historial) y
    `page.tsx` la lee de `searchParams`. La búsqueda y la vista de la tabla se quedan locales.
11. **«Datos en vivo».** No hay refresco automático. El botón del encabezado llama a la server action
    `actualizarTablero` (valida sesión; `null` = sesión vencida → `/acceso`) y reemplaza `datos` en
    el estado de `Tablero` **sin recargar ni perder filtros, territorio o cámara**.

## 5. Autenticación

- Un token compartido (`ACCESS_TOKEN`). Sesión sin estado: cookie `spn_sesion` =
  `"<vence_epoch_s>.<HMAC-SHA256 base64url>"` firmada con `SESSION_SECRET` (Web Crypto, igual en
  proxy y servidor). **Firmada, no cifrada.** Dura 12 h (`DURACION_SESION_S`); la interfaz ya no lo
  anuncia (decisión del cliente: se quitó solo el texto, la caducidad sigue).
- `ingresar`: `.trim()` al token, comparación de tiempo constante y 600 ms de pausa si falla.
  `salir`: borra la cookie, con confirmación en el encabezado.
- **Sesión vencida:** si llega una cookie que ya no vale, el proxy redirige a
  `/acceso?vencida=1&volver=<ruta>`; tras entrar se vuelve allí. `volver` pasa siempre por
  `rutaInterna()`, que solo deja rutas propias: sin esa guarda sería una redirección abierta.
- `proxy.ts`: sin sesión → `/acceso`; con sesión en `/acceso` → `/`. **El matcher excluye**
  `_next/*`, `data/`, `linea-grafica-patria/` y rutas que terminan en
  `.png|.jpg|.jpeg|.svg|.webp|.ico|.json|.geojson`: todo eso se sirve **sin autenticación**. No crear
  rutas con datos que terminen en `.json`.

## 6. Cartografía y mapa

- Cruce por código DIVIPOLA (2 dígitos departamento, 5 municipio); fuentes con `promoteId: "codigo"`.
  Nombres y centroides vienen de la base, no del GeoJSON.
- `municipios.json` (2 MB) baja en paralelo pero **no bloquea** la entrada: la fuente nace vacía y se
  llena con `setData` (`municipiosListos`). Si falla la geometría o el estilo, el mapa muestra su
  propio estado de error y el resto del tablero sigue vivo.
- Capas propias `dep-*`, `mun-*`, `pais-*`, `cifras-texto`. Feature-state: `t` (0–1, −1 sin
  registros, color por raíz cuadrada), `h` (altura 3D), `hover`, `sel`, `activo`, `atenuado`.
- `vestirMapaBase` repinta el estilo por **ids de capa clásicos** (`water`, `admin-0-boundary*`,
  `country-label`…) y oculta lo demás: un estilo con otros ids queda desnudo.
- Interacción: clic selecciona; **botón «Ver municipios de X»** o doble clic entra al departamento;
  en Mundo, **un clic en Colombia** vuelve al detalle nacional. `cooperativeGestures` (la página
  tiene scroll). Esc sube un nivel (§9).
- **Globo (ámbito internacional).** `zoomGlobo(ancho, alto, libre, k=0.85)` es la inversa exacta de
  la cámara del globo: el disco ocupa ~85 % del lado menor del contenedor y se reencuadra al
  redimensionar. `crearGiro` es un **integrador de velocidad angular** (acelera τ=0,9 s, frena
  τ=0,3 s, crucero 3°/s, `dt` ≤ 1/30 s, un `jumpTo` por cuadro) que **calla mientras la persona
  agarra el globo o la cámara se mueve**. Frena solo sobre países con datos, se bloquea con el modal
  abierto (`pausado`) y tiene botón de pausa. El relevo de capas Colombia ↔ Mundo ocurre bajo un velo.

## 7. Temas

`TEMAS` = 24 sectores del Gobierno + `sin_tema`. `resolverTema` acepta slug o etiqueta oficial
(compacta a `[a-z0-9]`). Valores desconocidos → `console.warn` en servidor. `baas/` aún trae el
`check` antiguo de 18 temas: la base real ya opera con los 24.

**`text-base` es un COLOR en este tema** (token `--color-base`), no un tamaño: para 16 px usar
`text-[1rem]`.

## 8. Módulo PND y confidencialidad

- `src/lib/pnd/catalogo.json`: `{fuente, ejes[6]}`; cada eje `{id, numero, nombre, vision,
indicadores|null, area, lineas[{id, nombre, sectores[], claves[]}]}` (43 líneas). Es **derivado**
  del PDF y **sí se versiona y se despliega**.
- `alinear.ts` (genérico): claves como palabra completa sobre texto normalizado; 2 puntos por clave,
  3 si es frase; desempates: sector del aporte ∈ `sectores` → primera mención → orden del catálogo;
  sin claves → `null`.
- `cargar.ts` es `server-only`; si el catálogo es inválido `pnd = null` y desaparece todo lo del Plan.
- **EL PDF DE `top_secret/` ES CONFIDENCIAL Y SOLO EXISTE EN LOCAL.** Nunca se hace commit, push ni
  se envía a servicios externos. Barreras: `.gitignore` (`/top_secret/*.pdf`),
  `outputFileTracingExcludes` en `next.config.ts` y el hook local (no versionado; recrearlo en cada
  clon):

  ```sh
  # .git/hooks/pre-commit  (chmod +x)
  #!/bin/sh
  if git diff --cached --name-only | grep -qi '^top_secret/.*\.pdf$'; then
    echo "Commit bloqueado: hay un PDF de top_secret/ en el índice (documento confidencial)." >&2
    echo "   Quítelo con: git restore --staged top_secret/" >&2
    exit 1
  fi
  ```

- Tampoco se versiona ningún `.env*` (salvo `.env.example`).

## 9. Convenciones de interfaz

- **Movimiento.** Curvas, duraciones y resortes salen de `src/lib/ui/movimiento.ts`. `MotionConfig`
  cubre `reducedMotion`; lo imperativo (`animate()`, Mapbox, WAAPI) consulta `reducirMovimiento()`.
- **Esc por capas** (`useEscape`): solo responde la capa superior. Base en `Tablero`: selección →
  departamento → Mundo→Colombia. Encima: popovers, modal. Un campo de texto se queda con su Esc.
- **Un solo filtro por cosa.** `filtros = {temas, canales, ejes}` vive en `Tablero`. El eje se filtra
  desde la barra del mapa, el modal o la pestaña Plan, y es el mismo. Lo único local de Narrativas es
  «sin relación clara» (excluyente con ejes). Todo filtro activo se ve como **chip removible**.
- **Vacíos** con `EstadoVacio`: dicen por qué y ofrecen salida. Nunca un recuadro en blanco.
- **Cifras grandes** con `CifraAnimada variante="display"` (la mono separa la coma decimal).
- **Vocabulario:** «aportes», «necesidades», «alertas», «narrativas». No «participaciones».
- **Foco visible** dorado global (`:focus-visible` en `globals.css`). El modal es un diálogo real:
  fondo `inert`, trampa de Tab, foco de regreso, scroll del `<body>` bloqueado.
- **Modal de ejes.** Todos los gestos pasan por `useOrbita`: flechas, puntos, teclado (←/→, Inicio/Fin,
  1–6), rueda/trackpad (pasos discretos, listener nativo no pasivo) y arrastre con inercia.
  `PERSPECTIVA` del hook debe coincidir con `[perspective:1400px]`.
- **Radiogroup o tabs, no los dos.** `Segmentado` (ámbito, métrica, vista de la tabla) es un
  `radiogroup`: elige un valor. `role="tab"` solo donde hay paneles (narrativas, puntos del modal).
- **Mínimos táctiles:** 44 px en cualquier control que se toque (`pointer-coarse:h-11` /
  `pointer-coarse:size-11`), o área extendida con `after:absolute after:-inset-2` cuando el control
  es pequeño a propósito.
- **Nada por debajo de 11 px**, y a 11 px solo `.etiqueta` (en mayúsculas y con peso 700) y las
  cifras auxiliares.
- **Duraciones y curvas** (todas en `movimiento.ts`):

  | Uso                                  | Valor                                      |
  | ------------------------------------ | ------------------------------------------ |
  | Aparecer / desaparecer algo pequeño  | `DUR.rapida` 0,2 s                         |
  | Cambio de contenido                  | `DUR.base` 0,32 s                          |
  | Entrada de un panel o del modal      | `DUR.lenta` 0,5 s                          |
  | Escena (intro, vuelo del mapa)       | `DUR.escena` 0,9 s · vuelos de 1,7 a 2,8 s |
  | Pastilla que se mueve entre opciones | `RESORTE.pastilla`                         |
  | Anillo del modal de ejes             | `RESORTE.orbita`                           |
  | Curva por defecto                    | `EASE.salida`                              |

- Sobrescrituras de marca en `globals.css` (vidrio más opaco con `brightness`, `--text-secondary` y
  `--text-muted` con contraste AA, `--border-control`). No tocar `styles/tokens.css` ni
  `tailwind-theme.css`: son copias literales del kit.
- Formato: Prettier a 100 columnas (`npx prettier --print-width 100`); no hay config versionada.

## 10. Trampas conocidas (todas ya costaron un bug)

**Mapbox**

- **No usar `map.isStyleLoaded()` como guarda** de efectos: se queda en `false` y los departamentos
  no se pintan nunca. La guarda es `mapaListo()` (existen `dep-relleno` y `pais-relleno`).
- `jumpTo`/`setCenter` **cancelan** cualquier `easeTo`/`fitBounds` en curso → el giro calla cuando
  `map.isMoving()`. Pasar siempre `padding` explícito.
- Un mapa por contenedor: React puede remontar efectos. La limpieza reinicia `capasListas`,
  `municipiosListos` e `introTerminada`. Sin eso: «Style is not done loading».
- No encadenar lógica a `moveend` sin temporizador de respaldo (puede no llegar).
- Las propiedades con feature-state no transicionan: los fundidos se hacen con un velo DOM.
- `mapbox-gl.css` pone `position: relative` al contenedor → va envuelto en un `absolute inset-0`.

**motion / React**

- **Nada de `AnimatePresence mode="wait"` para texto con clave de datos** (dejó títulos colgados dos
  veces). Usar elementos con `key` sin salida, o una rejilla apilada `[grid-area:1/1]`.
- Un `style.transform` en cadena anula los MotionValue de transform → `transformTemplate`, o
  posición en el contenedor y `whileHover` en el hijo.
- Sobre ancestros `preserve-3d`: ni `layout`, ni `filter`, ni `backdrop-filter`, ni `opacity`/`overflow`
  en el anillo. La profundidad de las tarjetas se da con un velo interno.
- `react-hooks/refs`: si un hook devuelve un `useRef`, el linter trata **todo el objeto** como ref y
  prohíbe leerlo al renderizar → devolver un ref de callback (`useState`) y envolverlo al pasarlo a `ref`.
- Nada de `Date.now()` al renderizar: el «hace X min» usa `useSyncExternalStore` con un reloj.

**Next 16**

- Server actions = POST público: validan sesión dentro. Sin `redirect()` dentro de un `try` del
  cliente; la acción devuelve `null` y el cliente navega con `router.replace`.
- `next dev` reescribe el bloque `nextjs-agent-rules` de este archivo: se versiona tal cual.

## 11. Cómo verificar un cambio

1. `pnpm exec tsc --noEmit`, `pnpm lint` y `pnpm build` limpios.
2. Recorrido en navegador (producción local: `pnpm build && pnpm start -p 3100`): entrada → clic en
   departamento → «Ver municipios» → KPI de alertas → Mundo (globo encuadrado, giro suave) → clic en
   Colombia → «Ejes articuladores» (flechas, rueda, arrastre, teclado, filtrar, Esc) → pestañas de
   narrativas, chips y búsqueda → «Actualizar». Sin errores de consola, un solo `canvas` de mapa, sin
   scroll horizontal a 390 px.
3. **Nunca escribir el token real en una página durante pruebas automatizadas**: se forja una cookie
   local con `SESSION_SECRET`.
4. Datos: sin filtros, los totales coinciden con el RPC `indicadores`; el modal de ejes cuadra con el
   KPI del mismo territorio y filtros.
5. `git status` sin PDF ni `.env*`.

## 12. Variables de entorno y despliegue

| Variable                                               | Uso                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                             | URL del proyecto (se lee solo en servidor)                                       |
| `SUPABASE_SECRET_KEY`                                  | Llave secreta. **Solo servidor, jamás `NEXT_PUBLIC_`**                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                 | Reservada; hoy ningún archivo la usa                                             |
| `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPBOX_STYLE` | Mapa base (restringir el token por URL)                                          |
| `ACCESS_TOKEN`                                         | Token único de acceso                                                            |
| `SESSION_SECRET`                                       | HMAC de la cookie (`openssl rand -base64 32`). Rotarla cierra todas las sesiones |

Vercel con el preset de Next.js y pnpm; cargar las variables en Production y Preview. La página es
dinámica: cada visita hace ~9 lecturas paginadas a Supabase. Commits y push a `main` **solo cuando
la persona responsable lo indique**.

## 13. Estado del rediseño UX

**Las siete oleadas de `docs/hoja-de-ruta-ux.md` están implementadas** (0 cimientos · 1 globo y
navegación del modal · 2 información del modal · 3 defectos del tablero · 4 pulido · 5 profundidad ·
6 opcionales). Lo que queda fuera, y por qué:

- **R2** (recorte condicional del vidrio sobre el mapa) pide una grabación de rendimiento en el
  equipo del cliente. El vidrio ya usa menos desenfoque; si allí se midieran cuadros por encima de
  16 ms, la receta está en la hoja de ruta.
- **R5** (tween del coroplético en JS) depende de que M7 no baste; M7 está hecho y funde bien.
- **M9 parcial:** el resaltado ranking → mapa está; el buscador «Ir a…» y la ficha anclada en táctil
  no, porque M1 (botón «Ver municipios») ya resuelve el caso.
- Pendiente de equipos reales: trackpad y Magic Mouse en Safari, ratón de muescas en Windows y
  Firefox, iOS y Android.

Cosas que nacieron en estas oleadas y conviene conocer: estado de la vista en la URL
(`src/lib/datos/estadoUrl.ts`, con «Copiar enlace de esta vista»), modo presentación de seis pasos
(`Presentacion.tsx`), titulares por reglas (`titulares.ts`), hoja de filtros en móvil
(`ControlesMapa.tsx`) y regreso seguro tras una sesión vencida (`?vencida`, `?volver` con
`rutaInterna`).
