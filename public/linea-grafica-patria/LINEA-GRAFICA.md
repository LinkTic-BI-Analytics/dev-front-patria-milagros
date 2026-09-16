# Línea gráfica unificada — Ecosistema "Patria Milagro"

Análisis comparativo y sistema de tokens para el **nuevo portal web** y el **dashboard informativo**.
Modo principal: **dark**. Light como modo secundario completo.

**Fuentes analizadas** (capturas en `capturas/`, datos crudos en `extraccion/`):

| # | Sitio | Estado |
|---|-------|--------|
| 1 | bancodetalentos.com.co | ✅ Analizado completo |
| 2 | presidencia.gov.co — especial "Primer mes de la Patria Milagro" | ✅ Analizado completo (incluye sus variables CSS oficiales) |
| 3 | defensoresdelapatria.com (home, descargas, colombia-patria-milagro) | ❌ Descartado — Cloudflare bloquea el acceso |

---

## 1. Comparativo

| Dimensión | Banco de Talentos | Presidencia (especial) |
|---|---|---|
| Tipografía titulares | Montserrat 700, MAYÚSCULAS, tracking −3.5%, 70px | Nunito Sans 900, tracking −2%, 77px |
| Tipografía cuerpo | Inter 400, 16/24 | Nunito Sans 400, 16/24.8 |
| Fondo claro | Crema `#F6F5F0` | Blanco / gris niebla `#F3F4F6` |
| Fondo oscuro | Navy profundo `#06142A` | Navy `#001D54` y `#0A1A3A` |
| Azul principal | `#0A2C46` (texto), `#004B9B`, `#004B78` | `#003189` (oficial), `#001D54` |
| Amarillo/dorado | Dorado premium `#D4AA45` + `#F5D878`, `#FFD72A` | Amarillo institucional `#FFC800` |
| Rojo acento | `#D41136` | `#D80025` (oficial) |
| Botón primario | Dorado, texto navy, radio 6px, Inter 900 12px uppercase, glow dorado | Amarillo `#FFC800`, texto navy, radio 2px, Nunito 700 |
| Radios | 6px / 16px / pill | 2px dominante, círculos 50% |
| Sombras | Glows de color (dorado .35, azul .5) + sombra profunda | Sin sombras; glass `rgba(255,255,255,.25)` y bordes blancos translúcidos |
| Layout | Secciones alternadas crema/navy | `max-width: 1240px`, `pad: clamp(1.25rem, 4vw, 3rem)` |
| Motion | — | `cubic-bezier(.4,0,.2,1)` |
| Identidad | Premium/editorial: dorado sobre navy, labels uppercase con tracking | Institucional: tricolor bandera, jerarquía sobria |

**Coincidencias clave**: ambos usan navy profundo + amarillo/dorado como CTA con texto navy encima, rojo como acento puntual (nunca protagonista), titulares gigantes con tracking negativo, y secciones oscuras donde el dorado es el color de énfasis. La base para un sistema dark-first ya existe en los dos.

**Divergencias resueltas**: tipografía (3 familias distintas), dos amarillos, dos rojos, radios 2px vs 6–16px, glow vs flat.

---

## 2. Decisiones de unificación

1. **Tipografía** — `Montserrat` (display, pesos 700–900, uppercase solo en display y labels) + `Inter` (cuerpo y UI; mejor rendimiento en dashboards por sus numerales tabulares) + `JetBrains Mono` opcional para cifras KPI. Nunito Sans queda como fallback institucional.
2. **Amarillo** — se conservan **ambos** con roles distintos: `#FFC800` (gold-500) es el CTA y color de énfasis en dark; `#D4AA45` (gold-600) es el dorado premium para hovers, bordes, detalles y series de datos en light. En fondos claros el dorado de texto es `#86691A` (gold-800) para cumplir AA.
3. **Rojo** — oficial `#D80025` (red-500) en light; variante `#FF4D6A` (red-400) en dark porque el oficial no alcanza contraste sobre navy.
4. **Azul** — rampa única de 12 pasos que integra los azules de ambos sitios. El dark mode se construye **aclarando el propio navy de marca** (950 → 900 → 850…) en vez de usar grises: la elevación se percibe como "más azul", no como "más gris".
5. **Radios** — escala unificada: `2px` (herencia institucional: tags/chips), `6px` botones e inputs, `10px` popovers, `16px` cards y paneles de dashboard, `pill` para badges.
6. **Sombras** — en dark se adopta el lenguaje de Banco de Talentos (glow dorado en CTA, glow azul en activos) + sombras negras profundas; en light, sombras suaves azuladas. El patrón *glass* de Presidencia (`rgba(255,255,255,.25)` + borde blanco translúcido) se reserva para overlays sobre fotografía.
7. **Layout y motion** — se adoptan los de Presidencia: contenedor 1240px, padding fluido, easing estándar.
8. **Texto en dark** — nunca blanco puro: `#EDF1F7` primario, jerarquía por opacidad (0.72 / 0.55), patrón ya presente en ambos sitios.

---

## 3. Contraste verificado (WCAG)

| Combinación | Ratio | Uso |
|---|---|---|
| `#EDF1F7` sobre `#06142A` | ~15:1 AAA | Texto principal dark |
| `#FFC800` sobre `#06142A` | ~9.5:1 AAA | Acento/énfasis dark |
| `#001D54` sobre `#FFC800` | ~8.9:1 AAA | Texto de botón primario |
| `#81ADEB` sobre `#0A1A3A` | ~6.3:1 AA | Links dark |
| `#FF4D6A` sobre `#0A1A3A` | ~5.4:1 AA | Peligro dark |
| `#0A2C46` sobre `#F6F5F0` | ~10.9:1 AAA | Texto principal light |
| `#86691A` sobre `#F6F5F0` | ~4.9:1 AA | Acento dorado light |

Regla: el amarillo **nunca** lleva texto blanco encima; siempre navy `#001D54`.

---

## 4. Guía de componentes (para el portal y el dashboard)

### Botones
- **Primario**: fondo `--action-primary-bg` (gold-500), texto navy, radio `--radius-sm`, padding `14px 28px`, Inter 700–800; en dark añade `--glow-gold`. Hover: gold-400 (dark) / gold-600 (light) + `translateY(-1px)`.
- **Secundario**: transparente, borde 1.5px `--action-secondary-border`, texto dorado (dark) / azul (light).
- **Ghost**: solo texto, hover `--action-ghost-hover`.
- Variante display (herencia Banco de Talentos): uppercase 12px, tracking `0.08em`, peso 800.

### Navegación
- Barra sobre `--bg-base` con `backdrop-filter: blur(12px)` y borde inferior `--border-subtle`. Item activo: subrayado 2px gold-500 (patrón Presidencia). CTA de la nav = botón primario tamaño sm.

### Hero (portal)
- Fondo `--bg-hero` o fotografía con overlay `linear-gradient(rgba(6,20,42,.55), rgba(6,20,42,.85))`.
- H1: `--font-display`, `--text-display`, peso 800–900, `--leading-tight`, `--tracking-display`.
- Kicker superior: tricolor bandera (3 guiones: gold-500 / blue-700 / red-500) + label uppercase — firma visual heredada de Presidencia.

### Cards (portal)
- `--bg-surface-1`, radio `--radius-lg`, borde `--border-subtle`, `--shadow-card`; hover: `--bg-surface-2` + borde `--border-default`. Icono o pictograma en gold-500 sobre círculo `rgba(255,200,0,.12)`.

### Dashboard — KPI / stat card
- Superficie `--bg-surface-1`, radio 16px, padding 20–24px.
- Cifra: `--font-mono` o Inter `font-variant-numeric: tabular-nums`, 28–44px, peso 700, `--text-primary`.
- Label: 12px uppercase tracking `0.08em`, `--text-muted`.
- Delta: pill con `--status-success(-bg)` o `--status-danger(-bg)`.
- KPI destacado: borde izquierdo 3px gold-500 o glow dorado suave.

### Dashboard — gráficas
- Series en orden fijo `--chart-1…6` (dorado primero: la serie protagonista siempre es dorada).
- Grid `--chart-grid` (sin líneas verticales), ejes `--chart-axis-text` 12px.
- Tooltip: `--bg-surface-3`, radio 10px, borde `--border-default`, `--shadow-card`.
- Área bajo la curva: gradiente del color de la serie a transparente (12% → 0%).

### Dashboard — tabla
- Header sticky sobre `--bg-surface-1`, 12px uppercase `--text-muted`; filas con borde `--border-subtle`, hover `--bg-surface-2`; cifras alineadas a la derecha con numerales tabulares.

### Formularios
- Input: `--bg-surface-2` (dark) / blanco (light), borde `--border-default`, radio `--radius-sm`, focus: borde gold-500 + ring `rgba(255,200,0,.25)` 3px.

### Badges / tags
- Pill `--radius-full` con pares estado+fondo (`--status-*` / `--status-*-bg`). Tags institucionales: radio `--radius-xs` (2px).

### Footer
- `--blue-950` en ambos modos (el footer no cambia con el tema), texto blanco 0.75, enlaces hover gold-500, borde superior `--border-subtle`.

---

## 5. Archivos

| Archivo | Contenido |
|---|---|
| `tokens/tokens.css` | Variables CSS: primitivos + semánticos dark (default) y light (`[data-theme="light"]`) |
| `tokens/tokens.json` | Formato W3C Design Tokens (importable a Figma/Tokens Studio/Style Dictionary) |
| `tokens/tailwind-theme.css` | Tema Tailwind v4 (`@theme`) conectado a las variables semánticas |
| `capturas/` | Screenshots de referencia de los sitios analizados |
| `extraccion/` | JSON crudo de estilos computados por sitio |

### Uso con Tailwind
`tailwind-theme.css` mapea los semánticos a utilidades: `bg-base`, `bg-surface-1`, `text-primary`, `text-accent`, `border-subtle`, `bg-action-primary`, etc. El cambio de tema es solo `data-theme="light"` en `<html>`; ningún componente necesita clases `dark:`.

Google Fonts: `Montserrat:wght@700;800;900` + `Inter:wght@400;600;700;800`.
