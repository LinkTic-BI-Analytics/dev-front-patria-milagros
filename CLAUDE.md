@AGENTS.md

# Notas para Claude Code

Lo de arriba (AGENTS.md) es la guía técnica completa. Esto es lo específico de trabajar aquí como agente.

## Reglas que no se negocian

- **`top_secret/*.pdf` es confidencial y solo local.** No se hace commit ni push, no se adjunta ni se
  envía a ningún servicio externo. Se puede leer en local como insumo. El catálogo derivado
  (`src/lib/pnd/catalogo.json`) sí se versiona y se despliega.
- **Ningún `.env*` al repositorio** (solo `.env.example`). `SUPABASE_SECRET_KEY` jamás en código de
  cliente ni con prefijo `NEXT_PUBLIC_`.
- **Commits y push a `main` solo cuando el usuario lo indique.** Antes de cada commit: `git status`
  sin PDF ni `.env*`.
- **Nunca escribir el token de acceso en una página.** Para probar con sesión se forja la cookie
  `spn_sesion` en local con `SESSION_SECRET` (mismo formato que `src/lib/auth/sesion.ts`).
- Antes de tocar algo específico de Next (proxy, server actions, `error.tsx`, caché, imágenes), leer
  la guía correspondiente en `node_modules/next/dist/docs/`: esta versión cambió APIs.

## Forma de trabajo

- Español de Colombia en interfaz, código y comentarios. Los comentarios explican el **porqué**
  (sobre todo el bug que evitan), no el qué.
- Cambios al mapa (`MapaColombia.tsx`, `paises.ts`) y al modal 3D (`ModalEjes.tsx`, `useOrbita.ts`):
  releer antes AGENTS.md §10. Cada trampa listada ya produjo una regresión visible para el cliente.
- Verificación mínima de cualquier cambio: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` y el
  recorrido de AGENTS.md §11 en navegador (Chrome headless por CDP o la extensión de Claude en Chrome).
  El cliente valida visualmente: una captura del resultado vale más que una descripción.
- Uso eficiente del contexto: trabajar en solitario salvo que el usuario pida agentes; capturas
  pocas y con propósito; parches puntuales en vez de reescrituras.
- El plan de UX vive en `docs/hoja-de-ruta-ux.md` (oleadas 0–4 hechas; 5–6 pendientes). Si se
  implementa un punto, actualizar su estado allí y en AGENTS.md §13.
