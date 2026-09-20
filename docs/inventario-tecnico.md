> Inventario levantado leyendo el código en el commit `ccb226d`. Es insumo de AGENTS.md y README.md; ante una diferencia, manda el código.

# Inventario técnico: Sistema de Escucha y Planeación Nacional

> **Instantánea del 19 de septiembre de 2026**, previa al rediseño UX (oleadas 0–4). La guía vigente es [`AGENTS.md`](../AGENTS.md); este documento se conserva por su detalle.


Raíz del repositorio: `/Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros`. Todas las rutas de este documento son relativas a esa raíz, salvo la lista final.

Remoto `origin`: `https://github.com/LinkTic-BI-Analytics/dev-front-patria-milagros.git`. Rama `main`, 7 commits.

Todo sale de leer el código y los archivos del repositorio. No ejecuté lint, tipos, build ni la aplicación.

## 1. Objetivo del producto y usuarios

- **Qué es.** Un tablero de lectura para el Gobierno de Colombia. La ciudadanía registra aportes (dolores, problemáticas, propuestas) por tres canales: `web`, `asistida` y `voz_transcrita`. El tablero muestra dónde ocurren (departamentos y municipios DIVIPOLA), de qué hablan (24 sectores del Gobierno), cómo avanza su atención (necesidades/expedientes y alertas) y con qué ejes y líneas del PND 2026–2030 se relacionan.
- **Usuarios.** Personal institucional autorizado, con un único token compartido. No hay roles ni usuarios individuales. El tablero no escribe datos.
- **Tono exigido por el cliente.** Mucho show visual: dark-first, marca "Patria Milagro", animación en todo, globo 3D y órbita 3D de ejes.
- **Principio de confianza, repetido en comentarios y pies de la UI.** Nada lo redacta un modelo. La generalidad narrativa y la relación con el PND salen de contar y de palabras clave, "sin inteligencia artificial", para que cualquiera pueda verificarlas contra la tabla.
- **Estado.** El login dice "Tablero territorial · Entrega 1". El catálogo del PND está marcado como borrador de uso interno.

## 2. Stack y versiones exactas

Versiones leídas de `node_modules/*/package.json`.

| Pieza | Versión instalada | Nota |
|---|---|---|
| next | 16.3.5 | App Router en `src/`. `proxy.ts` reemplaza a `middleware` y corre en runtime Node.js por defecto. La documentación está empaquetada en `node_modules/next/dist/docs/`. |
| react, react-dom | 19.2.8 | Se usan `useActionState` y Server Actions. |
| typescript | 5.9.3 | `strict`, `moduleResolution: bundler`, alias `@/*` → `./src/*`, `resolveJsonModule`. |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | Configuración por CSS (`@theme inline`). No existe `tailwind.config`. |
| motion | 13.3.0 | Se importa desde `motion/react`. |
| mapbox-gl | 3.30.0 | Proyección `globe`, feature-state, fill-extrusion. |
| recharts | 3.10.1 | Solo el `AreaChart` de evolución. |
| lucide-react | 1.46.0 | Iconos, incluido el de cada sector en `catalogos.ts`. |
| @supabase/supabase-js | 2.116.0 | Solo en servidor, esquema `participacion`. |
| server-only | 0.0.1 | Protege `tablero.ts`, `servidor.ts` y `pnd/cargar.ts`. |
| eslint, eslint-config-next | 9.39.5, 16.3.5 | Configuración plana (core-web-vitals + typescript). |
| pnpm | 12.4.1 (`packageManager`) | Lockfile v9.0. `pnpm-workspace.yaml` solo trae `allowBuilds: {sharp: false, unrs-resolver: false}`. |
| Node | local v24.18.1 | Next exige 20.9 o superior. |

- **Fuentes.** Se cargan con `next/font/google` en `src/app/layout.tsx`: Montserrat 700/800/900 (display), Inter (cuerpo) y JetBrains Mono 500/700 (cifras). Las variables son `--fuente-montserrat`, `--fuente-inter` y `--fuente-mono`.
- **Tests.** No hay pruebas automáticas, CI, Docker ni `vercel.json`.

## 3. Mapa de carpetas y responsabilidades

```
AGENTS.md            Bloque gestionado por `next dev` (<!-- BEGIN/END:nextjs-agent-rules -->). Hoy solo tiene ese bloque.
CLAUDE.md            Una línea: `@AGENTS.md` (importa AGENTS.md).
README.md            Documentación actual, breve (ver la sección 14 para lo que le falta).
next.config.ts       outputFileTracingExcludes {"/*": ["./top_secret/**/*.pdf"]}
.env.example         Nombres de variables (ver la sección 11). `.env` y `.env.local` existen en local y están ignorados.
.gitignore           Ignora `.env*` (menos `.env.example`), `.vercel`, `*.tsbuildinfo` y `/top_secret/*.pdf`.
baas/                COPIA de referencia del repositorio de backend; aquí no se ejecuta nada.
  20260915215046_esquema.sql   Esquema declarativo concatenado (1.232 líneas): esquemas `participacion` e `identidad`.
  BASE-DE-DATOS.md             Mapa de las 20 tablas. Sus enlaces (`producto/…`, `AGENTS.md §8/§9`, `decisiones/…`, `scripts/esquema.sh`) apuntan al OTRO repositorio y aquí no existen.
scripts/
  preparar-geo.mjs   GeoJSON originales → `public/data/geo/*.json` + `src/lib/geo/cajas.json`.
  generar-iconos.mjs `src/app/icon.svg` → `favicon.ico` (16–256 px) + `apple-icon.png` (180 px). Usa Chrome headless por CDP con ruta fija de macOS (`/Applications/Google Chrome.app/...`), puerto 9444 y el WebSocket global de Node.
top_secret/          PDF confidencial del PND. Solo existe en local: está ignorado, lo vigila un hook local y se excluye del trazado del build.
public/
  data/*.geojson     ORIGINALES: departamentos (1,5 MB), municipios (4,9 MB), internacional (0,8 MB).
  data/geo/*.json    Generados: departamentos 33 features (650 KB), municipios 1.120 (2,1 MB), paises 177 (203 KB).
  linea-grafica-patria/  Guía de marca: LINEA-GRAFICA.md, documentacion.html, tokens/ (css, json, tailwind), assets/ (escudo, logos, `fondo-bandera-dark.png` de 1,5 MB), capturas/.
src/proxy.ts         Guardia de sesión (Next 16).
src/app/
  layout.tsx         <html lang="es" data-theme="dark">, fuentes, `.fondo-vivo` (aurora) y `.grano` (ruido, z-60).
  globals.css        Importa tailwindcss, tokens y tema. Define las utilidades propias: .cifra .etiqueta .titulo-display .tricolor .vidrio .panel .shimmer .scroll-fino .estrellas .fondo-vivo .grano. Trae las animaciones shimmer/aurora/pulso/titilar, los overrides de los controles de Mapbox y prefers-reduced-motion global.
  styles/tokens.css  Primitivos (rampas blue/gold/red/neutral, radios, tipografía, motion) y semánticos dark (por defecto) y light (`[data-theme="light"]`).
  styles/tailwind-theme.css  `@theme inline`: conecta los semánticos con utilidades (bg-base, bg-surface-1..3, text-primary/secondary/muted/accent/link, border-subtle/default/strong, bg-action-primary, text-success/warning/danger/info y sus -bg, gold-500/600, blue-700/800/950, red-500, radios xs/sm/md/lg, shadow-card/deep/glow-gold/glow-blue).
  icon.svg, favicon.ico, apple-icon.png
  (tablero)/page.tsx     Server Component: `await connection()` (dinámico en cada solicitud) → `obtenerTablero()` → `<Tablero datos>`.
  (tablero)/loading.tsx  Esqueleto con escudo, shimmer y el texto "Consolidando el panorama nacional".
  (tablero)/error.tsx    Cliente. Reintenta con `unstable_retry` (Next ≥16.2) → `reset` → `location.reload()`. Muestra `error.digest`.
  acceso/page.tsx        Metadata + `<FormularioAcceso/>`.
  acceso/acciones.ts     Server Actions `ingresar` (useActionState) y `salir`.
  acceso/FormularioAcceso.tsx  Login animado. Las líneas 208-210 muestran "Sesión cifrada · vence a las 12 horas".
src/lib/
  supabase/servidor.ts   `clienteServidor()`: createClient(URL, SUPABASE_SECRET_KEY, {db.schema: "participacion", sin sesión persistente}).
  auth/sesion.ts         Cookie HMAC (ver la sección 5).
  datos/tipos.ts         Contrato servidor→cliente `DatosTablero` y sus resúmenes.
  datos/tablero.ts       `obtenerTablero()`: toda la lectura y el armado en servidor.
  datos/agregar.ts       Puro, corre en cliente: `filtrar`, `enTerritorio`, `valoresMapa`, `resumir`, `ejeMeses`. Implementa R1 y R2.
  datos/narrativas.ts    Puro: `cuerpoDe`, `normalizar`, `narrativasDe`, `agruparNarrativas`, `terminosClave`, `generalidad`, `alineacionPnd`.
  datos/catalogos.ts     TEMAS (24 + sin_tema), `resolverTema`, `temaReconocido`, `temaDe`, CANALES, ESTADOS_ATENCION, RAMPA_MAPA, ETAPAS_ALERTA, METRICAS, `etiquetaMes`, `formatoNumero`, `nombrePropio`.
  datos/internacional.ts `cifrasPorPais`, `COLOMBIA_ISO`, `SIN_DATOS`: único punto para enchufar datos por país.
  pnd/catalogo.json      6 ejes, 43 líneas. Cada línea trae {id, nombre, sectores[], claves[]}.
  pnd/cargar.ts          server-only; valida la forma del catálogo (`esCatalogo`) y devuelve `null` si es inválida.
  pnd/alinear.ts         `crearAlineador(lineas)` → `alinear(texto, sector)`. Es genérico: no sabe nada del Plan.
  geo/cajas.json         bbox [x0,y0,x1,y1] por código de departamento (33).
src/components/
  tablero/Tablero.tsx    Orquestador cliente: estado global (filtros, métrica, departamento, selección, modo3d, ámbito, modal) y memos de agregación.
  tablero/Encabezado.tsx Barra fija: escudo, título, botón "Ejes articuladores" (con el número de ejes filtrados), "Datos en vivo", "Corte <hora Bogotá>" y Salir (form → action `salir`).
  tablero/ControlesMapa.tsx  `MigaTerritorio`, `SelectorMetrica` (ámbito Colombia/Mundo, métrica, 2D/3D) y `BarraFiltros` (popover de temas, ejes 1–6, canales, limpiar).
  tablero/TarjetasKpi.tsx, CifraAnimada.tsx, Graficas.tsx (`Seccion`, `GraficaTemas`, `GraficaEvolucion`, `EstadoAtencionBarra`, `Ranking`)
  tablero/Narrativas.tsx Pestañas Panorama / Plan Nacional / Narrativas. Generalidad, tablas agrupada y completa, búsqueda y paginación de a 8.
  tablero/AlineacionPnd.tsx  Pestaña Plan Nacional. Exporta `SIN_RELACION`.
  mapa/MapaColombia.tsx  Mapbox: capas, intro, hover/clic/doble clic, efectos por props, tooltip y leyenda. Se carga con `dynamic(..., {ssr:false})`.
  mapa/paises.ts         Capas `pais-*` y `crearGiro` (giro del globo).
  mapa/estilo.ts         `RELLENO_VACIO`, `exp`, `estado`, `colorPorT`, `reducirMovimiento`.
  ejes/ModalEjes.tsx     Modal de órbita 3D. Se importa con `dynamic` solo al abrirlo.
```

## 4. Flujo de datos de punta a punta

1. **Solicitud y sesión.** `src/proxy.ts` valida la cookie. Luego `(tablero)/page.tsx` llama a `connection()` para forzar el render dinámico, sin caché.
2. **Lectura en servidor.** `obtenerTablero()` en `src/lib/datos/tablero.ts` usa `clienteServidor()` con la llave `SUPABASE_SECRET_KEY`.
   - Esa llave usa el rol `service_role`, que salta RLS. El esquema `participacion` tiene RLS encendido sin ninguna política y `revoke` explícito a `anon` y `authenticated`. **Por eso Supabase nunca se consulta desde el navegador.**
   - El proceso activo se toma de `proceso`: `retirado_en is null`, orden `creado_en`, `limit 1`. Si no hay ninguno, lanza un error.
3. **Paginación de PostgREST.** El helper `todas()` usa `PASO = 1000`, que es el tope de filas del proyecto.
   - Hace un bucle con `.range(desde, desde+999)` hasta recibir menos de 1000 filas.
   - Siempre pasa un orden estable: `["id"]`, o `["codigo","version"]` para `territorio`. Sin ese orden la paginación duplica o pierde filas.
4. **Lecturas en paralelo.** Un solo `Promise.all` lee lo siguiente y, en el mismo lote, llama a `cargarPnd()`.
   - `territorio`, con nivel departamento o municipio.
   - `aporte`, con `retirado_en is null`. Incluye `relato_original`.
   - `ubicacion`.
   - `vinculo_aporte_expediente`, con `desvinculado_en is null`.
   - `expediente_territorio`.
   - `actuacion`.
   - `alerta`.
   - `sintesis`.
   - El RPC `indicadores(p_proceso)`. Si falla devuelve `null` y no tumba el tablero.
5. **Armado en servidor.**
   - **Catálogo territorial.** Solo cuenta la versión más reciente (`catalogoVersion` es el máximo de `version`).
   - **Síntesis vigente.** Es la de mayor `version` por aporte.
   - **Ubicación del aporte.** Si hay municipios confirmados (`estado === "confirmada"` y código de 5 dígitos), la ubicación es `confirmada`. Si no, se toma el estado de la ubicación más reciente. Sin filas queda en `sin_registro`.
   - **Fechas.** Se pasan a la zona America/Bogota como `fecha` (YYYY-MM-DD) y `mes` (YYYY-MM).
   - **Tema.** `resolverTema(a.tema)`. Los valores desconocidos se registran con `console.warn`.
   - **Alineación con el PND.** Se calcula una vez por aporte sobre la síntesis vigente (`cuerpoDe(texto)`) o, si no hay, sobre `relato_original`. Deja `eje` y `linea` en `AporteResumen`.
   - **Expedientes.** Solo los que tienen al menos un vínculo vigente con un aporte del universo. Su estado se deriva de las actuaciones: respuesta > remisión > recepción > `sin_respuesta_registrada`. Es la misma regla de `participacion.estado_de_atencion`, que nunca devuelve "vencido".
   - **Municipios del expediente.** Salen de `expediente_territorio` y heredan temas, canales y ejes de sus aportes.
   - **Alertas.** La etapa es recibida > contactada > orientada > levantada. `devuelta` equivale a `devuelta_en != null`. Las alertas activas son las no devueltas.
6. **Contrato `DatosTablero`** (`src/lib/datos/tipos.ts`). Viaja al navegador como props RSC con estos campos:
   - `proceso`, `catalogoVersion`, `actualizadoEn`.
   - `aportes[]`, `expedientes[]`, `alertas[]`.
   - `narrativas[]`, que lleva el texto de la síntesis vigente, versión, clase, confirmada y `pnd {linea, eje, claves}`.
   - `pnd`, el resumen sin vocabulario.
   - `departamentos`, `municipios` (nombre, lat, lon y tipo).
   - `control`, la salida del RPC.

   **No viajan** `relato_original` ni las `claves` y `sectores` del catálogo.
7. **Agregación en cliente** (`Tablero.tsx`, todo con `useMemo`).
   - `filtrar(datos, {temas, canales, ejes})` produce `filtrados`.
   - Con `filtrados` se calculan `valoresMapa` (una vez por cada una de las 3 métricas), `resumir(filtrados, codigo, ejeMeses)` y `cifrasPorPais`.
   - `codigo` es `seleccion ?? departamento`, y `null` en el ámbito internacional.
   - `enTerritorio` compara por prefijo: `municipio.startsWith(codigo)` sirve tanto para un departamento (2 dígitos) como para un municipio (5).
   - `conteoTemas` se calcula sin el filtro de tema. `conteosEje` y `conteosLinea` se calculan sin el filtro de eje, para que los demás ejes no queden en cero.
8. **Reglas de conteo.** Las fija el archivo `07_conteo.sql` del esquema y se replican en `src/lib/datos/agregar.ts`.
   - **R1.** Una necesidad en N municipios es una sola en el departamento y en el país.
   - **R2.** Un aporte sin ubicación confirmada cuenta en el total nacional pero en ningún territorio. Un aporte con dos municipios no suma dos.
   - **Cómo se implementa.** Siempre se cuentan elementos distintos por nivel (`new Set(municipios.map(m => m.slice(0,2)))`). Nunca se suman subtotales.
   - **Filtro por eje.** Un aporte sin eje no pasa el filtro por eje. No se asigna eje por descarte.
9. **Control contra el RPC.** Sin filtros activos, `Tablero.tsx:144-150` compara `control.aportes_recibidos`, `control.necesidades` y `control.municipios_con_aportes` con lo calculado en el cliente.
   - Si coinciden, el pie muestra "Totales nacionales conciliados…".
   - Si no coinciden, el tablero calla: no avisa de la discrepancia.
10. **KPI de porcentaje** (`resumir`). En la vista nacional es el % de aportes con municipio ("Ubicación resuelta"). En un territorio es el % del total ubicado del país ("Peso en el país"). Es `null` si el denominador es 0.
11. **Narrativas.** `narrativasDe(datos, filtrados, codigo)` une cada narrativa con su aporte filtrado.
    - `generalidad(filas, referenciaPaís, codigo)` calcula los 3 temas principales (% sobre las narrativas con tema), los 3 relatos más repetidos y 8 términos. `agruparNarrativas` agrupa por cuerpo normalizado.
    - **Términos.** Los calcula `terminosClave` con peso = relatos × log2(1+lift), multiplicado por 1,35 si es un par "X de Y". Cuenta por relato distinto, usa una lista de palabras vacías, solo arma pares con los conectores "de" y "del", y descarta términos contenidos en otros.
    - **Alineación.** `alineacionPnd` cuenta por eje, las líneas con su relato más repetido y sus claves, y las narrativas "sin relación".

## 5. Autenticación

- **Modelo.** Un único token compartido, `ACCESS_TOKEN`. No hay usuarios. La sesión no guarda estado en el servidor.
- **`src/lib/auth/sesion.ts`.**
  - La cookie es `spn_sesion` y su valor tiene la forma `"<vence_epoch_s>.<HMAC-SHA256(vence) en base64url>"`.
  - La llave es `SESSION_SECRET`. Usa Web Crypto (`crypto.subtle`) para funcionar igual en el proxy y en el servidor.
  - `DURACION_SESION_S = 12 h`.
  - `igualesSeguro` hace comparación de tiempo constante, tanto del token como de la firma.
  - `sesionValida` exige el formato `\d+.firma`, que no haya vencido y que la firma coincida.
  - La cookie va **firmada, no cifrada**. El texto "Sesión cifrada" de la UI es inexacto.
- **`src/app/acceso/acciones.ts`.**
  - `ingresar` compara el token. Si falla, espera 600 ms (el único freno a fuerza bruta; no hay límite de intentos) e incrementa `intento`, que sacude la tarjeta.
  - Si acierta, pone la cookie con `httpOnly`, `secure` en producción, `sameSite: lax`, `path: /` y `maxAge` de 12 h, y hace `redirect("/")`.
  - `salir` borra la cookie y redirige a `/acceso`.
- **`src/proxy.ts`** (convención de Next 16: función `proxy`, no `middleware`; runtime Node; `config.runtime` no está permitido).
  - En `/acceso*` con sesión válida redirige a `/`. En el resto, sin sesión redirige a `/acceso`.
  - **El matcher excluye** `_next/static`, `_next/image`, `favicon.ico`, `data/`, `linea-grafica-patria/` y cualquier ruta que termine en `.png|.jpg|.jpeg|.svg|.webp|.ico|.json|.geojson`.
  - La consecuencia es que todo lo que esté en `public/` con esas extensiones se sirve sin autenticación. Aplica a la cartografía, la guía de marca y `documentacion.html`. Una ruta futura terminada en `.json` también saltaría la guardia.
- **Petición del usuario: "quitar lo del tiempo de vencimiento del token" en el login.**
  - El texto visible está en `src/app/acceso/FormularioAcceso.tsx:208-210`: "Sesión cifrada · vence a las 12 horas".
  - La expiración real vive en `DURACION_SESION_S`, tanto en el `maxAge` de la cookie como en el valor firmado.
  - La lectura literal de la petición es quitar solo el texto. Si además se quiere una sesión sin caducidad, hay que cambiar `sesion.ts` y `acciones.ts`, y los documentos nuevos deben reflejar lo que quede.

## 6. Cartografía

- **Originales (no se tocan).**
  - `public/data/colombia-departamentos.geojson` usa la propiedad `DPTO`.
  - `public/data/colombia-municipios.geojson` usa `MPIOS` y `DPTO`.
  - `public/data/internacional.geojson` usa `ADM0_A3`, `NAME_ES`, `CONTINENT`, `LABEL_X` y `LABEL_Y`. Esas propiedades son propias de Natural Earth, pero el repositorio no declara la procedencia del archivo.
- **`node scripts/preparar-geo.mjs` hace esto:**
  - Redondea coordenadas a 5 decimales para Colombia y a 3 para el mundo.
  - Quita puntos repetidos y descarta anillos con menos de 4 puntos.
  - Deja solo `codigo` como propiedad, más `dpto` en municipios. Los nombres vienen de la base.
  - Fusiona features con el mismo código en un MultiPolygon, para que el `feature-state` por código pinte el municipio completo.
  - Calcula el bbox de cada departamento sobre los anillos exteriores y lo escribe en `src/lib/geo/cajas.json`.
  - Adelgaza los países a `{codigo: ISO-3 (ADM0_A3), nombre: NAME_ES, continente, lon, lat}`.
  - Salida actual: 33 departamentos, 1.120 municipios, 33 cajas y 177 países.
- **Cruce con la base.** Se hace por código DIVIPOLA: 2 dígitos para departamento, 5 para municipio, igual a `territorio.codigo`. Los dos primeros dígitos del municipio son su departamento. Las fuentes de Mapbox usan `promoteId: "codigo"`, así que `setFeatureState({source, id: codigo})` funciona directamente.
- **Etiquetas de cifras.** Usan los centroides oficiales de la base (`territorio.latitud` y `territorio.longitud`), no el centroide del polígono.
- **Encuadre.**
  - La constante `COLOMBIA = [[-79.1,-4.25],[-66.85,12.5]]` cubre el territorio continental. San Andrés queda en el borde a propósito.
  - `relleno()` da el padding: `{top:120,bottom:70,left:20,right:20}` si el ancho es menor de 640 px, y `{top:72,bottom:24,left:40,right:40}` si no.
  - Los departamentos se encuadran con `cajas[dpto]`, `maxZoom: 9.5` y, en 3D, `pitch 52` y `bearing -14`.
- **Estilo base.** `NEXT_PUBLIC_MAPBOX_STYLE` apunta hoy a un estilo personalizado de la cuenta de Mapbox.
  - `vestirMapaBase` lo repinta por id de capa clásico: `water`, `land-structure-polygon`, `admin-0-boundary*`, `country-label`, `continent-label` y `water-point-label`. Todas las demás capas las oculta. Un estilo con otros ids quedaría sin vestir.
  - La niebla y las estrellas se ponen con `setFog`.
- **Capas propias.**
  - Departamentos y municipios: `dep-*` y `mun-*`, con `relleno`, `brillo`, `borde`, `3d`, `resplandor` y `contorno`.
  - Etiquetas: `cifras-texto`, un symbol sobre la fuente `cifras`.
  - Países: `pais-*`.
  - **Feature-state.** `t` va de 0 a 1 y vale -1 cuando no hay registros; el color se calcula con raíz cuadrada. `h` es la altura 3D lineal. Los demás estados son `hover`, `sel`, `activo` y `atenuado`.
  - **Color.** La rampa dorada es `RAMPA_MAPA`, interpolada con `interpolate-lab`.
- **Interacción.**
  - `cooperativeGestures: true`: la página tiene scroll, así que el zoom con rueda pide Ctrl o ⌘. Los mensajes están traducidos.
  - `doubleClickZoom: false`.
  - Clic selecciona. Doble clic entra al departamento. Doble clic fuera sale. Con un departamento abierto, los vecinos solo responden al doble clic. `Esc` vuelve a la vista nacional.

## 7. Módulo PND

- **`src/lib/pnd/catalogo.json`** (versionado) tiene la forma `{fuente, ejes[6]}`.
  - Cada eje trae `{id, numero, nombre, vision (~110-170 caracteres), indicadores: number|null, area, lineas[]}`.
  - Cada línea trae `{id, nombre, sectores[] (claves de TEMAS), claves[] (vocabulario)}`.

  | N.º | id | Nombre | Indicadores | Líneas |
  |---|---|---|---|---|
  | 1 | `reconstruccion` | Reconstrucción, Transformación y Resiliencia | 37 | 4 |
  | 2 | `patriotismo` | Patriotismo Constitucional | 51 | 9 |
  | 3 | `milagro_social` | Milagro Social | 100 | 9 |
  | 4 | `milagro_economico` | Milagro Económico | 106 | 12 |
  | 5 | `regiones` | Colombia de las regiones | `null` (batería pendiente) | 4 |
  | 6 | `transformacion_estado` | Transformación del Estado | 18 | 5 |

  Son 43 líneas en total. `fuente` dice: "Formulación del PND 2026–2030 · sesión con enlaces sectoriales · DNP · 16 de septiembre de 2026 (borrador, uso interno)".
- **`src/lib/pnd/cargar.ts`.** Es `server-only`. Importa el JSON para que viaje con el despliegue. `esCatalogo` valida la forma, y si es inválida devuelve `null`. En ese caso `DatosTablero.pnd` es `null` y desaparecen el botón de ejes, el filtro por ejes, la pestaña "Plan Nacional" y la columna "Línea del PND". Esto degrada la interfaz sin producir un error.
- **Reglas de puntuación de `src/lib/pnd/alinear.ts`.**
  1. El texto y las claves se normalizan: minúsculas `es-CO`, sin diacríticos, espacios colapsados. Las claves coinciden como palabra completa, con la regex `(?<![a-z0-9])clave(?![a-z0-9])`. Las coincidencias más largas se aceptan primero y ocupan su tramo sin solaparse.
  2. Cada clave distinta suma 2 puntos, o 3 si es una frase (contiene espacio). Una clave cuenta una sola vez por línea.
  3. Gana la línea con más puntos. Los desempates van en este orden: el sector del aporte está en `sectores` de la línea, luego lo que se menciona primero en el texto, luego el orden del catálogo.
  4. Sin ninguna clave devuelve `null`. Nunca asigna por descarte.
  5. Las `claves` que devuelve son las palabras literales del texto original, en orden de aparición. Las recupera con un mapa de posiciones entre el texto normalizado y el original.
- **Qué viaja al navegador.**
  - De cada eje: `fuente`, `id`, `numero`, `nombre`, `vision`, `indicadores`, `area` y `lineas {id, nombre}`.
  - De cada narrativa: `pnd.claves`, que son palabras del propio relato, no del catálogo.
  - **No viajan** `sectores`, `claves` del catálogo ni `relato_original`.
- **Confidencialidad del PDF.** Vive en `top_secret/Formulacion_ PND_sesion_enlaces_sectoriales.pdf`. Tiene tres barreras:
  1. `.gitignore` ignora `/top_secret/*.pdf`.
  2. `next.config.ts` lo saca del trazado de salida con `outputFileTracingExcludes`.
  3. El hook local `.git/hooks/pre-commit` bloquea cualquier `^top_secret/.*\.pdf$` que esté en el índice, incluso si se agregó con `git add -f`. Sugiere `git restore --staged top_secret/`.
     - No se versiona, así que un clon nuevo no lo trae. Los documentos nuevos deben incluir el script para recrearlo.

  La UI marca el módulo como "Borrador · uso interno" (`AlineacionPnd.tsx:53-55`).
- **Consumidores del módulo.**
  - `ModalEjes.tsx`: órbita, detalle y el botón "Filtrar el mapa por este eje", que alterna `filtros.ejes`.
  - `BarraFiltros`: los botones 1–6.
  - `AlineacionPnd.tsx`: el clic en un eje filtra la tabla y salta a la pestaña Narrativas (`ejePnd` es estado local de `Narrativas.tsx`, distinto de `filtros.ejes`).
  - `GeneralidadNarrativa`: la frase del eje principal.

## 8. Temas: 24 sectores y `resolverTema`

- **`TEMAS`** en `src/lib/datos/catalogos.ts` tiene 24 sectores del Gobierno nacional más `sin_tema` ("Sin clasificar").
  - Cada uno trae `{etiqueta oficial, corta, icono lucide}`.
  - La clave es un slug estable, por ejemplo `salud_proteccion_social` o `tic`.
- **`resolverTema(valor)`** devuelve `null` si el valor es vacío. Si no, compacta el valor (minúsculas, NFD, solo `[a-z0-9]`) y lo busca en `TEMA_POR_FORMA`, que indexa tanto el slug como la etiqueta oficial. Así "Salud y Protección Social" y "salud_y_proteccion_social" coinciden. Un valor desconocido se conserva tal cual.
- **Valores desconocidos.** `temaReconocido` alimenta un `console.warn` en el servidor. `temaDe` los muestra con el icono `Shapes`.
- **Desajuste con `baas/`.** El snapshot SQL del 2026-09-15 todavía trae el `check tema_de_la_lista` con 18 temas antiguos ('agua', 'vias', …). El front ya opera con 24 sectores, por el commit `f52e288`.
- **Dónde se usan.** Las líneas del PND referencian estos slugs en `sectores`. El selector "Temas" los ordena por conteo, con `sin_tema` al final. `GraficaTemas` muestra los 8 primeros y dice "y N temas más".

## 9. Vista internacional

- **Activación.** El botón "Mundo" llama a `cambiarAmbito("internacional")` en `Tablero.tsx:106-112`, que también sale del detalle territorial.
- **Efecto "Ámbito"** (`MapaColombia.tsx:597-624`).
  - Muestra las capas `CAPAS_PAISES` y oculta `dep-*` y `mun-*`.
  - Hace `easeTo({center: [-70,12], zoom: 1.45, pitch: 0, bearing: 0, duration: 1800})`.
  - A los 1900 ms llama a `giro.iniciar()`.
  - Al volver a la vista nacional llama a `giro.detener()`, y el efecto "Nivel" vuelve a encuadrar con `fitBounds(COLOMBIA)`.
- **Giro** (`src/components/mapa/paises.ts:75-143`, `crearGiro(map, gradosPorSegundo = 6)`).
  - Usa `requestAnimationFrame` y corre el centro al occidente con `map.setCenter`, con la latitud fija.
  - `pausar` y `reanudarPronto(ms)` se enganchan a mousedown, touchstart, wheel, dragstart y a mouseup, touchend, dragend.
  - El `mousemove` sobre un país pausa el giro. Al salir del país reanuda a los 1200 ms.
  - Respeta `prefers-reduced-motion`.
- **Datos por país.** `src/lib/datos/internacional.ts` es el único punto a tocar.
  - `cifrasPorPais(f): Map<ISO3, {aportes, necesidades, alertas}>` hoy solo devuelve `COL` con los totales nacionales filtrados. El resto del mundo usa `SIN_DATOS`.
  - El mapa pinta `t = sqrt(n/max)` por país y pone etiquetas solo donde `n > 0`. El tooltip y la leyenda leen de ahí.
  - Cuando la base registre país, basta mapearlo a ISO-3 (`ADM0_A3`) y llenar el `Map`.
  - **El panel lateral en vista Mundo sigue mostrando Colombia** (`codigo = null`, título "Panorama · País / Colombia"). Es correcto hoy, pero confunde.
- **Interacción.** En el mundo no hay selección. El doble clic sobre Colombia vuelve a la vista nacional. `Esc` también. La miga dice "Vista internacional · 177 países".

## 10. Convenciones de código

Verifiqué cada una contra el código.

- **Español en todo.** Identificadores, tipos, archivos, comentarios y textos de UI, con trato de "usted". Las excepciones son las APIs externas y los nombres de archivo de Next (`page`, `layout`, `loading`, `error`, `proxy`).
- **Los comentarios explican el porqué, no el qué.** Abundan los que registran un bug ya vivido. Ejemplos: `MapaColombia.tsx:43-48`, `:336-337`, `:448`; `ControlesMapa.tsx:37-38`; `Narrativas.tsx:189`; `agregar.ts:1-7`; `alinear.ts:1-11`.
- **Separación servidor/cliente.**
  - Lo sensible lleva `import "server-only"`.
  - La lógica pura vive en `src/lib/datos/*.ts`, sin React.
  - Los componentes cliente empiezan con `"use client"`.
  - Las cargas pesadas usan `next/dynamic`: el mapa con `ssr:false` y un shimmer de carga, y el modal solo al abrirlo.
- **Estilos.** Tailwind v4 con utilidades semánticas del tema, más las utilidades propias de `globals.css`.
  - `.panel`: tarjeta.
  - `.vidrio`: overlay sobre el mapa.
  - `.etiqueta`: label en mayúsculas de 12 px.
  - `.cifra`: monoespaciada tabular, para todo número.
  - `.titulo-display`: titulares.
  - `.tricolor`: tres `<span/>` de firma.
  - También `.shimmer`, `.scroll-fino` y `.estrellas`.
  - No se usan clases `dark:`. El tema se cambia con `data-theme`, y el light está definido en los tokens pero no tiene interruptor en la UI.
  - Los colores fuera de tokens van como valores arbitrarios (`bg-[rgba(255,200,0,.12)]`) o como `shadow-[var(--shadow-deep)]`. El modificador important va al final: `bg-surface-1/90!`, `border-gold-500!`.
- **`text-base` es un color, no un tamaño.** `tailwind-theme.css:12` define `--color-base` como el navy de fondo, así que `text-base` pintaría el texto del color del fondo. El código no lo usa nunca. Para 16 px usa `text-[1rem]` (`MapaColombia.tsx:768`). Hay que documentarlo como regla dura.
- **No usar `map.isStyleLoaded()` como guarda.** Se usa `mapaListo(map)`, que comprueba `getLayer("dep-relleno") && getLayer("pais-relleno")`, junto con el estado `capasListas` (`MapaColombia.tsx:43-50`). Las demás reglas del mapa son:
  - Un solo mapa por contenedor (`if (mapaRef.current) return`). La limpieza reinicia `capasListas` e `introTerminada`.
  - Las props vivas se leen de `ultimo.current` dentro de los manejadores, porque el efecto de montaje tiene `[]` como dependencias.
  - No se encadenan vuelos con `moveend`. Se usa `fitBounds` directo con un `setTimeout(2700)` para marcar el fin de la intro.
  - El contenedor de Mapbox va envuelto en un `div absolute inset-0` extra, porque `mapbox-gl.css` le fija `position: relative`.
- **Textos que cambian con el estado.** No se usa `AnimatePresence mode="wait"`. Se usa un `motion.*` con `key` y solo animación de entrada. Aplica a la miga (`ControlesMapa.tsx:37-44, 72-78`), al título de Narrativas (`Narrativas.tsx:189-198`) y al título del panel (`Tablero.tsx:323-328`).
  - **Excepciones vigentes.** `mode="wait"` sigue en `ModalEjes.tsx:208` (detalle del eje) y en `Narrativas.tsx:243` y `:254` (pestañas y generalidad).
  - Esas excepciones son candidatas a migrar. Con flechas rápidas en el modal se encolan las salidas.
- **3D en CSS.** La posición en la órbita (`rotateY + translateZ`) va en el contenedor. El hover y el tap (`whileHover scale`) van en el botón hijo, para que Motion no pise el `transform` (`ModalEjes.tsx:342-353`). El brillo y la opacidad dependen del ángulo y se calculan con `useTransform` sobre un `MotionValue`, sin volver a renderizar.
- **Motion.**
  - La curva común es `const suave = [0.22, 1, 0.36, 1]`, redeclarada en cada archivo.
  - Las pastillas activas usan `layoutId` con un spring de `stiffness 420, damping 34`.
  - Las entradas van escalonadas por índice.
  - `CifraAnimada` escribe `textContent` directamente, sin pasar por estado.
  - `reducirMovimiento()` está duplicada en `mapa/estilo.ts` y en `ModalEjes.tsx`.
- **Datos y gráficas.**
  - Las series van en orden fijo: dorado, azul, rojo (`CANALES`).
  - El estado de atención usa una sola familia azul ordinal.
  - La rampa del mapa es secuencial y dorada.
  - "Sin clasificar" se informa aparte y nunca entra a la escala.
  - Los estados vacíos usan el componente `Vacio` de `Graficas.tsx`.
- **Formato.** `Intl` con `es-CO` y zona America/Bogota. `nombrePropio()` convierte los nombres DIVIPOLA en mayúsculas. `formatoNumero` redondea.
- **Accesibilidad presente.**
  - `aria-pressed`, `aria-selected` con `role=tab`, `aria-label` en los botones de icono, `role="alert"` en el error del login y `sr-only` en la búsqueda.
  - El modal declara `role="dialog"` y `aria-modal`.
  - Faltan la trampa de foco y el bloqueo del scroll del body mientras el modal está abierto.
- **Lint.** Hay tres `eslint-disable` puntuales y justificados: `any` en los constructores de consulta de PostgREST (`tablero.ts:30` y `:116`) y `exhaustive-deps` en `ranking` (`Tablero.tsx:141`).

## 11. Variables de entorno y despliegue

| Variable | Dónde se lee | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/servidor.ts` | URL del proyecto. Solo se usa en servidor, pese al prefijo público. |
| `SUPABASE_SECRET_KEY` | `src/lib/supabase/servidor.ts` | Llave `secret`/`service_role`. **Nunca debe llevar prefijo `NEXT_PUBLIC_`.** Si falta, `obtenerTablero` lanza un error y aparece `error.tsx`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **ningún archivo de `src/`** | Está en `.env.example` pero no se usa. Se puede documentar como reservada o eliminar. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `MapaColombia.tsx:292` | Token público. Conviene restringirlo por URL en Mapbox. |
| `NEXT_PUBLIC_MAPBOX_STYLE` | `MapaColombia.tsx:296` | `mapbox://styles/...`. Debe tener ids de capa clásicos (ver la sección 6). |
| `ACCESS_TOKEN` | `acceso/acciones.ts` | Token único de acceso. Si falta, el login muestra "El acceso no está configurado en el servidor". |
| `SESSION_SECRET` | `lib/auth/sesion.ts` | HMAC de la cookie. Se genera con `openssl rand -base64 32`. Si falta, el proxy lanza un error ante cualquier cookie presente y el login falla al crear la sesión. Al rotarla, todas las sesiones quedan inválidas. |

En local existen `.env` y `.env.local`. Next carga ambos y gana `.env.local`. Conviene dejar uno solo.

**Vercel.**
- **Configuración en el repositorio.** No hay `vercel.json` ni carpeta `.vercel/`, que además está ignorada. La configuración sale del preset de Next.js: build `next build`, instalación con pnpm (detectado por `pnpm-lock.yaml` v9 y `packageManager: pnpm@12.4.1`) y Node 20.9 o superior.
- **Versión de pnpm.** No confirmé que Vercel soporte pnpm 12; conviene verificarlo (corepack).
- **Variables.** Hay que cargar las 6 variables usadas en los entornos Production y Preview.
- **Runtime del proxy.** `proxy.ts` corre en runtime Node, que es el valor por defecto en Next 16.
- **Render.** La página es dinámica por `connection()`: cada visita hace unas 9 lecturas paginadas a Supabase, sin caché.
- **Pesos en `public/`.** La carpeta incluye los originales (7,2 MB) y los generados (3 MB); todo se publica.
- **Documento confidencial.** El PDF de `top_secret/` no llega a Vercel, porque no está en git y se excluye del trazado.
- **Llave de Supabase.** `SUPABASE_SECRET_KEY` solo debe configurarse como variable de servidor.

## 12. Scripts y comandos

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala las dependencias. |
| `pnpm dev` | `next dev`. Reescribe el bloque `nextjs-agent-rules` de AGENTS.md si falta. |
| `pnpm build` y `pnpm start` | Build y servidor de producción. |
| `pnpm lint` | `eslint` con configuración plana. |
| `pnpm exec tsc --noEmit` | Revisión de tipos. No hay script propio. `tsconfig` es `strict`. |
| `node scripts/preparar-geo.mjs` | Regenera `public/data/geo/*.json` y `src/lib/geo/cajas.json`. Imprime los conteos: 33, 1120, 33 y 177. |
| `node scripts/generar-iconos.mjs` | Regenera `favicon.ico` y `apple-icon.png` desde `icon.svg`. Requiere macOS con Google Chrome. |

**Hook local para recrear en cada clon.** Es `.git/hooks/pre-commit`, ejecutable, con este contenido:

```sh
#!/bin/sh
if git diff --cached --name-only | grep -qi '^top_secret/.*\.pdf$'; then
  echo "Commit bloqueado: hay un PDF de top_secret/ en el índice (documento confidencial)." >&2
  echo "   Quítelo con: git restore --staged top_secret/" >&2
  exit 1
fi
```

## 13. Cómo verificar cambios

1. `pnpm lint` y `pnpm exec tsc --noEmit` deben terminar limpios.
2. `pnpm build` debe compilar. Hay que confirmar que ningún `top_secret/*.pdf` aparezca en `.next/`.
3. **Recorrido en navegador** con `pnpm dev` o `pnpm start`, con el `.env.local` completo.
   1. Sin cookie, `/` debe redirigir a `/acceso`.
   2. Con un token inválido la tarjeta se sacude y sale el mensaje de error. Con uno válido redirige a `/`. Volver a abrir `/acceso` con sesión debe llevar a `/`.
   3. Intro del mapa: el globo vuela a Colombia y a los ~2,7 s aparecen la leyenda y las cifras por departamento.
   4. El hover muestra el tooltip. Clic selecciona y el panel lateral cambia junto con "Quitar selección". Doble clic abre los municipios (la miga dice "Departamento"). `Esc` o doble clic fuera devuelven a la vista nacional.
   5. Probar las métricas Aportes, Necesidades y Alertas. Probar 2D/3D (extrusiones y pitch). Probar los filtros por tema, por eje 1–6 y por canal, y "Limpiar".
   6. Sin filtros, el pie del panel lateral debe decir "Totales nacionales conciliados…". Si no aparece, revisar R1 y R2.
   7. "Mundo": el globo gira, se pausa sobre un país y muestra su tooltip. Doble clic sobre Colombia vuelve a la vista nacional.
   8. "Ejes articuladores": órbita, clic en una tarjeta, flechas del teclado, detalle y "Filtrar el mapa por este eje". Debe aparecer el contador en el botón del encabezado y en la barra de filtros.
   9. Narrativas:
      - Panorama: generalidad, relatos recurrentes y términos.
      - Plan Nacional: el clic en un eje debe saltar a la tabla filtrada.
      - Narrativas: vistas agrupadas y todas, búsqueda y paginación.
   10. Móvil a 390 px: controles, mapa, modal y el scroll horizontal de la tabla.
   11. Activar `prefers-reduced-motion`: no debe haber intro ni giro, y las transiciones quedan en ~0 ms.
4. La consola del navegador no debe mostrar errores de Mapbox. El servidor no debe mostrar el aviso "Temas de la base que no están en el catálogo".
5. Si se toca la cartografía, volver a correr `preparar-geo.mjs` y revisar el diff de `cajas.json`.

## 14. Trampas conocidas y decisiones de diseño

Ordenadas de mayor a menor impacto. Cada una cita archivo y línea o símbolo. El punto 0 es una regla aparte sobre cómo reescribir la documentación.

0. **Regla para reescribir AGENTS.md y CLAUDE.md** (`node_modules/next/dist/server/lib/generate-agent-files.js`).
   - Si `next dev` detecta un agente y el bloque `nextjs-agent-rules` falta o difiere, lo reinserta en AGENTS.md.
   - Hay que conservar el bloque literal, con sus marcadores, y escribir el contenido propio fuera de él.
   - CLAUDE.md debe seguir empezando con `@AGENTS.md`. Debajo se pueden agregar notas propias.
1. **El giro del globo no tiene inercia y el globo queda pequeño.**
   - **Por qué se siente brusco.** `crearGiro` (`paises.ts:81-100`) pasa de 0 a 6°/s y de 6°/s a 0 en un solo frame. El `mousemove` sobre cualquier país lo frena en seco (`MapaColombia.tsx:390-393`). Como casi todo el globo es tierra, se entrecorta. Además arranca con un `setTimeout(1900)` justo al terminar el `easeTo`.
   - **Por qué se ve pequeño.** El zoom fijo de `1.45` (`MapaColombia.tsx:614-621`) da un diámetro de unos 512·2^1,45/π, cerca de 445 px, en un contenedor de unos 1100×830. Queda alrededor del 50 % del alto.
   - **Solución para el giro.**
     - Llevar una velocidad actual que converja a la velocidad objetivo: `v += (objetivo - v)·(1 - e^(-dt/τ))`, con τ de unos 0,6 s.
     - `pausar` pone el objetivo en 0 y `reanudar` lo pone en 4–5°/s.
     - Cortar el rAF solo cuando |v| sea menor que un épsilon.
   - **Solución para el tamaño.**
     - Calcular el zoom desde el contenedor: `zoom = log2(π·0,8·min(ancho, alto − 140)/512)`, que da cerca de 1,9 en escritorio.
     - Usar `padding: {top: 96, bottom: 40}` para centrarlo bajo los controles.
     - Recalcularlo en el `ResizeObserver` mientras `ambito === "internacional"`.
2. **El modal de ejes solo se navega con teclado o con clic en una tarjeta.**
   - Los `ChevronLeft` y `ChevronRight` de `ModalEjes.tsx:200-203` son decorativos y están dentro de un `<p>`.
   - No hay manejadores de `wheel`, de pan con pointer ni de swipe.
   - `onMouseEnter={() => setGirando(false)}` (`:166`) apaga el giro para siempre al primer paso del cursor, porque no hay `onMouseLeave`.
   - El body no se bloquea, así que la rueda hace scroll en la página de atrás.
   - **Solución.**
     - Poner dos botones reales a los lados de la órbita (44 px, `.vidrio`, con `aria-label`) que llamen a `elegir((elegido ?? 0) ± 1)`.
     - Agregar `onWheel` que lea `deltaX` (o `deltaY` con Shift) con un umbral acumulado y un cooldown de unos 350 ms.
     - Agregar arrastre con `onPan` de Motion: aplica `rotacion.set(r + dx·0,35)` y al soltar ajusta al eje más cercano con el mismo spring.
     - Reanudar el giro al salir si no hay eje elegido.
     - Poner `document.body.style.overflow = "hidden"` mientras el modal esté abierto.
   - Todo es posible con `motion`, sin librerías nuevas.
3. **El contenido del detalle del eje es pobre** (`ModalEjes.tsx:218-281`).
   - Las líneas sin participaciones se muestran sin cifra ni barra.
   - No se indica el % del eje sobre el total del territorio ni su posición entre los 6 ejes.
   - Las píldoras mezclan el dato ciudadano con los metadatos del DNP, todo a 11 px.
   - Bajo la órbita queda un gran vacío (captura 16).
   - **Datos ya disponibles en el cliente sin tocar el servidor.**
     - `conteosLinea`.
     - `alineacionPnd(...).lineas[].relato`, `veces` y `claves`: la voz ciudadana más repetida por línea.
     - `resumen.temas` cruzado por eje, a partir de `aportes[].eje` y `aportes[].tema`.
   - **Estructura propuesta.**
     - Una cabecera con el número, el nombre y una cifra grande con el % del territorio.
     - Las líneas como barras ordenadas por conteo. Las que están en cero van atenuadas y agrupadas bajo "sin voces aún".
     - Una cita, "lo que más se repite".
     - Una ficha del DNP aparte, con los indicadores y el área.
     - El botón de filtro, fijo abajo.
4. **`text-base` pinta navy sobre navy.** El detalle está en la sección 10. Debe ser una regla explícita en AGENTS.md.
5. **El matcher del proxy deja pasar `.json`, `.geojson`, `data/` y `linea-grafica-patria/` sin sesión.**
   - No se debe poner nada sensible en `public/`.
   - No se deben crear rutas que terminen en esas extensiones.
6. **`baas/` no es la fuente de verdad.**
   - Es un snapshot del otro repositorio. Tiene enlaces rotos y un `check` de 18 temas antiguos.
   - La documentación de la base habla de 1.122 municipios y el GeoJSON trae 1.120.
   - No hay que usarlo para razonar sobre el estado actual de la base sin contrastarlo contra Supabase.
7. **En móvil los controles tapan el mapa** (captura 17).
   - Los cinco controles (miga, ámbito, métrica, 2D, filtros) apilan unos 330 px sobre un mapa de `72vh`.
   - `relleno()` solo reserva `top: 120`, así que Colombia queda detrás de los botones.
   - **Solución.** Colapsar métrica, 2D y filtros en una hoja inferior o en una sola fila con scroll horizontal, y subir `top` al alto real medido de los controles.
8. **La leyenda y la pista inferior chocan en la vista Mundo** (captura 45).
   - La leyenda está en `bottom-6 left-6 w-64`. La píldora de pistas va centrada (`Tablero.tsx:242-247`) y sus pistas de texto solo se ven desde `2xl`. El texto "Sin datos internaciona…" queda tapado.
   - **Solución.** Anclar las pistas a la derecha de la leyenda, o esconder las pistas de texto cuando `ambito === "internacional"` y el ancho sea menor de 1700 px.
9. **`AnimatePresence mode="wait"` sigue en tres sitios.** El detalle está en la sección 10. Si la documentación enuncia la regla, debe citar también estas excepciones o hay que migrarlas.
10. **Textos y cifras fijos o engañosos.**
    - "33 departamentos" y "177 países" están escritos a mano en `ControlesMapa.tsx:82-85`. Deberían salir de los datos.
    - "Datos en vivo", con ping, está en `Encabezado.tsx:71-80`. No hay polling ni revalidación. Lo cierto es el "Corte HH:MM" de la carga.
    - El tooltip de país muestra el continente en inglés ("South America") porque `CONTINENT` se copia sin traducir (`preparar-geo.mjs:90`, `MapaColombia.tsx:763`).
    - "Sesión cifrada" en el login es inexacto: la cookie va firmada.
11. **El control contra el RPC calla las discrepancias.** `coincideControl` (`Tablero.tsx:145-150`) solo muestra el sello cuando todo coincide. Cuando no coincide no avisa, ni en la UI ni en el servidor. Conviene al menos un `console.warn` en el servidor o un aviso discreto.
12. **Rendimiento y peso.**
    - Todo el dataset viaja en las props RSC, incluidas las síntesis: son 807 aportes hoy. Si el volumen crece, hay que paginar o agregar en el servidor.
    - `fondo-bandera-dark.png` pesa 1,5 MB y se usa como `background-image` CSS con opacidad `.14` (`Tablero.tsx:305`), además del login. No pasa por `next/image`, así que conviene una versión reducida en WebP.
    - `municipios.json` (2,1 MB) se descarga siempre, aunque solo se usa al entrar a un departamento.
    - Los originales, de unos 7 MB, se publican en `public/data/`.

**Decisiones que hay que preservar, con su motivo.**
- Supabase solo se consulta en el servidor con la llave secreta, porque el esquema tiene RLS sin políticas.
- Se cuentan elementos distintos por nivel, por R1 y R2.
- La alineación con el PND y la generalidad no usan IA y son explicables.
- El vocabulario y los relatos originales no salen del servidor.
- Un aporte sin eje nunca se asigna por descarte.
- "Sin clasificar" queda fuera de las escalas.
- `cooperativeGestures` está activo porque la página tiene scroll.
- Se usan los centroides oficiales DIVIPOLA para las etiquetas.
- Si el catálogo PND es inválido, el módulo desaparece sin romper el tablero.
- La zona horaria America/Bogota se aplica en el servidor para fijar `mes` y `fecha`.
- El mapa se carga con `ssr:false` y hay un solo mapa por contenedor.

### Critical Files for Implementation
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/AGENTS.md
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/README.md
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/lib/datos/tablero.ts
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/mapa/MapaColombia.tsx
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/ejes/ModalEjes.tsx
