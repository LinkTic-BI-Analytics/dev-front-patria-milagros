> **Estado de esta hoja de ruta.** Sale de una auditoría UI/UX de 130 hallazgos verificados contra el código (commit `ccb226d`).
> **Las siete oleadas están implementadas** (20 de septiembre de 2026).
>
> | Oleada                           | Estado | Puntos                                                |
> | -------------------------------- | ------ | ----------------------------------------------------- |
> | 0 · Cimientos                    | ✅     | S1, S2, A1, E0                                        |
> | 1 · Globo y navegación del modal | ✅     | G1–G4, E1–E3, E8, R1 (overlay sin blur)               |
> | 2 · Información del modal        | ✅     | E4–E7, E9, P3                                         |
> | 3 · Defectos del tablero         | ✅     | M1, M2, P1, P2, N1, N2, N3, A2, S3                    |
> | 4 · Pulido                       | ✅     | G5, G6, M3–M7, P4–P7, N4, N5, R1, R3, S4, A3, A4      |
> | 5 · Profundidad                  | ✅     | P8–P11, N6–N10, E10, E11 (+F0), F1, X1–X4, M8, A5, R4 |
> | 6 · Opcionales                   | ✅     | E12, F2, P12, F3, A6, A7, M9 (parcial)                |
>
> **Fuera de alcance, con motivo:** R2 (recorte condicional del vidrio) necesita una grabación de
> rendimiento en el equipo del cliente; R5 dependía de que M7 no bastara, y M7 quedó bien; de M9 se
> hizo el resaltado ranking → mapa, no el buscador «Ir a…» ni la ficha anclada, porque el botón
> «Ver municipios» (M1) ya resuelve ese caso.
> Pendiente de equipos reales: Magic Mouse/trackpad en Safari, ratón de muescas en Windows/Firefox, iOS y Android.
> Los números de línea valen para `ccb226d`: al implementar, ubique por símbolo.
> Decisiones ya tomadas por el usuario: en el login se quita solo el texto del vencimiento (pie: «Acceso protegido · uso institucional»); «Datos en vivo» se vuelve real con «hace X min» + botón de actualizar, sin refresco automático.

# Hoja de ruta del rediseño — Sistema de Escucha y Planeación Nacional

- **Repositorio:** `/Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros`. Todas las rutas `src/…` cuelgan de ahí.
- **Base:** commit `ccb226d`, árbol limpio.
- **Números de línea:** válidos solo para ese commit. Al implementar, ubique por símbolo.
- **Stack comprobado en `node_modules`:** next 16.3.5, motion 13.3.0, mapbox-gl 3.30.0, tailwindcss 4.3.3, react 19.2.8.
- **Comprobaciones:** `package.json` no tiene ejecutor de pruebas. Cada punto se verifica con `pnpm lint && pnpm build` más revisión manual en navegador. Las funciones puras se pueden sanear con `node -e`.
- **Sin archivos:** esta hoja de ruta va completa en este mensaje. No se creó archivo de plan: la tarea es de solo lectura y prohíbe escribir informes `.md`.

**Verificaciones propias de esta pasada** (lectura de código y cálculo):

- `globals.css:21-33` confirma `html,body{height:100%}` y `body{overflow-x:hidden}`.
- `next/dist/client/components/error-boundary.js:114` solo entrega `retry`.
- `src/lib/datos/internacional.ts` confirma que solo Colombia tiene cifras.
- `MapaColombia.tsx` recibe `municipios` por props, así que el índice por departamento sale de `Object.keys(municipios)`.
- Las cuatro fórmulas de zoom del globo (MAPA-01, RESP-01, MOV-01, MUNDO-01) son algebraicamente la misma. Recalculada en node da:
  - hoy, zoom 1.45: disco de 513 px a 825 px de alto, y 484 px en móvil de 366×608, recortado;
  - con k = 0.85: 1115×825 → 701 px (zoom 2.01); 956×776 → 660 px (1.92); 882×644 → 547 px (1.65); 796×676 → 575 px (1.72); 366×608 con 120 px libres arriba → 311 px (0.68).

**Cómo leer:** cada punto lleva un ID nuevo de frente (G, E, S, M, P, N, A, R, X, F) y, entre paréntesis, los hallazgos que fusiona. El hallazgo «EJES-01» existe dos veces en la auditoría: aquí son EJES-01(modal) y EJES-01(flujo).

---

## 1. Duplicados fusionados y contradicciones resueltas

| #   | Tema                                                                                                                                                                     | Hallazgos                                                                                                                                                                             | Gana                                                                                                                                     | Por qué                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fórmula del zoom del globo                                                                                                                                               | MAPA-01, RESP-01, MOV-01, MUNDO-01                                                                                                                                                    | La función de MAPA-01, inversa exacta                                                                                                    | Todas son equivalentes; solo cambian el diámetro objetivo y el acotado. Objetivo: `k = 0.85` (rango a validar 0.82–0.88) y acotado `[0.3, 2.6]`. El mínimo 1.2 de MUNDO-01 recorta el disco en móvil.                                                                                        |
| 2   | Reencuadre al redimensionar en Mundo                                                                                                                                     | MAPA-01 (`jumpTo`), RESP-01 (`setZoom`), MOV-01 y MUNDO-01 (zoom dentro del bucle del giro)                                                                                           | Zoom dentro del integrador (`fijarZoom`). `jumpTo({zoom})` si el giro está parado.                                                       | Un `easeTo` muere en el siguiente frame del giro: `jumpTo` hace `_stop()`. Un solo `jumpTo` por frame evita peleas.                                                                                                                                                                          |
| 3   | Qué hace el giro al agarrar el globo                                                                                                                                     | MOV-01 (frena en 0.8 s) contra MAPA-03, RESP-01 y MUNDO-01 (corte inmediato)                                                                                                          | Corte inmediato: `ocupado = agarrado \|\| map.isMoving()` → `v = 0` y sin `jumpTo`                                                       | Desacelerar mientras el usuario arrastra cancela DragPan, la inercia y los botones +/−.                                                                                                                                                                                                      |
| 4   | Política de hover en Mundo                                                                                                                                               | MAPA-02 (frenar solo sobre países con datos, inactividad de 4 s y re-evaluación), RESP-01 y MUNDO-01 (frenar sobre cualquier país), MOV-01 (bajar a 1°/s)                             | MAPA-02                                                                                                                                  | Casi todo el globo es país. Frenar sobre cualquiera significa que con el cursor encima nunca gira. Un 1°/s deja el tooltip obsoleto. MAPA-02 resuelve además el cursor aparcado.                                                                                                             |
| 5   | Velocidad de crucero                                                                                                                                                     | 3 / 3.5 / 4 / 4 °/s                                                                                                                                                                   | 3°/s, y 2.4°/s por debajo de 640 px, con factor por zoom                                                                                 | Con el disco un 37 % mayor, 3°/s equivalen a unos 19 px/s en el ecuador. Es la lectura «fluida, no brusca» que pidió el usuario.                                                                                                                                                             |
| 6   | Bearing inclinado del globo                                                                                                                                              | MAPA-02 original contra MAPA-03(g)                                                                                                                                                    | Sin bearing                                                                                                                              | Inclina todas las etiquetas y contradice el retorno a bearing 0.                                                                                                                                                                                                                             |
| 7   | Mecanismo de Esc                                                                                                                                                         | MAPA-08 y EJES-09 (prop + captura), INT-01 y FLUJO-02 (manejador único en Tablero), A11Y-02 (pila `useEscape`)                                                                        | Pila `useEscape`. El manejador base, escalonado, vive en Tablero.                                                                        | El rediseño añade muchas capas: hoja inferior, popovers, Pista, detalle de fila, «¿Cómo se calcula?». La pila escala; el orden de prioridad de INT-01 se conserva como base. La guarda `e.defaultPrevented` de MAPA-08 no funciona por orden de registro, como su propio verificador señala. |
| 8   | Esc dentro del modal                                                                                                                                                     | MAPA-08 (dos tiempos: primero deselecciona) contra EJES-01(modal) (Esc siempre cierra)                                                                                                | Esc siempre cierra                                                                                                                       | Es el patrón de diálogo de APG. «Ver los seis» cubre el regreso al panorama.                                                                                                                                                                                                                 |
| 9   | Rueda y trackpad en la órbita                                                                                                                                            | EJES-02 y EJES-01(flujo) (rotación continua, encaja a los 140 ms) contra A11Y-01 y MOV-02 (pasos discretos con enfriamiento)                                                          | Pasos discretos para la rueda; continuo solo para el arrastre                                                                            | La inercia del trackpad emite eventos cerca de 1 s. El modo continuo retrasa la apertura del detalle y compite con el resorte. Se adopta de EJES-02 la normalización de `deltaMode` y el ignorar `ctrlKey`.                                                                                  |
| 10  | Radio de la órbita                                                                                                                                                       | A11Y-01 (`36cqw`) contra EJES-02 y EJES-10 (medido en JS)                                                                                                                             | Medido en JS con ResizeObserver, publicado como `--radio`                                                                                | El arrastre necesita el radio en px (`gradosPorPx`). `container-type` sobre el elemento con `perspective` es un riesgo que el propio A11Y-01 admite. Los `22cqw` de EJES-10 daban 169 px, menos que hoy.                                                                                     |
| 11  | Flechas laterales en móvil                                                                                                                                               | EJES-01(modal) (a los lados) contra A11Y-01 y EJES-01(flujo) (en la fila del paginador)                                                                                               | Desde `sm` a los lados; por debajo, en la fila del indicador                                                                             | A 390 px taparían las tarjetas vecinas del coverflow.                                                                                                                                                                                                                                        |
| 12  | Foco en tarjetas 3D                                                                                                                                                      | A11Y-01 (roving tabindex en tarjetas) contra EJES-09 (tarjetas `aria-hidden`, puntos como único tablist)                                                                              | EJES-09                                                                                                                                  | Una tarjeta rotada o semioculta es mal objetivo de foco. Dos tablist duplican la navegación.                                                                                                                                                                                                 |
| 13  | CTA de filtrar                                                                                                                                                           | EJES-01(flujo) y plan original (filtra y cierra) contra EJES-11 (sin autocierre, pie en dos acciones)                                                                                 | EJES-11                                                                                                                                  | `filtros.ejes` es multiselección; el autocierre obliga a reabrir por cada eje. «Ver el tablero filtrado» da el camino al resultado.                                                                                                                                                          |
| 14  | «Puesto 2.º de 6» en el detalle del eje                                                                                                                                  | EJES-03 contra EJES-01(flujo)                                                                                                                                                         | Sin puesto; participación porcentual                                                                                                     | Un «6.º de 6» sobre un eje del Gobierno es torpe. El orden ya se lee en el panorama.                                                                                                                                                                                                         |
| 15  | Bloqueo de scroll del modal                                                                                                                                              | EJES-09, INT-01, FLUJO-02 (`overflow` en `<html>`) contra A11Y-02 (en `<body>`)                                                                                                       | `<body>`                                                                                                                                 | Confirmado en `globals.css`: con `html{overflow:hidden}`, el body se vuelve contenedor de scroll propio (tiene `height:100%` y `overflow-x:hidden`) y la página salta. Se añade `html{scrollbar-gutter:stable}`.                                                                             |
| 16  | `inert`                                                                                                                                                                  | EJES-09 original (sobre el root de Tablero)                                                                                                                                           | Fragmento: envoltorio con `inert` y el modal como hermano                                                                                | El modal se renderiza dentro del root; ponerlo inerte inutiliza el propio modal.                                                                                                                                                                                                             |
| 17  | Transición del detalle del eje                                                                                                                                           | EJES-11 (`popLayout`) contra MOV-02 y MOV-04 (rejilla `[grid-area:1/1]`, cruce simultáneo)                                                                                            | Rejilla apilada, con las variantes direccionales de EJES-11                                                                              | El equipo ya retiró dos `wait` por salidas colgadas. La rejilla no mide layout y es la opción más robusta.                                                                                                                                                                                   |
| 18  | Regla global de foco                                                                                                                                                     | MOV-06 (con `border-radius: inherit`) contra NARR-09 y MARCO-10                                                                                                                       | Sin `border-radius`, con `:where()`, dentro de `@layer base`                                                                             | `inherit` toma el radio del padre y deforma el elemento. La regla del canvas de Mapbox va sin capa, porque la actual sin capa le ganaría.                                                                                                                                                    |
| 19  | `MotionConfig`                                                                                                                                                           | MOV-05 (con `transition` por defecto) contra MARCO-09 y A11Y-07                                                                                                                       | Solo `reducedMotion="user"`                                                                                                              | El `transition` por defecto cambia resortes implícitos y no lo heredan los componentes que declaran `{delay}`. Sería una regresión difícil de auditar.                                                                                                                                       |
| 20  | Ubicación del módulo de movimiento y de los tokens                                                                                                                       | MOV-05 (`src/lib/movimiento.ts`, editar `tokens.css`) contra MARCO-09 y MARCO-12. A11Y-06 también edita `tokens.css`.                                                                 | `src/lib/ui/movimiento.ts`; tokens nuevos y sobrescrituras en `globals.css :root`                                                        | `tokens.css` y `tailwind-theme.css` son copia byte a byte del kit de marca. `globals.css` ya sobrescribe `--font-*` con la misma especificidad y va después en la cascada.                                                                                                                   |
| 21  | Orden en móvil                                                                                                                                                           | MOVIL-01 (`display:contents` + `order`) contra PANEL-11 y RESP-03 (tres hijos de `<main>` colocados con grid)                                                                         | Grid con orden de DOM real                                                                                                               | `order` deja el teclado y el lector de pantalla en otro orden (WCAG 2.4.3). No hace falta partir TarjetasKpi.                                                                                                                                                                                |
| 22  | Barra de contexto de filtros                                                                                                                                             | FLUJO-01 (BarraContexto fija de 40 px) contra PANEL-02 (pastilla única) y NARR-03 (chips en Narrativas)                                                                               | Distribuido: pastilla en el héroe, chips en Narrativas y «de 807 · %» en el KPI, con un helper común `describirFiltros`                  | La barra fija rompe tres `calc()` de altura, consume 40 px donde PANEL-03 lucha por el pliegue y duplica BarraFiltros.                                                                                                                                                                       |
| 23  | «Sin relación con el Plan»                                                                                                                                               | FLUJO-01 (`SIN_EJE` en el `filtrar()` global) contra NARR-03 (booleano local con exclusión mutua)                                                                                     | NARR-03                                                                                                                                  | Es menos invasivo. No crea un filtro global sin control visible en la barra del mapa.                                                                                                                                                                                                        |
| 24  | Clic de eje en AlineacionPnd                                                                                                                                             | FLUJO-01 (conserva el salto de pestaña) contra NARR-03 y NARR-06 (no salta)                                                                                                           | No salta. La columna de líneas hace de vista previa y hay un botón «Ver las N narrativas»                                                | Coinciden dos verificadores. El clic pasa a ser filtro global y no debe cambiar el contexto de lectura.                                                                                                                                                                                      |
| 25  | Tabla de narrativas                                                                                                                                                      | RESP-04 (ocultar «Último») contra NARR-02 (reestructurar a 4–5 columnas más variante de tarjetas)                                                                                     | NARR-02, con el umbral corregido                                                                                                         | NARR-02 proponía `@3xl` (768 px), pero a 1280 px el ancho útil es 746 px y caería en tarjetas. Usar `@[44rem]` (704 px).                                                                                                                                                                     |
| 26  | Cargadores                                                                                                                                                               | MAPA-10 y ACCESO-01 (3 instancias) contra MARCO-06 (2 instancias, contenedor sin animar)                                                                                              | MARCO-06 (`CargaMapa`)                                                                                                                   | Son tres árboles distintos y no pueden cruzarse. Dos instancias con el mismo marcado evitan el doble fundido.                                                                                                                                                                                |
| 27  | Municipios diferidos                                                                                                                                                     | MAPA-10 (fetch en el hilo principal y `setData(obj)`) contra REND-01 (`setData(url)`, lo parsea el worker)                                                                            | REND-01, con la UI «Cargando municipios…» de MAPA-10                                                                                     | El hilo principal nunca ve los 2.1 MB. El índice por departamento sale de `Object.keys(municipios)`, que ya llega por props.                                                                                                                                                                 |
| 28  | Cambio de métrica en el coroplético                                                                                                                                      | MAPA-12 (tween de feature-state por frame) contra REND-04 y MOV-03 (capa velo constante)                                                                                              | Velo primero; el tween queda opcional tras medir                                                                                         | `fill-opacity` con feature-state no interpola. El velo es determinista y no llama `setFeatureState` por frame.                                                                                                                                                                               |
| 29  | Cifras sobre las torres 3D                                                                                                                                               | MAPA-12 original (`symbol-z-elevate`) contra su verificador (`symbol-z-offset`)                                                                                                       | `symbol-z-offset`, a validar. Plan B: ocultar `cifras-texto` en 3D.                                                                      | `z-elevate` es una propiedad de layout booleana ligada a edificios.                                                                                                                                                                                                                          |
| 30  | Tooltip del mapa                                                                                                                                                         | MAPA-09 (tamaño medido) contra REND-02 (constantes 240/214; quitar `.vidrio`)                                                                                                         | Tamaño medido con ref, y quitar `.vidrio`                                                                                                | El contenido pasa a variar (una línea para países sin datos). El backdrop-filter que se mueve cada frame es el más caro.                                                                                                                                                                     |
| 31  | Táctil en el mapa                                                                                                                                                        | MAPA-09 (marca de tiempo de `touchend`) contra A11Y-03 (`(hover:none)` y ficha anclada)                                                                                               | `(hover:none)` sin tooltip, más la ficha de acción contextual. La marca de tiempo queda como guarda opcional para dispositivos híbridos. | `pointerType` no existe en el mousemove emulado. La ficha coincide con el CTA de M1.                                                                                                                                                                                                         |
| 32  | Franja inferior                                                                                                                                                          | MUNDO-01 (exportar la leyenda a Tablero), MARCO-12 (umbrales `@[78rem]`), RESP-02 (coach-mark con `localStorage`) contra MAPA-07 (slot `pie` dentro del mapa, pistas efímeras de 8 s) | MAPA-07                                                                                                                                  | La leyenda depende de estado interno del mapa. Con flex el solape es imposible por construcción. Las pistas efímeras no dependen de `localStorage` y siguen saliendo en cada demo.                                                                                                           |
| 33  | Padding del mapa                                                                                                                                                         | RESP-02 (`top:132`) y MOVIL-01 (`top:~90`) contra MAPA-06 (medido con ResizeObserver, umbral de 24 px)                                                                                | MAPA-06                                                                                                                                  | Elimina los números mágicos. El umbral evita que el mapa «respire».                                                                                                                                                                                                                          |
| 34  | 2D/3D                                                                                                                                                                    | MAPA-05 (etiqueta = acción) contra A11Y-05 (etiqueta fija + `aria-pressed`)                                                                                                           | Ubicación de MAPA-05 (IControl de Mapbox) con la etiqueta fija «Vista 3D» de A11Y-05                                                     | Con `aria-pressed` la etiqueta no debe cambiar.                                                                                                                                                                                                                                              |
| 35  | Conmutador Agrupadas / Todas                                                                                                                                             | NARR-09 (`role=group` + `aria-pressed`) contra A11Y-05 (`Segmentado` radiogroup)                                                                                                      | `Segmentado` compartido                                                                                                                  | La objeción de NARR-09 era un radiogroup «a medias». Con un componente completo desaparece.                                                                                                                                                                                                  |
| 36  | Rejilla de GraficaTemas                                                                                                                                                  | A11Y-05 (`9rem_1fr_2.5rem`) contra PANEL-01 (`9.5rem_1fr_3rem`)                                                                                                                       | PANEL-01                                                                                                                                 | Verificó que caben los tres nombres largos. La columna numérica debe ser fija.                                                                                                                                                                                                               |
| 37  | Colores de atención                                                                                                                                                      | A11Y-06 contra PANEL-08                                                                                                                                                               | Paleta completa de PANEL-08, campo `patron`                                                                                              | Es coherente entre los cuatro estados. Ambas propuestas cumplen 3:1.                                                                                                                                                                                                                         |
| 38  | Tarjetas KPI                                                                                                                                                             | SOBRA-01 (fundir «Ubicación» en el KPI principal) contra PANEL-03 (rejilla 2×2 reordenada)                                                                                            | PANEL-03. La duplicación se resuelve quitando el pie del KPI principal (`TarjetasKpi.tsx:76-80`).                                        | Con 3 tarjetas la rejilla queda coja a nivel nacional. Ese pie lo ocupan «de N · %» (P4) y el delta (P9).                                                                                                                                                                                    |
| 39  | KPI clicable                                                                                                                                                             | MOV-06 (tarjeta entera como `<button>`) contra PANEL-04 (botón estirado)                                                                                                              | PANEL-04                                                                                                                                 | P11 mete botones de canal dentro del KPI principal. Anidar interactivos es HTML inválido.                                                                                                                                                                                                    |
| 40  | Refresco de datos                                                                                                                                                        | SOBRA-01 (`router.refresh()` manual) contra MARCO-03 (server action que devuelve datos)                                                                                               | MARCO-03                                                                                                                                 | Un fallo de `obtenerTablero` en un refresh dispara `error.tsx` y destruye todo el estado. La action degrada a «fallo».                                                                                                                                                                       |
| 41  | Vista Mundo y el departamento abierto                                                                                                                                    | MUNDO-01 (no llamar `salir()`) contra el comportamiento actual, PANEL-09 y MAPA-04                                                                                                    | Mantener `salir()`                                                                                                                       | El regreso de MAPA-04 vuela a COLOMBIA. Aterrizar en un departamento no pedido es el defecto que describe PANEL-09.                                                                                                                                                                          |
| 42  | Texto del panel en Mundo                                                                                                                                                 | MUNDO-01 («Colombia concentra el 100 %») contra PANEL-02 («Colombia en el mundo» + «La base aún no registra país de origen»)                                                          | PANEL-02                                                                                                                                 | `internacional.ts` documenta que no hay país de origen. El 100 % sería engañoso.                                                                                                                                                                                                             |
| 43  | Filtro de la etiqueta base de Colombia                                                                                                                                   | MAPA-11 original                                                                                                                                                                      | Descartado                                                                                                                               | `setFilter` reemplazaría el filtro propio del estilo de Studio.                                                                                                                                                                                                                              |
| 44  | Estado en la URL                                                                                                                                                         | NARR-09 (`useSearchParams` en cliente) contra URL-01 (servidor valida y pasa `estadoInicial`)                                                                                         | URL-01, empezando solo con `replaceState`                                                                                                | Un solo mecanismo para todo el estado. `pushState` solo se añade tras validar que Atrás no re-pide el RSC.                                                                                                                                                                                   |
| 45  | Texto del pie del login                                                                                                                                                  | «Sesión cifrada», «Conexión cifrada», «Acceso protegido»                                                                                                                              | «Acceso protegido · uso institucional», pendiente de confirmación                                                                        | La cookie va firmada con HMAC, no cifrada. «Conexión cifrada» solo es cierto con HTTPS.                                                                                                                                                                                                      |
| 46  | Título del H2 de Narrativas más pequeño                                                                                                                                  | NARR-11 original                                                                                                                                                                      | Descartado                                                                                                                               | Contradice la línea gráfica y el «show visual».                                                                                                                                                                                                                                              |
| 47  | Grano a `z-index: 0` o `-1`; onboarding de burbujas; carrusel de KPI en móvil; hoja inferior para el detalle de relato; `animation-timeline`; columna sticky en la tabla | Varios                                                                                                                                                                                | Descartados                                                                                                                              | Cada verificador demostró un daño o una incompatibilidad.                                                                                                                                                                                                                                    |

---

## 2. Frentes de trabajo

Etiquetas de prioridad:

- **IMPRESCINDIBLE:** responde a una queja textual del usuario o es un defecto claro.
- **RECOMENDADO.**
- **OPCIONAL.**

### Frente S — Cimientos (sin cambio visible; desbloquean el resto)

**S1 · IMPRESCINDIBLE (dependencia) · Sistema de movimiento** (MOV-05, MARCO-09, A11Y-07, NARR-11#3, PANEL-06#3) — esfuerzo bajo

- **Qué:** un único módulo de movimiento y respeto real de `prefers-reduced-motion` en motion/react.
- **Cómo:**
  - Crear `src/lib/ui/movimiento.ts` con:
    - `EASE = { salida:[0.22,1,0.36,1], entradaSalida:[0.65,0,0.35,1], estandar:[0.4,0,0.2,1] }`;
    - `DUR = { instante:.12, rapida:.2, base:.32, lenta:.5, escena:.9 }`;
    - `RESORTE = { pastilla:{type:'spring',stiffness:420,damping:34}, orbita:{type:'spring',stiffness:120,damping:22}, tooltip:{stiffness:600,damping:45,mass:.5} }`;
    - el único `reducirMovimiento()`. `src/components/mapa/estilo.ts` lo reexporta.
  - Sustituir los 7 `const suave`, los 5 literales y los 4 resortes 420/34 por imports.
  - Crear `src/components/Proveedores.tsx` (`"use client"`) con `<MotionConfig reducedMotion="user">`, sin `transition`. Envolver `{children}` en `src/app/layout.tsx`.
  - Casos que MotionConfig no cubre: `CifraAnimada` (ver P3) y `scrollIntoView` en `Tablero.tsx:277`, que pasa a `behavior: reducirMovimiento() ? 'auto' : 'smooth'`.
  - En `globals.css`: `--ease-salida` en `:root` y en el `@theme inline` existente. No tocar `tokens.css`.
- **Comprobación:**
  - `grep -rn "0.22, 1, 0.36" src` solo devuelve `movimiento.ts`.
  - Con «Reducir movimiento» activado en el sistema, el h1 del login queda visible y nada se desliza.
  - `pnpm build` sin errores.

**S2 · IMPRESCINDIBLE (defecto) · Esc cierra solo la capa superior** (INT-01, FLUJO-02, A11Y-02#5, MAPA-08#1, EJES-01(modal)#6, EJES-09#5, NARR-01#7, NARR-08#3) — esfuerzo bajo

- **Qué:** hoy un solo Esc cierra el modal y además saca del departamento o de Mundo. Esc en el buscador de narrativas también expulsa del territorio.
- **Cómo:**
  - Crear `src/lib/ui/useEscape.ts`:
    - una pila de módulo y un único listener en `window`;
    - `useEscape(handler, activo)` apila en el efecto y desapila en el cleanup, con ref al handler;
    - se ejecuta solo `pila.at(-1)`.
  - Base en `Tablero.tsx`, siempre activa. Ignora el evento si `e.target` es input, textarea, select o contentEditable. Prioridad: `seleccion` → `setSeleccion(null)`; `departamento` → `salir()`; `ambito==='internacional'` → `cambiarAmbito('nacional')`.
  - Eliminar el efecto de `MapaColombia.tsx:626-636` y la rama Escape de `ModalEjes.tsx:89`.
  - Capas que apilan: ModalEjes (`onCerrar`) y el popover de Temas en `BarraFiltros` mientras `abierto`, que al cerrar devuelve el foco al botón. Después: la hoja inferior, Pista, el detalle de fila y «¿Cómo se calcula?».
  - En los inputs: `onKeyDown` con Escape hace `e.stopPropagation()` y luego `setBusqueda('')` si hay texto, o `blur()` si no lo hay.
  - Pista de `Tablero.tsx:271`: «Esc: subir un nivel».
- **Comprobación:**
  - Departamento → municipio → abrir modal → Esc cierra solo el modal.
  - El siguiente Esc quita la selección, el siguiente sale del departamento.
  - Esc en el buscador limpia el texto sin cambiar de territorio.
  - Esc con Temas abierto solo cierra el popover.

**S3 · RECOMENDADO · Foco de teclado con marca** (MARCO-10, A11Y-04#1, PANEL-12#5, NARR-09#4, MOV-06#1, EJES-09#8, MAPA-08#4, A11Y-03#3) — esfuerzo bajo

- **Cómo:**
  - En `globals.css`: `@layer base { :where(a,button,summary,input,select,textarea,[role='tab'],[role='radio'],[tabindex]:not([tabindex='-1'])):focus-visible { outline:2px solid var(--gold-500); outline-offset:2px } }`, sin `border-radius`.
  - `.bg-action-primary:focus-visible{ outline-color: var(--text-primary) }`.
  - Utilidad `.foco-dentro{ outline-offset:-2px }` para hijos de contenedores con `overflow-hidden`: filas del ranking, chips dentro de vidrio, tabla con scroll.
  - Sustituir `.mapboxgl-canvas:focus{outline:none}` (`globals.css:188-190`) por `.mapboxgl-canvas:focus:not(:focus-visible){outline:none}` y `.mapboxgl-canvas:focus-visible{outline:2px solid var(--gold-500);outline-offset:-2px}`. Deben ir sin capa, junto a las reglas de Mapbox.
- **Comprobación:**
  - Recorrer con Tab el encabezado, los controles, las pestañas y el modal: el anillo dorado siempre se ve.
  - Los dos inputs con `outline-none` conservan su anillo propio.

**S4 · RECOMENDADO · Tokens propios de la app en `globals.css`** (A11Y-06#1, #4; MARCO-12d; MARCO-09d)

- **Cómo:**
  - En `:root`: `--text-muted: rgba(237,241,247,.66)`, `--text-secondary: rgba(237,241,247,.80)`, `--border-control: rgba(255,255,255,.38)`, `--bg-mapa: #040C1D`.
  - En `@theme inline`: `--color-control` y `--color-mapa`.
  - Reemplazar `bg-[#040C1D]` en `loading.tsx:8` y `Tablero.tsx:191`.
  - Aplicar `border-control` en inputs, «Salir», cerrar del modal y paginación.
- **Comprobación:**
  - `diff -q src/app/styles/tokens.css public/linea-grafica-patria/tokens/tokens.css` sigue sin diferencias.
  - Contraste de `text-muted` ≥ 5.8:1 sobre surface-3.

**S5 · RECOMENDADO · Piezas compartidas** (nacen en la oleada donde se usan por primera vez)

- `src/components/ui/Pista.tsx`: tooltip con `createPortal` a `document.body`, `fixed z-[70]`, `role="tooltip"` y `useId`. Nace en P11. La reutilizan los chips de eje de M4.
- `src/components/tablero/EstadoVacio.tsx`: nace en P2 o N3. Reemplaza `Vacio` de `Graficas.tsx:292`.
- `src/components/ui/Segmentado.tsx`: radiogroup con roving tabindex y `layoutId` como prop. Nace en M4. Lo usan ámbito, métrica y Agrupadas/Todas.
- `describirFiltros(filtros, pnd)` en `src/lib/datos/catalogos.ts`, extraído de `Narrativas.tsx:158-165`. Lo usan P2, P4, N2 y la región viva de X1.

---

### Frente G — Globo (queja 1)

**G1 · IMPRESCINDIBLE · Encuadre del globo según el contenedor** (MAPA-01, RESP-01#1, MOV-01 B–D, MUNDO-01#1) — impacto alto, esfuerzo bajo

- **Cómo:**
  - En `src/components/mapa/paises.ts`, exportar `zoomGlobo(ancho, alto, libre = {top:64, bottom:8}, k = 0.85)`:
    - `f=1.5*alto; d=f*Math.SQRT1_2`;
    - `D=Math.min(k*Math.min(ancho,alto), alto-libre.top-libre.bottom-8, ancho-24)`;
    - `s=D/(2*f); R=s*d*(s+Math.hypot(s,1))`;
    - devuelve `clamp(Math.log2(2*Math.PI*R/512), 0.3, 2.6)`.
  - En `MapaColombia.tsx`, efecto de ámbito (`:614-621`): `easeTo({ center: reducirMovimiento()?[-72,6]:[-62,8], zoom: zoomGlobo(w,h,libre), pitch:0, bearing:0, padding:{top:libre.top,bottom:libre.bottom,left:0,right:0}, duration: reducirMovimiento()?0:2200, easing: t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, essential:true })`.
  - `libre.top`: 64 en escritorio. El casquete puede pasar bajo la fila de filtros, tras el vidrio. En móvil, la altura medida de M5; mientras no exista, 120.
  - ResizeObserver (`:436`): `map.resize()` y, con debounce de 120 ms, si `ambito==='internacional' && !zoomManual`, llamar `giro.fijarZoom(z)`. Con el giro parado, `map.jumpTo({zoom:z})`. Nunca `easeTo`.
  - `zoomManual = true` en `zoomend` con `e.originalEvent`. Se reinicia al entrar a Mundo.
  - Al volver a Colombia no se toca nada: `fitBounds` repone su padding.
- **Comprobación:**
  - Medir el disco a 1440×900, 1366×768, 1280×800 y 390 px: entre el 80 y el 88 % del lado menor.
  - El disco no se recorta a los lados en móvil y el halo de atmósfera queda entero.
  - Redimensionar en Mundo reencuadra sin tirón.
  - Tras Ctrl+rueda ya no se reencuadra.
  - El encuadre nacional al volver es idéntico al de antes.
  - Si el casquete molesta bajo los filtros, bajar `k` a 0.82.

**G2 · IMPRESCINDIBLE · Giro como integrador continuo, que convive con la cámara** (MAPA-02, MAPA-03, RESP-01#2, MOV-01 A, MUNDO-01#2, MARCO-05#0) — impacto alto, esfuerzo medio

- **Cómo:** reescribir `crearGiro` en `paises.ts`.
  - Estado: `v`, `objetivo`, `anterior`, `latBase=8`, `zoomObjetivo`, `agarrado`, `libreDesde`, `ultimoFueGesto`, `bloqueado`, `pausaUsuario`.
  - Bucle rAF vivo mientras `activo`:
    - `dt = Math.min((ahora-anterior)/1000, 1/30)`.
    - `ocupado = agarrado || map.isMoving()`. Si está ocupado: `v = 0` y no se llama `jumpTo`. Al liberarse se registra `libreDesde`.
    - Espera tras liberarse: 1500 ms si lo último fue un gesto (`dragend`, `zoomend`, `rotateend` o `pitchend` con `originalEvent`); 150 ms si fue programático.
    - `tau = objetivo>v ? 0.9 : 0.3`; `v += (objetivo-v)*(1-Math.exp(-dt/tau))`.
    - Crucero efectivo: `(ancho<640 ? 2.4 : 3) * clamp(1-(map.getZoom()-zoomBase)/1.5, 0, 1)`.
    - Un único `map.jumpTo({ center:[((lng - v*dt + 540)%360)-180, lat + (latBase-lat)*(1-Math.exp(-dt/4))], zoom })`. El zoom se interpola hacia `zoomObjetivo` con tau 0.35.
    - Si `v<0.02` y el zoom está asentado, no se llama `jumpTo`.
  - `agarrado = true` en `mousedown` y `touchstart` del mapa. `false` en `window` con `mouseup`, `touchend`, `touchcancel` y `blur`.
  - `document` `visibilitychange` → `anterior = 0`.
  - Quitar `wheel` de la lista de pausa.
  - API: `iniciar()` (respeta `reducirMovimiento()`), `frenarSuave()`, `soltar(ms)`, `detener()`, `fijarZoom(z)`, `bloquear(b)`, `pausaUsuario(b)`, `destruir()`. Este último quita también los listeners de `window` y `document`.
  - En `MapaColombia`: eliminar el `setTimeout` de 1900 ms (`:622`). Se llama `iniciar()` justo después del `easeTo`: mientras dura, `isMoving()` calla el giro, y luego arranca con rampa desde 0.
- **Comprobación:**
  - El arranque y el frenado se ven con rampa, sin tirón.
  - Un clic en + o − del NavigationControl mientras gira completa su zoom.
  - Arrastrar con inercia: la inercia termina y el giro vuelve a los 1.5 s con rampa.
  - Ocultar la pestaña 30 s y volver no produce salto.
  - Al acercarse con zoom, el globo se aquieta solo.
  - En una grabación Performance de 10 s no hay frames de script por encima de 16 ms.

**G3 · IMPRESCINDIBLE · Política de hover, inactividad y pausa** (MAPA-02 hover, RESP-01#3–4, MOV-01 E–F, EJES-10 «pausado», MUNDO-01#3) — esfuerzo medio

- **Cómo:** en el `mousemove` del mapa (`:385-410`).
  - Si el país tiene datos (`cifrasPaises.get(codigo)?.[metrica] > 0`, leído de `ultimo.current`) → `frenarSuave()`. Al salir de ese país → `soltar(600)`.
  - Sobre océano o países sin datos no se toca el giro. `mouseout` → `soltar(0)`.
  - Inactividad: 4 s sin `mousemove` con el cursor dentro → objetivo de crucero, `marcarHover(null)` y cierre del tooltip.
  - Mientras `v>0.5` y el cursor esté dentro, re-evaluar `objetivo(ultimoPunto)` cada 200 ms.
  - Nueva prop `pausado` en MapaColombia. Tablero pasa `ejesAbiertos`, y el mapa llama `giro.bloquear(pausado)`. El overlay del modal dispara `mouseout`, y sin el bloqueo el giro se reanuda debajo.
  - WCAG 2.2.2: un IControl propio en `bottom-right`, añadido después del NavigationControl para que quede encima.
    - `onAdd` devuelve `<div class="mapboxgl-ctrl mapboxgl-ctrl-group">` y React pinta el botón con `createPortal`.
    - En Mundo el botón es «Giro automático» con `aria-pressed`, y activa `pausaUsuario`.
    - En Colombia ese mismo hueco muestra «Vista 3D» (M4).
- **Comprobación:**
  - Cruzar el cursor del Pacífico a África sin paradas.
  - Detenerse sobre Colombia: frena en unos 0.5 s y sale el tooltip.
  - Cursor aparcado 4 s: el giro se reanuda y el tooltip se cierra.
  - Abrir el modal en Mundo deja el globo quieto; cerrarlo lo reanuda.
  - El botón de pausa se opera con teclado.

**G4 · IMPRESCINDIBLE (fluidez) · Tooltip fuera de React** (MAPA-09, REND-02) — esfuerzo medio

- **Cómo:**
  - `x` e `y` con `useMotionValue`, y `useSpring` con `RESORTE.tooltip`.
  - Contenedor `absolute top-0 left-0` con `style={{x,y}}`, sin `.vidrio`: `bg-surface-1/95` con borde de vidrio.
  - Handler limitado por rAF: como mucho un `queryRenderedFeatures` por frame.
  - `setObjetivoHover` solo cuando cambia `o?.codigo`.
  - `jump()` al reaparecer o al voltear de lado.
  - Volteo con tamaño real: ref y `getBoundingClientRect` en `useLayoutEffect`.
  - Tamaño del contenedor cacheado desde el ResizeObserver.
  - `useMemo` para `maxEscala` (`:640-647`).
  - Contenido: un país sin datos muestra una línea («Brasil · Sin registros»). Uno con datos muestra las tres métricas y «Clic para ver el detalle nacional».
  - Continente en español con un diccionario en `paises.ts`, con el valor crudo como respaldo.
  - Con `matchMedia('(hover: none)')` no hay tooltip de hover.
- **Comprobación:**
  - React DevTools Profiler: mover el cursor dentro del mismo país no re-renderiza MapaColombia.
  - El tooltip no «vuela» al reaparecer.
  - Pegado al borde derecho o inferior se voltea sin cortarse.

**G5 · RECOMENDADO · Transición Colombia ↔ Mundo sin corte seco** (MAPA-04) — esfuerzo medio

- **Cómo:**
  - Al cambiar de ámbito: `zM = zoomGlobo(w,h)`; `zN = map.cameraForBounds(COLOMBIA,{padding})?.zoom ?? 4.5`; `a = zM+0.3*(zN-zM)`; `b = zM+0.8*(zN-zM)`.
  - `setPaintProperty` con expresiones `['interpolate',['linear'],['zoom'], a, …, b, …]` solo durante la transición.
    - Países: de 0.88 a 0.
    - Departamentos: de 0 al `case` original.
  - Ambos grupos quedan visibles durante el vuelo.
  - En `map.once('moveend')` (con `off` en el cleanup): ocultar el grupo saliente y restaurar las expresiones normales. Extraerlas a constantes en `estilo.ts` y `paises.ts`.
  - Regreso: `giro.detener()` y `duration = clamp(1500 + 10*deltaGrados, 1600, 3200)`, con `curve: 1.2`.
  - Con 3D activo, bajar antes las torres (M7).
  - Con movimiento reducido: conmutar `visibility`, como hoy.
- **Comprobación:**
  - Sin destello dorado a pantalla completa.
  - En reposo en Mundo, hacer zoom manual a 4 o más no desvanece los países.
  - Revertir el ámbito a mitad de vuelo no deja capas a medias.
  - Revisar el parpadeo por teselas retenidas; si aparece, acercar `a` a `zM`.

**G6 · RECOMENDADO · Coherencia de la vista Mundo** (MAPA-11, MAPA-07#5, MAPA-08#3, PANEL-02#5, MUNDO-01#5 parcial)

- **Cómo:**
  - `vestirMapaBase`: `setLayoutProperty(id,'text-field',['coalesce',['get','name_es'],['get','name']])` en las tres capas visibles.
    - Verificar antes con `map.getLayer('country-label')` que la fuente es `composite`.
    - Plan B: `language:'es'` en el constructor.
  - En Mundo: `continent-label` a 0.18 y `country-label` a 0.35, con `text-size` interpolado de 10 a 13. Revertir al salir.
  - Clic sobre Colombia → `onAmbito('nacional')`. El cursor `pointer` solo aparece sobre países accionables.
  - Leyenda: si solo hay un país con datos, una tarjeta compacta «Colombia · 807 aportes · único país con registros». El texto se condiciona a `conDatos.length===1`. Al clic centra con `easeTo`.
  - Miga: `totalPaises` y `totalDepartamentos` por props, no literales (`ControlesMapa.tsx:81-85`).
  - Panel: `nivel = 'Colombia en el mundo'` y la nota «La base aún no registra país de origen; las cifras corresponden a Colombia».
- **Comprobación:**
  - Se lee «Estados Unidos», «Brasil», «Océano Pacífico Norte».
  - Las etiquetas base no compiten con la cifra de Colombia.
  - El panel no dice «País · Colombia» sin explicación.

---

### Frente E — Modal «Ejes articuladores» (quejas 2 y 3)

Sugerencia de estructura para evitar un archivo de 900 líneas: partir `src/components/ejes/ModalEjes.tsx` en `ModalEjes.tsx` (marco y diálogo), `Orbita.tsx`, `TarjetaEje.tsx`, `DetalleEje.tsx`, `PanoramaEjes.tsx` y `useOrbita.ts` (rotación, `irA`, `paso`, rueda, pan, giro).

**E0 · RECOMENDADO · Precarga del modal** (EJES-12, REND-05#5, EJES-01(flujo)#8, A11Y-02)

- **Cómo:**
  - `onPointerEnter` y `onFocus` en el botón de `Encabezado.tsx:56` ejecutan `import('@/components/ejes/ModalEjes')`.
  - `requestIdleCallback` tras la intro, con `setTimeout` de 2 s como respaldo.
  - `loading` del `dynamic()`: un velo `fixed inset-0 z-50 bg-[rgba(3,8,20,.9)]` con `role="status"`.
- **Comprobación:** en Network con «Slow 3G», el primer clic muestra el velo al instante.

**E1 · IMPRESCINDIBLE · Flechas laterales, indicador y teclado correcto** (EJES-01(modal), A11Y-01#1–3,6, MOV-02#1–2,8, EJES-01(flujo) fase A)

- **Cómo:**
  - `alFrente` con `useMotionValueEvent(rotacion,'change', …)`: `i=((Math.round(-r/60)%6)+6)%6`. `setAlFrente` solo se llama si `i` cambia.
  - `paso(dir) = irA(((elegido ?? alFrente)+dir+6)%6)`. Lo usan teclado, flechas, puntos, rueda y swipe. Corrige `ModalEjes.tsx:93`, donde con `elegido` nulo → siempre iba al índice 1.
  - Dos `motion.button` reales: `whileTap={{scale:.92}}`, `size-11`, `rounded-full vidrio`, `ChevronLeft`/`ChevronRight size-5`, `aria-label={`Eje anterior: ${nombre}`}`.
    - Desde `sm`: `absolute top-1/2 -translate-y-1/2 left-2|right-2 z-10`, dentro del contenedor de la órbita y después del anillo en el DOM.
    - Por debajo de `sm`: en la fila del indicador.
  - Sustituir el `<p>` de `:200-203` por el indicador:
    - `role="tablist"` con 6 botones numerados (`size-7`, `pointer-coarse:size-11`);
    - píldora dorada con `layoutId="eje-activo"`;
    - anillo dorado en los ejes filtrados;
    - `<p aria-live="polite">3 / 6 · Milagro Social</p>`, la única región viva del modal.
  - Teclado en `onKeyDown` del panel, no en `window`: ←/→, Home/End, 1–6, con `if (e.metaKey||e.ctrlKey||e.altKey) return`. Esc va por S2.
  - Ayuda: con `pointer-fine`, «Flechas, rueda o arrastre»; en táctil, «Deslice para girar».
- **Comprobación:**
  - Con el giro en marcha y sin eje elegido, → abre el eje siguiente al que está al frente.
  - Cmd+← sigue siendo «atrás» del navegador.
  - Las flechas funcionan en móvil sin tapar las tarjetas.
  - El lector de pantalla anuncia «3 / 6 · …».

**E2 · IMPRESCINDIBLE · Rueda y trackpad horizontal, y arrastre y swipe** (EJES-02, A11Y-01#4–5, MOV-02#3–4, EJES-01(flujo) fase A)

- **Cómo:**
  - **Radio medido:** ResizeObserver sobre la columna de la órbita.
    - `radioPx = ancho<640 ? Math.max(150, ancho*0.44) : clamp(150, ancho*0.34, 300)`.
    - Se publica con `style={{'--radio': `${radioPx}px`}}`. Las tarjetas usan `translateZ(var(--radio))`.
  - **Rueda:** `addEventListener('wheel', fn, {passive:false})`, solo en la columna de la órbita.
    - Ignorar `ctrlKey`.
    - `unidad = deltaMode===1?32:deltaMode===2?400:1`.
    - `horizontal = |dx|>|dy| || e.shiftKey`.
    - Por debajo de `lg` solo se captura lo horizontal, porque el cuerpo hace scroll vertical. En `lg` o más, ambos ejes.
    - `preventDefault()` solo si se captura. Eso es lo que evita el «atrás» de macOS, no `overscroll-behavior`.
    - `acum += clamp(d*unidad,-80,80)`. Si `|acum|>=50` y no hay bloqueo: `paso(sign(acum))`, `acum=0` y un bloqueo de 320 ms que descarta la cola de inercia.
    - `acum` se reinicia tras 180 ms de silencio.
  - **Arrastre:** el contenedor pasa a `motion.div` con `touch-pan-y select-none cursor-grab active:cursor-grabbing`.
    - `onPointerDownCapture`: `arrastro=false`.
    - `onPanStart`: `rotacion.stop()` e `interactuando=true`.
    - `onPan`: si `|offset.x|>6` → `arrastro=true`; `rotacion.set(rotacion.get()+info.delta.x*gradosPorPx)`, con `gradosPorPx = 180/(Math.PI*radioPx*1400/(1400-radioPx))`.
    - `onPanEnd`: proyectar `rotacion.get()+v*gradosPorPx*0.28`, elegir el eje más cercano (máximo ±2) y llamar `irA(i, v*gradosPorPx)`.
    - En TarjetaEje: `onClick={() => !arrastro.current && onElegir()}`.
  - `irA(i, velocidad = rotacion.getVelocity())`: camino más corto y `animate(rotacion, destino, {...RESORTE.orbita, velocity, restDelta:.05})`. Con movimiento reducido, `{duration:0}`.
- **Comprobación** (tiene que hacerse en estos dispositivos):
  - Trackpad y Magic Mouse en Safari y Chrome de macOS: un swipe avanza 1–2 ejes, sin «atrás».
  - Ratón de muescas en Windows y en Firefox: una muesca avanza un eje.
  - Por debajo de `lg` el scroll vertical del modal sigue funcionando.
  - Arrastrar y soltar sobre una tarjeta no la abre por accidente.
  - El swipe funciona en iOS y Android.

**E3 · IMPRESCINDIBLE (defecto) · Máquina de estados del giro automático** (EJES-06, A11Y-01#7, MOV-02#7)

- **Cómo:**
  - `giroActivo = !pausaManual && !reducido && elegido===null && !sobreTarjeta && !focoDentro && !interactuando`.
  - `sobreTarjeta` se activa por `onPointerEnter/Leave` de cada tarjeta, solo con `pointerType==='mouse'`. Sobre el contenedor el giro baja de 9 a 3°/s.
  - Reanudación 2.5 s después de la última interacción.
  - Velocidad como MotionValue, animada con `animate(velocidad, objetivo, {duration:.9, ease:EASE.salida})`.
  - En `useAnimationFrame`: `if (interactuando.current || rotacion.isAnimating()) return`.
  - Botón de cabecera:
    - sin eje abierto: «Giro automático», etiqueta fija con `aria-pressed`, visible también en móvil como icono `size-9`;
    - con eje abierto: «Ver los seis» (`elegir(null)`).
  - `useReducedMotion()` en lugar del helper manual.
- **Comprobación:**
  - El giro arranca y frena con rampa.
  - Tras pasar el ratón por el modal, vuelve a girar a los 2.5 s.
  - Con un eje abierto, la órbita no gira por debajo del detalle.

**E4 · IMPRESCINDIBLE (queja 3) · Datos y vocabulario del modal** (EJES-03 datos, EJES-08, INFO-02, EJES-01(flujo) fase B)

- **Cómo:**
  - Nueva `src/lib/datos/ejes.ts` con `resumenEjes(datos, base, codigo)`.
    - `base = filtrar(datos,{...filtros, ejes:[]})`.
    - Devuelve `{ total, relacionadas, sinRelacion, ejes:[{id,total,porcentaje,lineas[{id,nombre,n,pct}],temas(top3),territorios(top3),necesidades,respondidas,alertas,relato|null}] }`.
    - Reutiliza `enTerritorio`, `narrativasDe` y `agruparNarrativas`. Exportar `porFrecuencia` desde `narrativas.ts`.
    - `total` respeta la regla R2 de `agregar.ts`.
  - Sustituye el `useMemo` de `Tablero.tsx:86-95`, condicionado a `ejesAbiertos`. ModalEjes recibe `resumen`.
  - Vocabulario: «aportes» en las 5 apariciones de «participaciones» (`:177, 233, 295, 305, 380`) y en los `aria-label`. «Narrativas» solo para las síntesis.
  - Bloque superior de la órbita: «807 aportes en Colombia», con una barra apilada de 6 px debajo: «795 relacionados con el Plan (98,5 %) · 12 sin relación clara».
  - Si hay filtros de tema o canal: chip «Filtrado por: Salud · Web» con «Quitar» (prop `onLimpiarFiltros`).
  - Todos los porcentajes se calculan sobre `total`, con el denominador escrito.
- **Comprobación:**
  - La cifra del modal coincide con el KPI del panel para el mismo territorio y los mismos filtros.
  - Con filtro de canal, ambas cambian a la vez.
  - Un eje con aportes y sin narrativas muestra «Aún no hay síntesis para este eje».

**E5 · IMPRESCINDIBLE (queja 3) · Panel de detalle, fase 1, con transición direccional y CTA** (EJES-03 A–D y G, EJES-11, MOV-02#6, MOV-04#3)

- **Cómo:**
  - Modal a `w-[min(88rem,96vw)]` y rejilla `lg:grid-cols-[minmax(0,1fr)_clamp(26rem,38%,34rem)]`.
  - Panel `flex flex-col`. El contenido va en `flex-1 overflow-y-auto overscroll-contain`. El pie queda fijo fuera del scroll, con un degradado de 24 px encima.
  - Contenido:
    - A) Insignia, nombre y «Ver los seis». La visión como lead: `text-[15px] text-primary/90 border-l-2 border-gold-500 pl-3`.
    - B) Tira `grid-cols-3` con CifraAnimada: aportes (con «x % de {territorio}»), necesidades vinculadas (con «y con respuesta» y la nota «una necesidad puede tocar varios ejes») y alertas activas.
    - C) Líneas como barras ordenadas: nombre a 13 px, barra `h-1.5` dorada y `n · %`. Las líneas en 0 se agrupan tras «y N líneas aún sin voces».
    - D) «Lo que más se repite»: cita con `Quote` y «×N · municipios · coincide por: …», rotulada «entre N narrativas sintetizadas».
  - Transición: contenedor `grid` con los hijos en `[grid-area:1/1]`. `AnimatePresence initial={false} custom={dir}`, sin `wait`.
    - Entra `{opacity:0,x:28*d}` → centro en 0.22 s. Sale `{opacity:0,x:-28*d}` en 0.18 s.
    - Sin blur. `pointer-events-none` en el saliente.
    - `dir` es el signo del camino más corto, guardado en un ref dentro de `irA`.
  - El detalle solo cambia al encajar. El indicador sí sigue a `alFrente` en vivo.
  - CTA primario «Filtrar el tablero por este eje». Al pulsarlo, el pie cambia en 0.2 s a «Ver el tablero filtrado» (cierra el modal) y «Quitar filtro», con «Filtro aplicado» y `Check` durante 1.2 s.
- **Comprobación:**
  - Cambiar de eje tarda unos 0.25 s, no 0.7 s, y entra desde el lado del giro.
  - El CTA nunca tapa la lista.
  - Se pueden marcar dos ejes sin reabrir el modal, y el contador de `Encabezado.tsx:64-68` lo refleja.

**E6 · IMPRESCINDIBLE (queja 3) · Estado inicial «Los seis ejes frente a frente» y apertura contextual** (EJES-04)

- **Cómo:**
  - Reemplaza el vacío punteado de `:283-299`.
  - Titular calculado: «Milagro Social concentra el 53 % de los aportes de Colombia».
  - 6 filas-botón con el patrón de `AlineacionPnd.tsx:63-101`, extraído a un componente compartido `FilaEje`: insignia, nombre, barra `h-1.5` con `initial={{width:0}}`, `n` y `%`.
  - Orden por peso, con un conmutador «por número».
  - Fila discontinua «Sin relación clara con el Plan: N (x %)».
  - Hover o foco en una fila: `girarA(i)` sin abrir, con intención de 120 ms y cancelación al salir. Clic: `irA(i)`.
  - Apertura: `useState(() => { const i = ejes.findIndex(e => ejesFiltrados.includes(e.id)); return i>=0 ? i : null })` y `useMotionValue(-(iInicial ?? iMayor)*60)`.
  - Prop `ejeInicial` opcional. La usan N7, P12 y F4.
- **Comprobación:**
  - Con el Eje 4 filtrado, el modal abre en el Eje 4.
  - Sin filtro, queda al frente el eje con más aportes, sin abrirlo.
  - Barrer la lista con el ratón no encadena seis giros.

**E7 · IMPRESCINDIBLE (queja 3, «se siente raro») · Tarjetas legibles: billboard, geometría e higiene** (EJES-05, EJES-10 tamaño y render, A11Y-01#8, REND-03#2)

- **Cómo:**
  - En el envoltorio de TarjetaEje:
    - Quitar `transform`, `filter` y `[backface-visibility:hidden]` del `style`.
    - `style={{ rotateY: contra, opacity }}`.
    - `transformTemplate={(_, g) => `rotateY(${indice*60}deg) translateZ(var(--radio)) ${g} rotateX(var(--inclinacion))`}`.
    - `angulo = useTransform(rotacion, r => ((((r+indice*60)%360)+540)%360)-180)`.
    - `contra = useTransform(angulo, a => -a + 22*Math.sin(a*Math.PI/180))`.
  - Anillo con `rotateX: -12` (probar de −10 a −14) y `--inclinacion:12deg`. `will-change: transform`.
  - Quitar `backdrop-blur-sm` (`:359`). El fondo inactivo pasa a `rgba(10,26,58,.94)`.
  - Oscurecer con un velo interno `bg-[#030814]`, con `opacity = useTransform(frente,[0,1],[.55,0])`.
  - Tarjeta de 13×15rem desde `sm` (`w-36 h-44` por debajo):
    - insignia y chip dorado con `Filter` si está filtrada, en lugar de «· filtrando»;
    - nombre a `1.05rem font-extrabold text-balance`;
    - la línea con más voces en `line-clamp-1`;
    - cifra en `text-2xl` dorada con «x % de {territorio}» y barra `h-1.5` sobre el total, con un mínimo de 2 px;
    - `gap-3` con la cifra en `mt-auto`, en lugar de `justify-between`;
    - activa: `border-gold-500 shadow-glow-gold`.
- **Comprobación:**
  - A ±60° el nombre de las tarjetas laterales se lee completo.
  - Las traseras asoman unos 65 px sobre la frontal.
  - El hit-testing de las traseras no roba clics a las laterales.
  - Sin solapes entre 1024 y 1279 px.
  - En DevTools → Layers no hay una capa de backdrop por tarjeta.

**E8 · IMPRESCINDIBLE (defecto) · Diálogo accesible de verdad** (EJES-09, A11Y-02#1–4, INT-01#5, FLUJO-02)

- **Cómo:**
  - Tablero devuelve un fragmento: `<><div inert={ejesAbiertos} className="flex min-h-dvh flex-col">…</div><AnimatePresence>{ejesAbiertos && datos.pnd && <ModalEjes/>}</AnimatePresence></>`.
  - `role="dialog" aria-modal="true" aria-labelledby="titulo-ejes"` pasa al panel. `id` en el h2. Quitar `aria-label` del backdrop.
  - Trampa de Tab que cicla primero/último de `panel.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')`.
  - Guardar `document.activeElement` al montar y devolverle el foco en el cleanup, con `preventScroll`.
  - Bloqueo de scroll en el body, en el mismo efecto: `document.body.style.overflow='hidden'` y `document.documentElement.style.overscrollBehaviorX='none'`. Se restauran a `''` en el cleanup. Añadir `html{scrollbar-gutter:stable}` en `globals.css`.
  - Tarjetas 3D con `tabIndex={-1}` y `aria-hidden`.
  - Detalle con `role="tabpanel" id="detalle-eje"`, sin `aria-live`.
- **Comprobación:**
  - Tab no sale del modal.
  - Al cerrar, el foco vuelve a «Ejes articuladores».
  - La rueda sobre el modal en `lg` no desplaza la página.
  - En Windows con barra de scroll clásica no hay salto de 15 px.
  - VoiceOver no lee el fondo.

**E9 · RECOMENDADO · Móvil de 390 px** (EJES-07, RESP-04#5)

- **Cómo:**
  - `h-[min(92dvh,52rem)]`.
  - Al abrir un eje, la órbita pasa de `min-h-[20rem]` a `min-h-[13rem]` con `transition-[min-height] duration-300`. Nunca con `layout`.
  - El anillo se escala con un MotionValue `scale` a .85.
  - `detalleRef.current?.scrollIntoView({block:'nearest'})` dentro de un rAF.
  - Pie: `<details>` con el summary «Fuente y método».
  - Etiqueta corta «PND 2026-2030».
  - CTA en el pie fijo, con `pb-[max(.75rem,env(safe-area-inset-bottom))]`.
- **Comprobación:** en iOS Safari real:
  - `dvh` con la barra inferior;
  - el pan horizontal frente al gesto «atrás» del borde;
  - el detalle visible sin buscar tras tocar una tarjeta.

**E10 · RECOMENDADO · Escena con luz, suelo y cielo** (EJES-10)

- **Cómo:**
  - Brillo especular con `backgroundPositionX = useTransform(angulo,[-60,60],['100%','0%'])` y canto `border-t-white/25`.
  - Suelo: una elipse con `rotateX(78deg)`, diámetro `calc(var(--radio)*2 + 13rem)`, borde dorado al 20 % y un radial dorado.
  - Sombra de contacto por tarjeta, ligada a `frente`.
  - `.estrellas` ampliadas a unos 18 puntos en 2–3 capas, con parallax `x = useTransform(rotacion, r => (r%360)*0.15)`.
  - Mantener `perspective:1400px`.
- **Comprobación:**
  - Performance antes y después sin degradación.
  - El alto sobrante (unos 160 px arriba y abajo) queda ocupado.

**E11 · RECOMENDADO · Detalle, fase 2, y salidas hacia el tablero** (EJES-03 E–F, EJES-11 «Ver sus narrativas», EJES-01(flujo))

- **Cómo:**
  - Dos columnas: «Sectores que más hablan» (top 3, con `temaDe()`) y «Dónde se concentra».
  - Ficha institucional en `<dl>`: área DNP e indicadores, o un chip «Batería pendiente».
  - Enlace «Ver sus narrativas»: nueva prop `onVerNarrativas(id)`.
    - Asegura el eje en `filtros.ejes`, cierra el modal, pone la pestaña «narrativas» y hace scroll a `#narrativas`.
    - El scroll se ejecuta en `onExitComplete` del AnimatePresence de Tablero, después de liberar el bloqueo de scroll.
  - Requiere subir `pestana` de `Narrativas.tsx:68` a Tablero como prop controlada (ver F0).
- **Comprobación:** desde el Eje 3, «Ver sus narrativas» aterriza en la tabla ya filtrada por ese eje.

**E12 · OPCIONAL · Coreografía de apertura y cierre** (EJES-12)

- **Cómo:**
  - `transformOrigin` hacia el botón: `onEjes(rect)` desde Encabezado.
  - `--apertura` como MotionValue aplicado como variable CSS en el anillo, y `translateZ(calc(var(--radio) * var(--apertura)))`.
  - Barrido inicial de `destino+120` a `destino` en 1.1 s.
  - `pointer-events` del anillo desactivados hasta `apertura>.9`.
  - Con movimiento reducido: solo un fundido de .15 s.

---

### Frente M — Mapa nacional y controles

**M1 · IMPRESCINDIBLE (defecto) · Bajar a municipios sin depender del doble clic** (MAPA-08#2, FLUJO-03, A11Y-03#1, PANEL-09#0–2)

- **Cómo:**
  - Arreglo inmediato en `Tablero.tsx:384`: `onElegir={(c) => { if (ambito==='internacional') cambiarAmbito('nacional'); departamento ? setSeleccion(c) : entrar(c); }}`.
  - Con `seleccion?.length===2 && !departamento`, junto a «Quitar selección» (`:309-321`) va un botón primario dorado «Explorar sus N municipios», con `ArrowRight`, que llama `entrar(seleccion)`.
  - La píldora inferior se vuelve contextual y clicable: «Antioquia seleccionada · Explorar municipios», con `pointer-events-auto` y entrada `y:8→0` en 250 ms.
  - Ranking: cada fila es `<div className="group relative flex">` con dos botones hermanos.
    - El principal selecciona.
    - A nivel nacional, un icono `ArrowUpRight` a `opacity-60` explora, con `aria-label="Explorar {nombre}"`.
  - `ranking` devuelve `{top, propia}`:
    - la fila activa lleva `shadow-[inset_2px_0_0_var(--gold-500)]` y `aria-current`;
    - `propia` va tras un separador punteado, con su puesto real;
    - se añade el % sobre el total del nivel.
- **Comprobación:**
  - Se llega a municipios solo con teclado y solo con táctil.
  - En Mundo, un clic en el ranking vuelve a Colombia y entra al departamento con coherencia.
  - El departamento seleccionado fuera del top aparece como «14.º».

**M2 · IMPRESCINDIBLE (defecto) · Carga y errores del mapa** (MAPA-10, MARCO-06 a–b, ACCESO-01 carga, A11Y-03#2 y #4, REND-01#1–4)

- **Cómo:**
  - **Robustez:**
    - sin `NEXT_PUBLIC_MAPBOX_TOKEN` → error `'token'` sin crear el mapa;
    - `if (!mapboxgl.supported())` y `try/catch` alrededor de `new mapboxgl.Map`;
    - validar `r.ok` en cada fetch;
    - `try/catch` en el `await geo`;
    - `map.on('error')` es fatal solo antes de `load`; después, `console.warn`;
    - un temporizador de 12 s hasta `capasListas`;
    - UI: tarjeta centrada con `TriangleAlert`, «No pudimos cargar el mapa», la causa, «El resto del tablero sigue disponible» y «Reintentar»;
    - `MapaColombia` pasa a ser un envoltorio con `intento` que renderiza `<MapaInterno key={intento} …/>`.
  - **Ruta crítica corta:**
    - `Promise.all` solo de departamentos;
    - `addSource('municipios', {data: vacía, promoteId:'codigo'})`;
    - `cargarMunicipios()` es idempotente: `getSource('municipios').setData('/data/geo/municipios.json?v='+GEO_VERSION)`, en `requestIdleCallback` tras la intro o al primer `onEntrar`;
    - las capas `pais-*` también nacen vacías, para que `mapaListo()` siga valiendo; el fetch se hace al primer cambio a Mundo o en idle;
    - sustituir `geo.mun` (`:499-509`) por un índice `Map<dpto,string[]>` memoizado desde `Object.keys(municipios)`;
    - la miga muestra «Cargando municipios…» hasta `sourcedata` con `isSourceLoaded`.
  - **Cargador único:**
    - `src/components/tablero/CargaMapa.tsx`, sin `"use client"`, con `role="status"`, el escudo con `<Image preload>`, `.tricolor`, la etiqueta y una barra indeterminada;
    - se usa en `loading.tsx` («Consolidando el panorama nacional») y en Tablero dentro de un `AnimatePresence` con `mapaListo` («Cargando cartografía»);
    - `dynamic()` con `loading: () => null`;
    - prop `onCapasListas`;
    - eliminar el overlay de `:657-670`;
    - la `<section>` del mapa va sin animación de entrada (`initial={false}`).
  - **Locale** (`:304-308`): completar `NavigationControl.ZoomIn`, `ZoomOut`, `ResetBearing`, `AttributionControl.ToggleAttribution` y `Map.Title`.
- **Comprobación:**
  - Bloquear `municipios.json` en DevTools: el mapa nacional carga, y al entrar a un departamento sale «Cargando municipios…», sin spinner eterno.
  - Token vacío: tarjeta de error con KPIs y narrativas funcionando.
  - «Reintentar» remonta el mapa.
  - En Performance desaparece la tarea larga del `JSON.parse` de 2.1 MB.
  - Se ve una sola identidad de carga, sin doble fundido.

**M3 · RECOMENDADO · Franja inferior única y leyenda honesta** (MAPA-07, MARCO-12e, RESP-02 A2, MUNDO-01#6)

- **Cómo:**
  - Dentro de MapaColombia: `<div className="pointer-events-none absolute inset-x-3 bottom-11 flex items-end justify-between gap-3 sm:inset-x-4">` con tres hijos:
    - la leyenda, `shrink-0`;
    - el slot `{pie}`, con `min-w-0 flex-1 justify-center`;
    - un espaciador `w-10`.
  - Tablero pasa la píldora (`:242-284`) en `pie`.
  - La entrada se ata a `introTerminada`, no al `delay: 4.2`.
  - Clase `@container` en la `<section>` del mapa. Pistas con `hidden @4xl:flex`.
  - Las pistas duran 8 s tras la intro y tras cada cambio de nivel o ámbito. Después colapsan a «Ver narrativas» y reaparecen con hover o foco.
  - Leyenda:
    - 4 marcas con los valores `1`, `round(max*.25)`, `round(max*.5625)` y `max`, con `formatoNumero`;
    - nota «escala raíz cuadrada»;
    - sin marcas intermedias si `max<8`;
    - por debajo de 640 px se pliega a un chip «Escala».
  - Mientras el canvas tiene foco, la pista muestra «Flechas: mover · +/−: zoom · Esc: subir un nivel» (MARCO-10#3).
- **Comprobación:**
  - A 1280, 1440, 1600 y 1920 px la píldora nunca pisa la leyenda ni el logo de Mapbox.
  - El punto medio del degradado está rotulado con el 25 % del máximo.

**M4 · RECOMENDADO · Controles superiores, fase A (escritorio)** (MAPA-05 A, RESP-02 A1 y A3–4, A11Y-04#2, A11Y-05#1–2 y #4)

- **Cómo:**
  - 2D/3D sale de `SelectorMetrica` y pasa al IControl de G3: etiqueta fija «Vista 3D», `aria-pressed`, oculto en Mundo. Prop `onModo3d` en MapaColombia.
  - Por debajo de `@4xl` (contenedor menor de 896 px):
    - contador de la miga `hidden @4xl:inline`;
    - título en `text-base`;
    - ámbito solo-icono, conservando el `aria-label`.
  - `Segmentado` (S5) para ámbito y métrica.
  - Chips de eje con `aria-label={`Eje ${n}: ${nombre}`}` y una Pista «Eje 3 · Milagro Social · 41 aportes». BarraFiltros recibe los conteos por eje.
  - Popover de Temas con `max-h-[min(24rem,55dvh)] overflow-y-auto scroll-fino overscroll-contain`.
  - Objetivos táctiles:
    - `pointer-coarse:size-11` en los chips de eje y `pointer-coarse:h-11` en canales y segmentados;
    - hit-slop `after:absolute after:-inset-2` en los botones de 16–20 px: «Quitar selección», la X de búsqueda, «Colombia» de la miga.
  - Mover el bloque de controles (`Tablero.tsx:215-239`) antes de `<MapaColombia>` en el JSX, con `z-10`. Tab recorre entonces miga → ámbito → métrica → filtros → mapa.
  - `h-[72svh]` en el mapa y en `loading.tsx:8`.
- **Comprobación:**
  - La primera fila cabe en una línea a 1280, 1366 y 1440 px. Hoy se parte por debajo de unos 1473 px.
  - El orden de Tab es el visual.
  - Las paradas de tabulación bajan de unas 25 a unas 10.

**M5 · RECOMENDADO · Padding medido y reencuadre** (MAPA-06)

- **Cómo:**
  - En Tablero: refs al bloque de controles y a la franja inferior. Un ResizeObserver guarda `margenes={top,bottom}`, redondeado a múltiplos de 8, y lo pasa como prop.
  - `relleno(tamano, margenes) => {top: margenes.top+12, bottom: Math.max(24, margenes.bottom+12), left/right: width<640 ? 20 : 40}`.
  - `reencuadrar()` repite la `fitBounds` vigente con `duration:300`:
    - desde el ResizeObserver del contenedor, con debounce de 200 ms;
    - cuando `margenes.top` cambie más de 24 px;
    - solo si `ambito==='nacional'`, `introTerminada` y `!camaraManual`.
  - `camaraManual` se activa en `dragend`, y en `zoomend`, `rotateend` o `pitchend` con `originalEvent`. Se reinicia al cambiar de departamento, 3D o ámbito.
  - El mismo `margenes.top` alimenta `libre.top` de G1 en móvil y los stops de G5.
- **Comprobación:**
  - «La Guajira» ya no toca el chip «Voz».
  - Tocar un filtro que añade «Limpiar» no hace respirar el mapa.
  - Redimensionar la ventana reencuadra.

**M6 · RECOMENDADO · Intro con un solo vuelo y estado real** (MOV-03, ACCESO-01 intro, RESP-01#5)

- **Cómo:**
  - Eliminar el `easeTo` lineal de `:324-326`.
  - Un único `map.flyTo({...map.cameraForBounds(COLOMBIA,{padding}), duration:2800, curve:1.15, easing: cúbica in-out, essential:true}, {intro:true})`.
  - `terminar` es idempotente. Lo disparan `moveend` con `e.intro` y un `setTimeout(terminar, 3200)` de respaldo, obligatorio según el comentario de `:336`.
  - Prop `onIntro` → `introLista` en Tablero. Reemplaza el `delay: 4.2`.
  - «Ver narrativas» queda visible desde el inicio.
  - Opcional: crear el giro antes y dejar una deriva de 2°/s mientras baja la geometría. Con `sessionStorage('spn_intro')`, la intro dura 0.8 s en recargas.
- **Comprobación:**
  - Con la red limitada no hay quiebre de trayectoria ni globo congelado.
  - Las pistas aparecen al aterrizar, no a los 4.2 s fijos.
  - `curve: 1.15` no produce un alejamiento previo.

**M7 · RECOMENDADO · Datos que cambian con gracia: torres 3D y velo** (MAPA-12, REND-04#1–2, MOV-03#5)

- **Cómo:**
  - `dep-3d` y `mun-3d` nacen con `'fill-extrusion-vertical-scale':0` y `'…-transition':{duration:900,delay:250}`. En reposo siguen con `visibility:none`.
    - Al activar: `visible` y, en el siguiente rAF, escala 1.
    - Al desactivar o al salir a Mundo: escala 0 y `visibility:none` con un timeout cancelable de 1000 ms.
  - Hover en 3D: `'fill-extrusion-color':['case', estado('hover'), '#FFE58A', colorPorT]`.
  - Capas constantes `dep-velo` (justo encima de `dep-relleno`) y `mun-velo` (encima de `mun-relleno`, con el mismo filtro por departamento). Pintura `{'fill-color':'#081733','fill-opacity':0,'fill-opacity-transition':{duration:140}}`.
    - Al cambiar métrica o filtro: velo a 0.55; a los 150 ms, `setFeatureState`; después, velo a 0 con una transición de 320 ms.
    - El mismo velo sirve para el revelado inicial del coroplético.
  - **A validar:** cifras en la cima con `symbol-z-offset` (`['*',['get','h'],300000]`, o 50000 en departamento). Plan B: ocultar `cifras-texto` en 3D.
- **Comprobación:**
  - Las torres crecen mientras la cámara se inclina. Si no arrancan, usar dos rAF.
  - Con un departamento abierto, los vecinos atenuados siguen a 0.22. Por eso no se dejan las torres siempre visibles.
  - Cambiar de métrica funde en lugar de saltar.

**M8 · RECOMENDADO · Controles, fase B (móvil)** (MAPA-05 B, RESP-02 B, MOVIL-01 controles)

- **Cómo:** por debajo de `@2xl` del contenedor.
  - Fila 1: miga compacta y botón «Filtros · n» (`SlidersHorizontal`).
  - Fila 2: métrica como `Segmentado` a lo ancho (`grid grid-cols-3 h-10`).
  - Ámbito, Temas, Ejes (nombre completo, filas de 44 px) y Canales (etiqueta visible) pasan a una hoja inferior:
    - renderizada con `createPortal(…, document.body)`, obligatorio porque los ancestros con `backdrop-filter` o `transform` rompen `fixed`;
    - `fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-lg`;
    - `drag="y"`, `dragConstraints={{top:0}}`, cierre por `offset.y>120` o por velocidad;
    - con velo, `inert` en el fondo y registro en `useEscape`;
    - el «clic fuera» de `:190-197` debe considerar el ref de la hoja.
- **Comprobación:**
  - La zona tapada baja de unos 300 px a unos 120 px en 390 px.
  - A 1024 px quedan 2 filas.
  - El globo de G1 usa el margen medido.

**M9 · OPCIONAL**

- Resaltado ranking → mapa: prop `resaltado` y `setFeatureState({hover:true})` (PANEL-09#4).
- Buscador «Ir a…» como combobox en la miga (A11Y-03#6).
- Ficha anclada táctil (A11Y-03#5). M1 ya cubre lo esencial.

---

### Frente P — Panel lateral

**P1 · IMPRESCINDIBLE (defecto) · Filtrar por tema ya no colapsa la gráfica** (PANEL-01, A11Y-05#7)

- **Cómo:**
  - `temasPanel` en Tablero, calcado de `conteosEje`: `filtrar(datos,{temas:[],canales:filtros.canales,ejes:filtros.ejes})` con `enTerritorio`. Deps `[datos, filtros.canales, filtros.ejes, codigo]`.
  - `visibles`: el top 8 más los seleccionados que queden fuera del top.
  - Con selección: barra activa en `bg-gold-500` y el resto en `/25`. Fila activa con `shadow-[inset_2px_0_0_var(--gold-500)]`, icono `Check` y `aria-pressed`.
  - Rejilla `grid-cols-[9.5rem_1fr_3rem]`.
  - `detalle` con «Quitar N tema(s) ×».
  - «y N temas más» pasa a ser el botón «Ver los N», con altura auto.
  - `max` calculado sin el filtro de tema.
- **Comprobación:**
  - Clic en «Salud»: las 8 barras siguen ahí y «Salud» queda resaltada.
  - Un tema elegido desde el desplegable y fuera del top aparece al final.
  - «Vivienda y territorio» no se trunca.

**P2 · IMPRESCINDIBLE (defecto) · Estados en cero honestos** (PANEL-10, NARR-04 componente)

- **Cómo:**
  - `vacio = resumen.aportes===0 && resumen.necesidades===0 && resumen.alertasActivas===0`.
  - Sustituir solo Temas, Evolución y Atención por `EstadoVacio` (S5) con `SearchX`.
  - Titular según causa:
    - sin filtros: «Aún no hay participación registrada en {territorio}»;
    - con filtros: «Nada coincide en {territorio}» y la lista de `describirFiltros`.
  - Botones «Quitar filtros» y «Volver a Colombia».
  - El Ranking se mantiene, con el título «Dónde sí hay registros».
  - `Vacio` recibe un `texto` obligatorio.
  - `TarjetasKpi.tsx:88` lleva `bg-white/8` permanente. Con `totalCanales===0` la leyenda va a `opacity-50` y muestra «—».
- **Comprobación:** un clic en un departamento azul sin registros ya no dice «con los filtros actuales» cuando no hay filtros, y ofrece una salida.

**P3 · IMPRESCINDIBLE (defecto visible) · Cifras grandes sin «64 , 8 %»** (PANEL-06, MARCO-11, A11Y-05#6, REND-04#3, A11Y-07#3)

- **Cómo:**
  - En `globals.css`, `@layer components`: `.cifra-display{font-family:var(--font-body);font-variant-numeric:tabular-nums lining-nums;font-weight:700;letter-spacing:-.03em}`, sin `"zero"`.
  - `CifraAnimada`:
    - prop `variante?: 'mono'|'display'`;
    - `duration = reducirMovimiento() ? 0 : Math.min(1.1, Math.max(.35, .3+.25*Math.log10(delta+1)))`;
    - escribe `textContent` solo si cambia la cadena;
    - el span animado lleva `aria-hidden`, con un `<span className="sr-only">` que tiene el valor final (corrige el «0» del HTML del servidor);
    - `minWidth` en `ch`.
  - `variante="display"` en las 5 cifras de TarjetasKpi y en el guion de `:127`.
  - Opcional: fracción y sufijo a `0.55em`, con dos spans y `formatToParts`.
- **Comprobación:**
  - «64,8 %» se lee compacto.
  - Los dígitos no bailan durante el conteo.
  - VoiceOver lee «807» y no una secuencia.
  - Con movimiento reducido no hay conteo.

**P4 · RECOMENDADO · El panel dice que está filtrado y compara** (PANEL-02, FLUJO-01#4, SOBRA-01 KPI)

- **Cómo:**
  - `totalTerritorio` sin filtros.
  - KPI principal: etiqueta «Aportes que cumplen los filtros», «de 807 · 32 %» y una barra `h-1`.
  - Pastilla única en el héroe, «Vista filtrada · Eje 4 · Voz ×», alternando con el sello «Cifras conciliadas» de P11: una sola pastilla a la vez.
  - Subtítulo del héroe: posición relativa, «1.º entre 19 departamentos con aportes · 21,8 % de los ubicados», o «Sin aportes ubicados» si el valor es 0.
- **Comprobación:** con el Eje 4 activo, el KPI ya no muestra «260» a secas.

**P5 · RECOMENDADO · KPI accionables** (PANEL-04, MOV-06#4)

- **Cómo:**
  - `Tarjeta` recibe `onActivar` y `activa`. Un botón estirado `absolute inset-0 z-0` con `aria-pressed` y `aria-label="Ver {etiqueta} en el mapa"`. El contenido va en `relative z-10 pointer-events-none`.
  - Se aplica a aportes, necesidades y alertas.
  - Pastilla `layoutId="kpi-en-mapa"` «En el mapa», con `RESORTE.pastilla`.
  - Las tarjetas sin acción pierden `whileHover`, el halo y el `hover:border`.
- **Comprobación:** un clic en «Alertas activas» cambia la métrica del mapa y del selector a la vez.

**P6 · RECOMENDADO · Jerarquía y densidad** (PANEL-03, SOBRA-01 KPIs)

- **Cómo:**
  - Fila 1: Necesidades y Alertas. Fila 2: Municipios («61 de {totalMunicipios} · 5,4 %» con una mini barra) y Ubicación o Peso.
  - `p-3.5`, cifra a `text-[1.75rem]`, pie de una línea.
  - KPI principal con `p-4` y cifra a `2.25rem`, sin el pie de `:76-80`.
  - Héroe con `p-4`. El tamaño del título depende de la longitud del nombre (más de 40 → `text-lg`; más de 24 → `text-xl`; más de 14 → `text-2xl`; resto `text-3xl`), con `text-balance line-clamp-3`.
  - Alertas: una barra apilada de 4 px por etapa actual. No es un embudo.
- **Comprobación:**
  - Rejilla 2×2 ≤ 210 px y héroe ≤ 115 px a 1600×950.
  - Más barras de temas a la vista a 1366×768.

**P7 · RECOMENDADO · Estado de atención legible** (PANEL-08, A11Y-06#5)

- **Cómo:**
  - `catalogos.ts`: recibido #3D74C9, remitido #6FA3EA, respondido #CFE2FB. `sin_respuesta_registrada` con `patron` rayado e `inset 0 0 0 1px rgba(169,203,245,.45)`.
  - Cifra titular «19,6 % con respuesta registrada · 54 de 276» y «222 pendientes».
  - Barra `h-3.5` sin texto interno.
  - Leyenda en el mismo orden que la barra. El hover baja el resto a `opacity-35`.
  - Microcopy: «Según la última actuación registrada».
- **Comprobación:** contraste del segmento pendiente ≥ 3:1. Hoy es 1.47:1.

**P8 · RECOMENDADO · Evolución semanal** (PANEL-07)

- **Cómo:**
  - `resumir` devuelve `evolucion[{clave,etiqueta,aportes,parcial}]`.
  - Semanal si hay menos de 4 meses (lunes ISO con `Date.UTC`). Las semanas vacías se rellenan.
  - Eliminar `meses[].necesidades`.
  - Dos `<Area>` (`cerrado` y `enCurso`, esta punteada y con `isAnimationActive={false}`), más un `ReferenceDot` «en curso». Si hay menos de 2 periodos cerrados, una sola serie con `dot`.
  - El tooltip lee `payload[0].payload`.
  - Titular «Pico: semana del 8 sep · 212 aportes».
  - Gradiente de 0.18 a 0.
  - `isAnimationActive={!reducirMovimiento()}`.
- **Comprobación:** con datos del 20 de agosto al 11 de septiembre se ven 4–5 puntos, no 2.

**P9 · RECOMENDADO · Tendencia y deltas** (PANEL-05)

- **Cómo:**
  - `resumir(f, codigo, mesesEje, hoy?)` devuelve `serie` de 28 días y `delta7`.
  - Sparkline SVG con `motion.path pathLength`. El punto final es un `<span>` HTML con `animate-pulso`, porque `box-shadow` no existe en SVG.
  - Pill solo si `previo>=10`: subida en `bg-success-bg text-success`, bajada en neutro.
  - «19,6 % con respuesta» en Necesidades.
- **Comprobación:**
  - Nunca aparece «▼ 100 %» en rojo.
  - Con un corte de más de 7 días sin actividad, no hay pill.

**P10 · RECOMENDADO · Layout de `<main>` y señales de scroll** (PANEL-11, RESP-03)

- **Cómo:**
  - Tres hijos directos, en orden de DOM: mapa, aside, Narrativas. Eliminar el wrapper de `:185`.
    - Mapa: `lg:col-start-1 lg:row-start-1 min-w-0`.
    - Aside: `lg:col-start-2 lg:row-start-1 lg:row-span-2` y el sticky actual, con `aria-label="Panorama del territorio"`, `id="panel-territorial"` y `tabIndex={-1}`.
    - Narrativas: `lg:col-start-1 lg:row-start-2 min-w-0`.
  - En `md`: aside en 2 columnas.
  - Replicar en `loading.tsx`.
  - Mini-encabezado sin salto: un envoltorio `sticky top-0 z-10 h-0 -mb-3` con un `motion.div` absoluto, visible cuando `!useInView(heroRef,{root:asideRef,amount:.2})`.
  - Indicador de continuación por máscara: `lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]` cuando `!alFinal`, con `useScroll({container})`.
- **Comprobación:**
  - En 390 px el orden es mapa → panel → narrativas, y el orden de Tab coincide.
  - «Ver narrativas» sigue llegando a su sitio.
  - El sticky se comporta como hoy.

**P11 · RECOMENDADO · Pista, canal desde la leyenda, sello arriba y pie plegable** (PANEL-12, SOBRA-01 avisos, NARR-11#5)

- **Cómo:**
  - `Pista` (S5) en la leyenda de canales, los segmentos de atención y el sello. Eliminar los `title` restantes, con números formateados.
  - Los items de la leyenda de canales pasan a `<button aria-pressed>` con `pointer-events-auto relative z-10`, que alternan `filtros.canales`.
  - Sello «Cifras conciliadas» en el héroe.
  - Pie: disclosure «¿Cómo se cuenta?». Solo queda visible «Catálogo DIVIPOLA {versión}».
  - Conservar «Borrador · uso interno» de AlineacionPnd.
- **Comprobación:** ningún tooltip se recorta por `overflow-hidden`. No hay botones anidados.

**P12 · OPCIONAL · Titular ejecutivo** (INFO-01)

- **Cómo:**
  - `src/lib/datos/titulares.ts`, puro.
  - Reglas por prioridad, sin rotación. Categoría exacta `atencion.sin_respuesta_registrada`. La concentración se calcula con aportes distintos.
  - Un titular estático en el héroe reemplaza al subtítulo de P4. Los otros dos solo entran si el héroe sigue ≤ 150 px a 1366×768.

---

### Frente N — Narrativas

**N1 · IMPRESCINDIBLE (defecto) · Tabla sin desborde en portátiles** (NARR-02, RESP-04#2–4)

- **Cómo:**
  - Agrupadas: Relato (flexible, `line-clamp-3`), Dónde, Veces (`w-36`), Último.
  - Todas: Narrativa, Territorio, Canal+Estado apilados, Fecha.
  - Tema y Línea pasan a una fila de metadatos bajo el relato: `ChipTema`, pastilla «Eje 3» y la línea truncada.
  - `min-w-[40rem]` en agrupadas y `min-w-[44rem]` en todas.
  - Envoltorio `@container`. `<table className="hidden @[44rem]:table">` y `<ul className="@[44rem]:hidden">` con tarjetas.
  - Pista de scroll residual por máscara, solo si `scrollWidth>clientWidth`. Contenedor con `tabIndex={0} role="region"`.
  - Quitar `sticky top-0` de `cabecera` (`:626`).
  - `<caption className="sr-only">` y `scope="col"`.
- **Comprobación:**
  - Sin scroll horizontal a 1280, 1366, 1440 y 1512 px con el PND activo.
  - Tarjetas a 390 px y a 1024 px.

**N2 · IMPRESCINDIBLE (defecto) · Un solo filtro por eje y chips removibles** (NARR-03, FLUJO-01#2 y #5)

- **Cómo:**
  - En Tablero, memoizar `filtradosSinEje`. Se comparte con E4.
  - Pasar a Narrativas `onFiltros` y `onQuitarTerritorio`.
  - `alineacionContexto = alineacionPnd(narrativasDe(datos, filtradosSinEje, codigo), datos.pnd)` para el bloque PND y el distintivo.
  - La frase `ejePrincipal` se omite si hay ejes activos.
  - AlineacionPnd recibe `ejesActivos: string[]` y `sinRelacionActivo`. El clic alterna `filtros.ejes`, sin saltar de pestaña.
  - `ejePnd` se reduce a `soloSinRelacion`, con exclusión mutua.
  - Barra de chips removibles en lugar del párrafo de `:207-211`: territorio, temas, canales, ejes, búsqueda y «Limpiar todo». Con chips, pasa a `sticky top-[4.75rem] z-10 vidrio`.
  - `overflow-clip` en lugar de `overflow-hidden` en `:173`.
  - `filtros.ejes.join()` en `contexto` (`:70`).
- **Comprobación:**
  - Con un eje global, las seis barras del Plan siguen vivas, sin colapsar al 100 %.
  - Es imposible dejar la tabla vacía por dos filtros de eje cruzados.
  - El halo radial sigue recortado.

**N3 · IMPRESCINDIBLE (defecto) · Pestaña Plan en blanco y vacíos con salida** (NARR-04)

- **Cómo:**
  - `EstadoVacio` en el Panorama (`:263`), en el Plan (rama `alineacion.total===0`; el distintivo pasa a `null`, no «0%») y en la tabla (`:385`).
  - En la tabla: «Limpiar búsqueda» y «Pruebe con:» con 5 chips de `resumen.terminos`.
- **Comprobación:** un municipio sin narrativas deja la pestaña Plan con mensaje y botón, no vacía.

**N4 · RECOMENDADO · Búsqueda sin parpadeo, memo y paginador** (NARR-08, REND-05#1–4)

- **Cómo:**
  - `export const Narrativas = memo(...)`.
  - `claveAnimacion` sin `busqueda`.
  - `useDeferredValue(busqueda)`.
  - Índice memoizado `{fila, texto normalizado}`.
  - `<mark>` sobre las coincidencias y contador en el campo.
  - Atajo `/`.
  - Tamaño de página 10, con selector 10/25/50.
  - Paginador numerado con `aria-current`, `sticky bottom-3 vidrio` (requiere el `overflow-clip` de N2), y `scrollIntoView({block:'nearest'})` con `scroll-mt-24`.
  - Sin `layout` en los `<tr>`.
  - Opcional: `useDeferredValue(codigo)` en Tablero, con `opacity-60` mientras difiere.
- **Comprobación:**
  - Teclear no re-anima las filas que persisten.
  - Paginar no obliga a bajar, hacer clic y subir.

**N5 · RECOMENDADO · Filas que se abren** (NARR-01, NARR-10#1)

- **Cómo:**
  - `GrupoNarrativo` ampliado sin romper `municipios: string[]`: añade `filas`, `conteoMunicipios`, `departamentos`, `canales`, `primera` y `claves`.
  - `abierta` dentro de `contexto`.
  - Fila `motion.tr` con `tabIndex=0`, `aria-expanded` y chevron.
  - El detalle es un `<tr>` siempre montado, con `<td colSpan className="p-0 border-0">`. Dentro, un `AnimatePresence` con un `motion.div` de altura auto y `overflow-clip`.
  - Contenido en 3 columnas: relato con `<mark>` en las claves, «Dónde» (top 5) y «Cómo llegó».
  - CTA «Ver las 34 una por una» → `grupoFijado` y `setVista('todas')`.
  - Botón secundario «Ver en el mapa» (`onTerritorio`).
  - En móvil, acordeón en línea dentro de la tarjeta.
- **Comprobación:**
  - Abrir y cerrar anima sin saltos de bordes.
  - Esc cierra la fila sin salir del territorio (S2).

**N6 · RECOMENDADO · Frase de generalidad honesta** (NARR-05)

- Redacción por umbral: ≥50, 30–49 y <30.
- `distintivo` frente al país: requiere `razon≥1.3`, n≥20 y ≥5 del tema. Devuelve `null` con un filtro de un solo tema.
- Tres mini-datos en `grid-cols-3`.
- Tema y eje accionables.
- Corregir a «y el 48 %».

**N7 · RECOMENDADO · Bloque del PND** (NARR-06)

- Barra de composición al 100 %, monocroma dorada con alfa alterno. «Sin relación» va rayado.
- Filas en dos líneas, sin `truncate`, escaladas sobre `total`.
- Ejes en 0 agrupados.
- Líneas como `<button aria-pressed>` con `lineaPnd`.
- «Ver las N líneas».
- `<mark>` en el relato citado y «También por: …».
- «Ver eje en Ejes articuladores» (`onAbrirEje` → `ejeInicial`, E6).
- Filas deshabilitadas sin `opacity-45` (A11Y-06#7).

**N8 · RECOMENDADO · Relatos y términos accionables** (NARR-07)

- `Termino` gana `relatos` y `razon`. La selección es por `peso`.
- La presentación es coherente con la cifra mostrada: `veces` a nivel país; «×2,3» en territorio.
- Chips como `motion.button`, con `aria-label="Buscar narrativas que mencionan '…'"`.
- Relatos como botón: `abierta=g.clave` y pestaña narrativas.
- `VACIAS` ampliada con formas sin tilde (`anos`, no `años`).
- Etiqueta «34 veces · 8 %».

**N9 · RECOMENDADO · Pestañas: móvil, ARIA y ritmo** (NARR-09#1 y #3, RESP-04#1, MOV-04#1–2, NARR-11#1–2)

- **Cómo:**
  - Tablist con `overflow-x-auto snap-x`, etiqueta corta «Plan» e indicador `bottom-0`.
  - `id`/`aria-controls`, `role="tabpanel"`, roving y flechas.
  - Quitar el AnimatePresence interno de `:254-281`: un `motion.div` con `key` y `initial/animate`, sin `exit` ni `filter`.
  - Pestañas con `mode="wait"`, `exit={{opacity:0}}` en .12 s y entrada `{opacity:0,x:dir*16}` en .25 s.
  - La altura animada queda como opcional, tras validar si el salto se nota.
- **Comprobación:**
  - «Narrativas» no se corta a 390 px.
  - Un cambio de pestaña tarda 0.37 s o menos.
  - Al cambiar de territorio, el cuerpo no va 0.9 s por detrás del título.

**N10 · RECOMENDADO · Columnas que informan y nota** (NARR-10#2–4, INFO-02 embudo, NARR-11#5)

- «17 municipios · 4 departamentos» y, debajo, «Sobre todo en El Tarra (9)».
- Fecha «10 de sept», con el año solo si difiere. Fecha relativa contra `datos.actualizadoEn`, nunca contra `new Date()`.
- Cabeceras ordenables con `aria-sort`.
- Las pastillas pasan a un embudo en texto: «N aportes → 409 con narrativa → 61 relatos · 196 confirmadas».
- Conmutador «Solo confirmadas».
- Una línea de nota visible y «¿Cómo se calcula?».

---

### Frente A — Marco y acceso

**A1 · IMPRESCINDIBLE (defecto) · «Reintentar» que reintenta** (MARCO-02)

- **Cómo:** en `src/app/(tablero)/error.tsx`.
  - Firma `{error, retry, reset}` y `reintentar = retry ?? reset ?? (() => location.reload())`. Borrar `unstable_retry`.
  - `useTransition` con `LoaderCircle` y `aria-busy`.
  - Un solo autorreintento, con guarda de módulo (`let ultimoAuto = 0`, 60 s).
  - Textos neutrales.
  - Marca: escudo con `<Image preload>`, `.tricolor` y filete dorado.
  - El digest es copiable.
  - Acciones secundarias «Recargar la página» y, discreta, «Cerrar sesión».
  - `role="alert"`.
- **Comprobación:**
  - Forzar un `throw` en `obtenerTablero`: «Reintentar» dispara una petición RSC en Network.
  - No hay bucle de autorreintentos.

**A2 · IMPRESCINDIBLE (promesa falsa) · «Datos en vivo» pasa a una actualización real** (MARCO-03, SOBRA-01)

- **Cómo:**
  - `src/app/(tablero)/acciones.ts` con `actualizarTablero()`: valida `sesionValida(cookie)` primero y devuelve `{ok,datos}` o `{ok:false,motivo}`.
  - Tablero:
    - prop `datosIniciales`, `useState`, `useTransition` y `fallo`;
    - `motivo==='sesion'` → `router.replace('/acceso')`;
    - el `catch` recarga solo si el refresco fue manual.
  - Encabezado: un solo `<button>` que fusiona el chip y el corte. Estados:
    - recién actualizado, con ping durante 60 s;
    - normal: «Actualizado 07:02 p. m.»;
    - pendiente, con spin;
    - con fallo o más de 15 min: `bg-warning-bg`, «Hace 18 min · reintentar».
  - El texto relativo se calcula solo tras montar. En móvil, punto y hora corta.
  - El refresco automático (5 min, solo con la pestaña visible, constante `INTERVALO_REFRESCO_MS`) queda desactivado hasta confirmar con el cliente.
- **Comprobación:**
  - Con Supabase caído, el tablero no se reemplaza por `error.tsx` y conserva los filtros.
  - Con la cookie expirada, va a `/acceso`.
  - `CifraAnimada` anima hacia las cifras nuevas.

**A3 · RECOMENDADO · Encabezado** (MARCO-04, ACC-01#4)

- h1 en dos líneas por debajo de `xl`, sin `truncate`: `text-[11px] leading-[1.1] sm:text-[13px] xl:text-[1.05rem]`.
- Proceso visible desde `xl`.
- «Salir» con `aria-label` y confirmación en línea de 4 s.
- «Ejes» con `aria-haspopup="dialog"`.
- `priority` → `preload` en `Encabezado.tsx:41`, `loading.tsx:17` y `FormularioAcceso.tsx:29`.

**A4 · RECOMENDADO · Login** (MARCO-01, MARCO-07, MARCO-08, MOV-04#4, ACC-01#1 y #3, ACCESO-01 copy)

- **Cómo:**
  - **Pie** (pendiente de confirmación): `LockKeyhole` y «Acceso protegido · uso institucional». No tocar `DURACION_SESION_S`.
  - **Servidor:** `.trim()` al token y `return {ok:true}` en lugar de `redirect`.
  - **Cliente:**
    - input controlado, `errorDescartado`, `aria-describedby` condicional;
    - quitar `key={estado.intento}`; usar `useAnimate` para la sacudida y `inputRef.select()`;
    - éxito «Acceso concedido» 550 ms y `router.replace('/')`;
    - botón `disabled` sin token;
    - ojo con `aria-pressed`.
  - **Primera impresión:**
    - kicker «Plan Nacional de Desarrollo 2026–2030 · Escucha ciudadana»;
    - tarjeta con `delay .2` y `duration .6`;
    - halo como hermano previo, dentro de un envoltorio `relative`;
    - h1 con `text-[clamp(1.75rem,0.6rem+5vw,5rem)]`;
    - `contacto` por prop desde `page.tsx`, con `CONTACTO_SOPORTE` sin `NEXT_PUBLIC_`.
- **Comprobación:**
  - Un token con espacio final entra.
  - Tras un error, el foco y la selección quedan en el input, y el mensaje desaparece al teclear.
  - «Ingresar» es visible sin scroll a 390×844.

**A5 · RECOMENDADO · Esqueleto fiel** (MARCO-06 c–e, PANEL-03#6, MOV-03#6)

- `MarcaEncabezado` compartido, sin motion, también en `loading.tsx`.
- La columna derecha replica el layout final tras P6 y P10: héroe 115, KPI 160, rejilla 2×2 de 4×100, y 2 secciones.
- Un `.panel` de 320 bajo el mapa por debajo de `lg`.
- Aside con entrada `x:8` en .4 s.
- Hacerlo después de P6 y P10 para calcar las alturas definitivas.

**A6 · OPCIONAL**

- `not-found.tsx`.
- `global-error.tsx`, que debe redeclarar las fuentes o extraerlas a `src/app/fuentes.ts`.
- `robots` noindex y `viewport.themeColor` (MARCO-12 a–c).

**A7 · OPCIONAL (decisión de seguridad)**

- Aviso de sesión vencida (ACC-01#2): requiere alargar el `maxAge` de la cookie.
- `?volver=` en `src/proxy.ts`, con guarda de redirección abierta. Solo si el usuario lo aprueba.

---

### Frente R — Rendimiento y composición

**R1 · RECOMENDADO · Cortes seguros de blur** (REND-03#1, #4 y #5, MARCO-05#1, A11Y-07#8)

- Overlay del modal `bg-[rgba(3,8,20,.9)]`, sin `backdrop-blur-md`. La aurora animada obliga a re-difuminar la pantalla completa en cada frame.
- `.fondo-vivo::before/::after` sin `filter: blur(90px)`:
  - gradientes suavizados, `will-change: transform` y escala de 1 → 1.06 → 0.98;
  - mover `.fondo-vivo` a un nuevo `src/app/(tablero)/layout.tsx`, porque en `/acceso` anima sin verse.
- `.shimmer` por `transform`, con un `::after` que hace `translateX`.
- `filter: blur()` animado solo en textos de una línea. Se elimina en `Narrativas.tsx:257-259` y en `ModalEjes.tsx:212-214`. Se conserva en `Tablero.tsx:325` y `ControlesMapa.tsx:74`, siempre que no sea un contenedor.
- **Comprobación:** en DevTools → Rendering → Paint flashing, el esqueleto no repinta toda el área y el fondo no repinta.

**R2 · RECOMENDADO · Medición obligatoria del giro y corte condicional** (MAPA-02 validación, MARCO-05#2, REND-03 final)

- **Cómo:**
  - Grabar 10 s en Performance, con CPU 4x e idealmente en el equipo del cliente, con el globo girando.
  - Solo si hay frames por encima de 16 ms atribuibles a composición:
    - poner `data-ambito={ambito}` en la `<section>` del mapa;
    - regla `[data-ambito='internacional'] .vidrio, [data-ambito='internacional'] .mapboxgl-ctrl-group { backdrop-filter:none; -webkit-backdrop-filter:none; background: rgba(8,23,51,.88); }`.
  - Si no hay costo medible, no tocar nada: el vidrio es parte del show visual.
- **Comprobación:** comparar las grabaciones de antes y después.

**R3 · RECOMENDADO · Vidrio legible** (A11Y-06#3, REND-03#7)

- `--glass-bg: rgba(10,26,58,.72)`.
- `.vidrio{backdrop-filter: blur(12px) brightness(.7)}`, sin `saturate`.
- Lo mismo en `.mapboxgl-ctrl-group`.
- **Comprobación:** sobre un departamento dorado, secondary ≥ 6:1 y muted ≥ 5.5:1. La translucidez sigue siendo visible.

**R4 · RECOMENDADO · Caché y versión de geometrías** (REND-01#5–6)

- `scripts/preparar-geo.mjs` escribe `src/lib/geo/version.json` con un hash. No usar `catalogoVersion`.
- `next.config.ts`: `headers()` con `Cache-Control: public, max-age=31536000, immutable` para `/data/geo/:path*`.
- `preconnect('https://api.mapbox.com')` en `src/app/(tablero)/page.tsx`.
- **Comprobación:** con `next build && next start`. En dev Next pisa el header.

**R5 · OPCIONAL**

- `BarraProgreso` por transform (REND-04#4).
- Utilidad `presionable` con `scale` individual, nunca en pestañas con `layoutId` ni en filas (MOV-06#2–3).
- Tween en JS del coroplético, solo si M7 no basta y cada frame queda por debajo de 4–8 ms.

---

### Frente X — Accesibilidad transversal (lo no cubierto arriba)

**X1 · RECOMENDADO · Semántica** (A11Y-05)

- `Segmentado` con `radiogroup`.
- Canales con `aria-label="Canal {etiqueta}"`.
- Región viva en Tablero: `<p className="sr-only" aria-live="polite" aria-atomic>` con territorio, cifras y `describirFiltros`, con un debounce de 400 ms.
- `role="status"` en los cargadores.
- Texto `sr-only` donde la información vive solo en `title`.

**X2 · RECOMENDADO · Contraste y mínimos tipográficos** (A11Y-06#2, #6 y #7)

- Nada por debajo de 12 px, salvo `.etiqueta` a 11 px y peso 700.
- Los 6 `text-[10px]` suben a 11 px. Las notas pasan a `text-xs`.
- `RAMPA_MAPA[0]` #7A6220, reinterpolando `[1]` y `[2]`. Validar en 2D, 3D y la leyenda.

**X3 · RECOMENDADO · Enlaces de salto** (MARCO-10#4, A11Y-04#3)

- Al inicio de Tablero, «Saltar a las narrativas» (`#narrativas`) y, opcional, a `#panel-territorial`.

**X4 · RECOMENDADO · Convenciones escritas**

- En `AGENTS.md`, fuera del bloque `BEGIN/END nextjs-agent-rules`, y en `public/linea-grafica-patria/LINEA-GRAFICA.md`:
  - anillo de foco;
  - pila de Escape;
  - radiogroup frente a tabs;
  - mínimos táctiles;
  - tabla de duraciones y easings;
  - regla «`mode="wait"` solo con salida ≤150 ms, solo opacidad, nunca anidado ni con claves derivadas de filtros».
- Validar con el cliente si aplica la Resolución MinTIC 1519 (WCAG 2.1 AA).

---

### Frente F — Flujo y producto

**F0 · RECOMENDADO (dependencia) · Subir `pestana` a Tablero** como prop controlada de Narrativas. La necesitan E11, N8, F2 y F4. `busqueda` se queda local.

**F1 · RECOMENDADO · Un vocabulario** (INFO-02, EJES-08)

- `GLOSARIO` en `catalogos.ts`.
- «municipios con aportes» en `Tablero.tsx:339`.
- `con más ${METRICAS[metrica].plural}` en `:377`.
- `Sin ${plural}` en la leyenda y en los vacíos.
- «Líneas del Plan con más narrativas» en `AlineacionPnd.tsx:137`.
- Popover «Cómo leer este tablero» con el glosario y las reglas R1 y R2, compartido con P11 y N10.

**F2 · OPCIONAL (alto valor para compartir vistas) · Estado en la URL** (URL-01, NARR-09#2)

- **Cómo:**
  - `src/lib/datos/estadoUrl.ts` con parse y serialize. Parámetros: `a,d,s,m,t,e,c,v,p,modo,q`. El eje va por número.
  - `page.tsx`: `await searchParams` → `estadoInicial`.
  - `useEffect` con `replaceState`. `q` con un debounce de 400 ms, por el límite de Safari.
  - `pushState` y `popstate` solo tras validar en Network que Atrás no re-pide el RSC ni muestra `loading.tsx`.
  - Deep link a un departamento: `fitBounds` directo en 0.8 s.
  - Botón «Copiar enlace de esta vista» en el héroe.
- Depende de N2 y F0.

**F3 · OPCIONAL · Modo presentación** (DEMO-01)

- Avance manual: Siguiente, espacio y flechas. Esc integrado en S2.
- 6 pasos, con una leyenda tipo subtítulo que usa los `titulares()` de P12.
- Sin temporizadores. Como mucho, esperar a `map.once('idle')`.
- Se descarta el onboarding de burbujas.
- Depende de F0, E6 (`ejeInicial`), M6 (`onIntro`) y P12.

---

## 3. Dependencias y orden por oleadas

**Dependencias duras**

- S1 va antes de todo lo que toque animación: G2, E2, E3, G4 y P3.
- S2 va antes de E8, N5, N4 (Esc en el buscador), M8, P11 y N10.
- G1 va antes de G2 (factor por zoom y `fijarZoom`) y de G5 (stops).
- M5 alimenta G1 en móvil y G5.
- G2 va antes de G3.
- G3 (IControl) va antes de M4 (hueco de «Vista 3D»).
- E1 va antes de E2 (`paso`, `alFrente`).
- E2 (`--radio`) va antes de E7, E9, E10 y E12.
- E4 va antes de E5 y E6.
- E6 (`ejeInicial`) va antes de N7, P12 y F3.
- N2 (`filtradosSinEje`, `onFiltros`) se comparte con E4. Quien llegue primero lo crea en Tablero. N2 va antes de N6, N7, N3 (acciones) y F2.
- N5 (tipo `GrupoNarrativo`) va antes de N10#1 y N8.
- P3 va antes de P7, E5 y N6, porque usan `variante="display"`.
- S5 `EstadoVacio`: P2 y N3, el que llegue primero.
- `Pista`: P11 y M4.
- `Segmentado`: M4, y luego N9 o N10 y M8.
- M3 y M4 comparten `@container` en la `<section>`.
- M1 pone la píldora contextual donde esté la píldora en ese momento. M3 la mueve después al slot.
- M2, M6, G4 y REND-01 tocan el mismo efecto de montaje de MapaColombia. Se hacen en ese orden, con commits separados, dentro de la misma oleada.
- A5 (esqueleto) va después de P6 y P10.
- E8 (fragmento + `inert`) va con E0 (velo del `dynamic`), para que el fondo no quede inerte sin velo.

**Oleadas** (cada una deja la app funcionando y se puede desplegar)

- **Oleada 0 — Cimientos y defectos de una tarde:** S1, S2, A1, E0, y de M1 solo el arreglo de una línea del ranking en Mundo. Verificación: `pnpm lint && pnpm build` y una pasada de Esc.
- **Oleada 1 — Quejas 1 y 2, literales:**
  - Globo: G1 → G2 → G3 → G4.
  - Modal: E1 → E2 → E3 → E8.
  - Cierre: R2 (primera medición) y, de R1, solo el overlay del modal sin blur.
- **Oleada 2 — Queja 3:** `filtradosSinEje` en Tablero → E4 → P3 (CifraAnimada display) → E7 → E6 → E5 → E9.
- **Oleada 3 — Defectos claros del tablero:** M1 completo, M2 (con REND-01), P1, P2 (nace `EstadoVacio`), N1, N2, N3, A2 y S3.
- **Oleada 4 — «Dejarla más top»:** G5, G6, M6, M3, M4 (nacen `Segmentado` y `Pista`), M5, M7, P4, P5, P6, P7, N4, N5, R1 restante, R3, S4, A3 y A4.
- **Oleada 5 — Profundidad:** P8, P9, P10, P11, N6, N7, N8, N9, N10, E10, E11 (con F0), F1, X1–X4, M8, A5 y R4.
- **Oleada 6 — Opcionales:** E12, F2, P12, F3, A6, A7, M9 y R5.

---

## 4. Riesgos de regresión y cómo evitarlos

**Mapbox**

- `jumpTo` y `setCenter` hacen `_stop()`. Cualquier `easeTo`, `flyTo` o `fitBounds` lanzado con el giro activo muere.
  - Mitigación: el giro calla con `agarrado || map.isMoving()`. Un solo `jumpTo` por frame. El zoom de reencuadre va dentro del integrador.
- El padding se retiene en el transform: `easeTo` hereda el de la última `fitBounds`.
  - Mitigación: pasar siempre el `padding` explícito, en Mundo y en nacional.
  - Comprobar que al volver el encuadre nacional es idéntico.
- Las propiedades data-driven, con feature-state, no transicionan.
  - Mitigación: fundidos con capas constantes (`dep-velo`, `mun-velo`) o con expresiones `['zoom']` temporales. Nunca `*-transition` sobre `dep-relleno`.
  - Restaurar siempre las expresiones en `moveend`, con `off` en el cleanup del efecto. El usuario puede revertir el ámbito a mitad de vuelo.
- Torres 3D siempre visibles con escala 0: su tapa a 0.92 de opacidad anula `atenuado` y `activo`, y gana el hit-testing.
  - Mitigación: en reposo, `visibility:none`.
- `fill-extrusion-vertical-scale` es experimental y `symbol-z-offset` no está validado en el rango de zoom 4.5–5.5, donde el globo pasa a mercator. Ambos tienen plan B.
- El estilo es propio de Studio. `name_es` y los ids `country-label`, `continent-label` y `water-point-label` hay que verificarlos con `map.getLayer`. No usar `setFilter` sobre capas del estilo.
- `mapaListo()` exige que existan `dep-relleno` y `pais-relleno`. Al diferir países, las capas `pais-*` deben crearse vacías en `load`.
  - Con `setData(url)`, los feature-state fijados antes persisten por id.
  - Entrar a un departamento antes de que termine la descarga se cubre con `sourcedata` e `isSourceLoaded`.
- El umbral de transición globo → mercator depende del tamaño. Por eso `zoomGlobo` se acota a 2.6.
- `map.on('error')` no es fatal después de `load`.
- `new mapboxgl.Map` lanza una excepción sin WebGL. Hoy eso tumba todo el tablero a través de `error.tsx`.
- React puede volver a montar efectos (modo estricto). El guard `mapaRef.current` actual debe conservarse al envolver en `MapaInterno key={intento}`.
- `cooperativeGestures` emite `wheel` sin hacer zoom. Por eso `wheel` sale de la lista de pausa.
- El comentario de `MapaColombia.tsx:336` documenta que `moveend` puede no llegar. Todo encadenado a `moveend` lleva un timeout de respaldo idempotente.

**AnimatePresence y motion**

- El equipo ya sufrió salidas que no terminaban con `mode="wait"`.
  - Regla: `wait` solo con salida ≤150 ms, solo opacidad, nunca anidado y nunca con claves derivadas de filtros o territorio.
  - El detalle del modal usa la rejilla `[grid-area:1/1]`, con `pointer-events-none` en el saliente.
- Un `<tr>` dentro de AnimatePresence, o con `layout`, no anima de forma fiable: con `border-collapse` los transforms no mueven los bordes, y Safari es irregular.
  - Mitigación: el detalle de fila es un `<tr>` siempre montado con un `motion.div` interno de altura auto. No usar `layout` en filas.
- `MotionConfig` con `transition` por defecto cambia resortes implícitos (`whileHover`, píldoras con `layoutId`) y no lo heredan los `{delay}`.
  - Mitigación: solo `reducedMotion="user"`.
  - Recordar que no cubre `animate()` imperativo, `width`, `height`, `filter` ni `scrollIntoView`.
- El modal usa `inert` y `dynamic()`. Entre el clic y la llegada del chunk, el fondo quedaría inerte sin velo.
  - Mitigación: precarga más `loading` con velo.
  - El foco se devuelve en el cleanup: para entonces la salida ya terminó y `inert` ya se retiró.
- Bloqueo de scroll: va en `<body>`, no en `<html>`, con `scrollbar-gutter: stable`. Validar en Chrome de Windows que el velo `fixed` cubra el canal.
- Un remontaje con `key` re-anima todo. Quitar `busqueda` de `claveAnimacion`. En el login, quitar `key={estado.intento}` y reponer el foco a mano.
- Hidratación: nada de `new Date()`, `localStorage`, `sessionStorage` ni `matchMedia` durante el render de componentes que pasan por SSR (Encabezado, Tablero, Narrativas).
  - El texto relativo y las pistas se calculan en `useEffect`.
  - El «ahora» de las fechas es `datos.actualizadoEn`.

**Transform de motion frente a los transforms 3D de la órbita**

- Si `style.transform` es un string (hoy en `ModalEjes.tsx:345`), Motion no construye su transform y cualquier MotionValue de transform se ignora.
  - Mitigación: quitar `transform` del `style` y usar `transformTemplate`. Motion lo invoca siempre y recibe `""` cuando los valores son los de por defecto.
- El orden de construcción de Motion es fijo: translate → scale → rotate → rotateX → rotateY.
  - En el anillo, `rotateX:-12` y `rotateY: rotacion` dan `rotateX(...) rotateY(...)`: inclina el carrusel y gira sobre su eje inclinado. Es lo deseado.
  - No añadir `rotate`/`rotateZ` ni `x`/`y` al anillo sin revisar ese orden.
- Un valor capturado por cierre dentro de `transformTemplate` no se actualiza solo. La apertura se anima como variable CSS (`--apertura`) en el anillo.
- La prop `layout` sobre un contenedor con `perspective` o `preserve-3d` deforma la escena.
  - Mitigación: usar `transition-[min-height]` en CSS y `scale` como MotionValue. Nunca `layout` en la órbita.
- `backdrop-filter`, `filter` y `opacity` en ancestros de `preserve-3d` aplanan el contexto (Chrome) o son inestables (Safari).
  - Mitigación: quitar `backdrop-blur-sm` y `filter: brightness()` de las tarjetas. El oscurecimiento se hace con un velo interno de `opacity`.
- `whileHover` con escala debe quedarse en el `motion.button` interno, no en el envoltorio que posiciona.
- Con billboard e inclinación, las traseras asoman. Validar que su hit-testing no robe clics.
- Durante la apertura, desactivar `pointer-events` hasta `apertura>.9`.
- Tras un pan, el `pointerup` dispara `onClick` en la tarjeta que esté debajo. Hace falta la guarda `arrastro`.
- `onWheel` de React es pasivo. Hay que usar un listener nativo con `{passive:false}`, solo en la columna de la órbita y nunca sobre el detalle.
- `reducedMotion="user"` no detiene `useAnimationFrame` ni `animate(rotacion)`. Con `useReducedMotion()`: sin giro, e `irA` con `{duration:0}`.

**CSS y Tailwind v4**

- Una regla sin capa gana a `@layer base` y a las utilidades. La regla global de foco va en `@layer base` con `:where()`. La del canvas de Mapbox va sin capa, reemplazando la actual.
- `@container` (`container-type:inline-size`) añade contención de layout. El elemento pasa a ser bloque contenedor de los descendientes `fixed`.
  - Mitigación: la hoja inferior y `Pista` van siempre por portal a `body`.
  - No poner `@container` en el elemento que tiene `perspective`.
- `overflow-x:auto` convierte `overflow-y` en `auto`.
  - Cualquier `sticky top-0` interno queda inerte.
  - El indicador `-bottom-px` del tablist se recorta: usar `bottom-0`.
- `overflow-hidden` en la sección de Narrativas anula los `sticky` internos. Cambiar a `overflow-clip` y validar que el halo siga recortado.
- No editar `src/app/styles/tokens.css` ni `tailwind-theme.css`, que son copias del kit. Las sobrescrituras van en `globals.css :root`, con la misma especificidad y después en la cascada.
- `transition-colors` de Tailwind pisa el `transition-property` de la capa base. Por eso «presionable» es una `@utility` con `scale` como propiedad individual.

**Next 16 y servidor**

- `AGENTS.md` obliga a leer `node_modules/next/dist/docs/` antes de tocar `page.tsx`, `proxy.ts`, `error.tsx` o `headers()`.
  - `searchParams` es una Promise.
  - `priority` está obsoleto; usar `preload`.
  - `error.tsx` recibe `retry`.
- Las server actions son endpoints públicos: `actualizarTablero` valida la sesión antes de leer. Con la cookie vencida, el proxy responde 307 al POST y la llamada puede rechazarse. El `catch` lo cubre.
- `router.refresh()` automático queda prohibido: un fallo de Supabase reemplaza el tablero por `error.tsx` en plena reunión.
- `pushState` no está validado frente al router: puede re-pedir el RSC y mostrar `loading.tsx`. Empezar con `replaceState`.
- Los headers de caché no se ven en `next dev`.
- `?volver=` solo se acepta si empieza por `/` y no por `//`.

---

## 5. Decisiones pendientes de confirmar con el usuario

1. **Pie del login.** Cuatro analistas dicen que el usuario pidió retirar «vence a las 12 horas», pero no está entre sus cuatro quejas ni en el plan previo. Propuesta: «Acceso protegido · uso institucional», sin tocar la caducidad real.
2. **Refresco automático de datos cada 5 min.** Queda implementable pero desactivado por defecto.
3. **Aviso de sesión vencida y `?volver=`.** Implica alargar el `maxAge` de la cookie. Es una decisión de seguridad.
4. **Normativa de accesibilidad.** Confirmar si aplica la Resolución MinTIC 1519 (WCAG 2.1 AA). De ser así, el frente X y E8 pasan a imprescindibles.
5. **Estilo de Mapbox Studio.** Verificar que expone `name_es`. Si no, plan B con `language:'es'`.
6. **Prueba en dispositivos reales.** Hace falta antes de cerrar E2, E9 y M8: trackpad y Magic Mouse en macOS, ratón de muescas en Windows y Firefox, iOS Safari y Android.

### Critical Files for Implementation

- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/mapa/MapaColombia.tsx
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/mapa/paises.ts
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/ejes/ModalEjes.tsx
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/tablero/Tablero.tsx
- /Users/andres/Documents/LinkTic/Patria_Milagro/dev-front-patria-milagros/src/components/tablero/Narrativas.tsx
