# La base de datos

Qué tabla guarda qué, en qué orden se crean y cuál manda. Sirve para entrar al modelo sin
leer las 1.197 líneas del esquema declarativo, y para saber a cuál archivo ir cuando haga
falta el detalle.

**La fuente son los archivos, no este documento.** El esquema declarativo de
[`producto/supabase/schemas/`](producto/supabase/schemas/) es la verdad
([AGENTS.md §9](AGENTS.md)); esto es un mapa. Si los dos dicen cosas distintas, manda el
archivo y este documento está desactualizado.

Lo que hay hoy: **20 tablas** — 18 en `participacion` y 2 en `identidad` — con 10 funciones
y 48 índices. Ninguna en `public`.

---

## El orden en que se crean

No es alfabético ni caprichoso: una tabla no puede referenciar otra que todavía no existe.
Este es el orden que funciona.

| # | Archivo | Tablas que crea |
|---|---|---|
| 1 | [`01_pertenencia.sql`](producto/supabase/schemas/01_pertenencia.sql) | `proceso` |
| 2 | [`02_territorio.sql`](producto/supabase/schemas/02_territorio.sql) | `territorio` |
| 3 | [`02b_grabacion.sql`](producto/supabase/schemas/02b_grabacion.sql) | `grabacion`, `transcripcion` |
| 4 | [`14_convocatoria.sql`](producto/supabase/schemas/14_convocatoria.sql) | `convocatoria`, `encuentro` |
| 5 | [`16_enlace.sql`](producto/supabase/schemas/16_enlace.sql) | `enlace` |
| 6 | [`03_aporte.sql`](producto/supabase/schemas/03_aporte.sql) | `aporte`, `sintesis`, `ubicacion` |
| 7 | [`04_expediente.sql`](producto/supabase/schemas/04_expediente.sql) | `expediente`, `vinculo_aporte_expediente`, `expediente_territorio` |
| 8 | [`05_auditoria.sql`](producto/supabase/schemas/05_auditoria.sql) | `auditoria` |
| 9 | [`06_identidad.sql`](producto/supabase/schemas/06_identidad.sql) | `contacto`, `comprobante` |
| 10 | [`07_conteo.sql`](producto/supabase/schemas/07_conteo.sql) | `corte` |
| 11 | [`08_comprobante.sql`](producto/supabase/schemas/08_comprobante.sql) | *(solo funciones)* |
| 12 | [`10_estados.sql`](producto/supabase/schemas/10_estados.sql) | *(tres columnas más en `aporte`)* |
| 13 | [`11_gestion.sql`](producto/supabase/schemas/11_gestion.sql) | `actuacion` |
| 14 | [`12_alerta.sql`](producto/supabase/schemas/12_alerta.sql) | `alerta` |
| 15 | [`13_prioridad.sql`](producto/supabase/schemas/13_prioridad.sql) | `prioridad_examen` |
| 16 | [`99_acceso.sql`](producto/supabase/schemas/99_acceso.sql) | *(permisos y seguridad de fila)* |

### El nombre del archivo no es el orden

Mira los puestos 4 y 5: los archivos `14` y `16` van **antes** que el `03`. No es un capricho
de este documento — es que `aporte` referencia `enlace` (archivo 16) y `encuentro` (archivo
14), así que esos dos tienen que existir primero.

**Y [`esquema.sh`](scripts/esquema.sh) no lo sabe:** concatena `schemas/*.sql` en orden de
nombre de archivo, con un comentario que dice *«es lo mismo que el diff produciría contra una
base vacía»*. No lo es: un `db diff` de verdad ordena por dependencias. La migración generada
falla al aplicarse sobre una base vacía, con este mensaje:

```
ERROR: relation "participacion.enlace" does not exist (SQLSTATE 42P01)
At statement: 12
```

Se descubrió el 2026-09-16 aplicando el esquema a un Supabase remoto. No se había notado
porque la base local se fue construyendo por partes y nadie la había reconstruido desde cero.
**Se arregla renombrando** `14_convocatoria.sql` a `02c_` y `16_enlace.sql` a `02d_`, y
volviendo a correr `esquema.sh`. Es la única arista mal puesta: todo lo demás ya está en
orden.

### Y por eso el último se llama 99

Lo dice el propio [`99_acceso.sql`](producto/supabase/schemas/99_acceso.sql): la primera vez
se llamó `09`, y las tablas creadas después —`actuacion`— quedaron sin permisos, porque
`grant on all tables` solo alcanza a las que existen cuando corre. El síntoma fue
«permission denied», que no se parece en nada a «el archivo está en el orden equivocado».

---

## Las dos que mandan

Son dos y conviene no confundirlas, porque mandan sobre cosas distintas.

### `proceso` — la que no se puede agregar después

Su columna `proceso_id` está en **las 20 tablas**. [AGENTS.md §9](AGENTS.md) explica por qué
eso no es negociable: no es una restricción sobre una tabla, es *«una columna en todas y una
condición en cada consulta que alguien escriba desde ese momento»*. Arrancar sin ella es lo
que obliga a reescribir.

Lo que sí se puede agregar después es la **política** sobre ella —quién ve qué—, porque eso
es una regla de acceso sobre una columna que ya existe. Hoy está abierta a propósito (`Q9`,
`Q18`).

Guarda el nombre del proceso, la entidad responsable y **qué se promete**: `consulta`,
`deliberacion_con_respuesta` o `decision_presupuestal_autorizada`. Nunca «vinculante» a
secas: el propio requerimiento advierte contra usar esa palabra como promesa genérica
(`Q17`).

### `aporte` — para lo que existe todo lo demás

Es lo que una persona cuenta. Si hubiera que salvar una sola tabla, es esa: las demás son
maneras de organizar, contar y responder lo que está ahí.

Su columna `relato_original` es obligatoria y **nunca se sustituye por la síntesis** (`N03`).
Lo que la persona dijo se queda como lo dijo.

Dos invariantes viven dentro de la tabla, hechas **imposibles** por la estructura y no
comprobadas por código — que es la diferencia que [AGENTS.md §8](AGENTS.md) marca entre una
invariante y una cualidad:

| | Qué prohíbe | Cómo se hace imposible |
|---|---|---|
| `I1` | que un reintento técnico duplique un aporte | restricción única sobre `(proceso_id, clave_envio)`. **No** por similitud ni por IP: eso la propia `I1` lo prohíbe |
| `I2` | inferir lo que falta | la ubicación tiene tres estados y el esquema no admite un cuarto implícito. Un `NULL` que se lee como «desconocido» ya es una inferencia |

---

## Qué guarda cada tabla

### El cimiento

| Tabla | Qué guarda |
|---|---|
| `proceso` | El contenedor. Nombre, entidad responsable y nivel de compromiso |
| `territorio` | DIVIPOLA del DANE: 9.715 filas (33 departamentos, 1.122 municipios, 8.560 centros poblados) |

**La versión del catálogo va en la clave primaria**, junto al código. DIVIPOLA cambia —en
1997 los centros poblados pasaron de 2 dígitos a 3—, así que un código histórico significa
cosas distintas según la versión con que se escribió. Sin eso, `R2` no se puede cumplir: un
corte exportado en marzo tiene que seguir siendo reproducible en octubre.

**No llega al barrio.** El nivel más fino es el centro poblado, que es rural: Barranquilla
tiene uno, y el casco urbano de Medellín es uno. El barrio se aplaza (`V21`), y lo que hace
reversible ese aplazamiento es que el aporte guarde **el lugar tal como la persona lo dijo**
(`GEO-01`). Sin ese texto, el día que llegue un catálogo urbano solo sirve para lo nuevo.

### La voz

| Tabla | Qué guarda |
|---|---|
| `grabacion` | Dónde está el audio: la ruta, el tipo, los bytes y los segundos. **No el archivo** |
| `transcripcion` | El texto, en versiones, con quién la hizo y cuándo |

**El audio es el original**, no la transcripción ([ADR 0013](decisiones/0013-el-audio-es-el-original.md)).
Una transcripción ya es la lectura de una máquina y no es fiel: en la primera prueba «la
vereda La Martinita» volvió como «La Martinica». Si se guardara solo el texto, el original
que `N03` manda conservar sería el error de la máquina.

Por eso `grabacion` se crea **antes** que `aporte`, y el aporte apunta a ella. Al revés, la
regla «un aporte por voz tiene grabación» necesitaría un disparador diferido, y con PostgREST
cada llamada es su propia transacción: el aporte se confirmaba solo y la regla saltaba
siempre.

El autor de la transcripción lleva nombre —`modelo:google/gemini-3.8-flash` o `ciudadano`—
porque «lo transcribió una IA» no sirve para explicar por qué cambió algo.

### La agenda

| Tabla | Qué guarda |
|---|---|
| `convocatoria` | Propósito, alcance, **efecto de participar**, ventana de fechas y estado |
| `encuentro` | Título, modalidad, hora con zona horaria, lugar o sala, ayudas, cupos y estado |
| `enlace` | Los QR: código corto, pieza de difusión y UTMs configuradas |

El **efecto de participar** no es decorativo: sin decir qué pasa con lo que se aporta, la
convocatoria promete por omisión.

`encuentro` guarda la hora **siempre con zona horaria**, porque un encuentro a las 9 no dice
nada sin decir dónde son las 9. Cancelar no borra la ficha, y reprogramar conserva la fecha
anterior en `comenzaba_en`: sin ella, quien ya se había organizado no puede saber qué cambió.

`enlace` tiene `id` de texto y no `uuid` porque **va impreso en un afiche** y se teclea a mano
cuando la cámara no lee. Existe para que tres cosas nunca se confundan: de dónde vino el
enlace, en qué evento dice participar la persona, y dónde ocurre el problema. El caso que lo
explica: alguien recibe reenviado el QR del evento A mientras está en el evento B, y cuenta un
problema de una vereda del municipio C. **Es un solo aporte con tres contextos distintos**, y
ninguno de ellos es asistencia.

### Lo que la gente entrega

| Tabla | Qué guarda |
|---|---|
| `aporte` | 24 columnas: el relato, el canal, el lugar declarado, el tema, el colectivo y tres estados |
| `sintesis` | El resumen, versionado, con su clase de corrección |
| `ubicacion` | Dónde ocurre, con nivel, código y versión de catálogo |

Los **tres estados del aporte van separados** —clasificación, confirmación del relato y
revisión institucional— y no en un campo `estado` con todos los valores. `CAL-01` lo pide así
y exige que *«cada indicador declare qué estados incluye»*: con un campo no se puede declarar
nada. El de ubicación vive aparte porque un aporte puede tener varias.

Ojo con `estado_confirmacion`: significa que la persona confirmó **su síntesis**, no que los
hechos estén verificados. Son cosas distintas y el propio requerimiento lo dice.

`desde_cuando` es **texto y nunca una fecha**. «Hace tres meses» no es una fecha, y
convertirlo en una sería exactamente la inferencia que `I2` prohíbe: nadie sabe si son noventa
días o el invierno pasado.

El tema tiene **dos columnas y no una**: `tema_propuesto` es lo que leyó la máquina y `tema`
lo que confirmó la persona. Juntarlas haría imposible saber cuánto se equivoca la lectura, que
es lo único que dirá si la lista de 18 temas sirve. Esa lista y la de
`producto/src/captura/lectura.ts` son la misma, y hay un chequeo que lo comprueba.

`ubicacion` **no son columnas del aporte**: es una entidad. Por eso agregar el nivel `barrio`
más adelante es una fila más y no una migración sobre datos que ya existen. Solo lleva código
territorial cuando el estado es `confirmada`; si no, no hay código, y no se rellena con el
municipio «más probable».

### El trabajo institucional

| Tabla | Qué guarda |
|---|---|
| `expediente` | La necesidad situada: descripción, cambio esperado, recurrencia, responsable |
| `vinculo_aporte_expediente` | Qué aporte alimenta qué expediente, con autor y motivo |
| `expediente_territorio` | Los territorios que abarca, cada uno con su estado de atención |
| `actuacion` | **Un hecho por fila**: recepción, remisión, decisión, respuesta, siguiente paso |
| `prioridad_examen` | Qué examinar primero y por qué |
| `alerta` | La ruta urgente, con sus tres momentos separados |

El vínculo aporte–expediente es **muchos a muchos**, no una columna `expediente_id` en el
aporte: quien menciona contaminación del agua y falta de transporte escolar produce dos
necesidades desde un mismo relato. El motivo es obligatorio, porque `I4` pide conservar el
porqué. Desagrupar **marca** la fila, no la borra — y deja el expediente reabierto, lo que
vuelve no vigente su prioridad: `NEC-01` pide reabrir *«sin heredar aprobación»*.

`actuacion` existe porque recepción, respuesta, solución, financiación y ejecución son **cinco
eventos distintos** (`RES-01`). Con un campo `estado` no se puede decir que algo fue recibido
y remitido **pero no respondido**, que es justo el estado en que va a estar casi todo. Por eso
el estado de atención **se deriva** de estas filas y no se guarda: un campo almacenado se
desincroniza de sus hechos, y entonces el tablero afirma algo que la historia contradice.

**`prioridad_examen` se define por lo que no tiene:** ni puntaje, ni pesos, ni ranking, ni
nada de selección presupuestal. `PRI-01` es explícito —*«los pesos o cuotas no acordados no se
rellenan automáticamente»*—, y un número plausible es indistinguible de uno real: nadie lo
cuestiona después. Aquí eso significaría decidir a quién se atiende primero con una cuenta que
nadie autorizó. La incertidumbre se registra **como tal**: una afectación desconocida no es
una afectación baja, y confundirlas entierra el caso.

`alerta` es una **entidad propia, no un estado del aporte**: se abre desde un aporte sin
esperar a que exista expediente, porque un formulario a medio llenar ya puede tener alerta.
Sus tres momentos van separados —orientación mostrada, contacto intentado, recepción
confirmada— porque **mostrar un teléfono no es haber contactado, y contactar no es que alguien
haya recibido**. Con un solo campo, el tablero diría que una emergencia está atendida cuando
lo único que pasó es que alguien vio un número.

Y **no existe función para desactivar una alerta**. `V13` dice que la valoración de una IA
*«no puede impedir que una persona active la alerta ni desactivarla por sí sola»*. Lo más
parecido es devolverla al flujo ordinario, que exige autor y motivo: una persona respondiendo.

### La memoria

| Tabla | Qué guarda |
|---|---|
| `auditoria` | Fecha, actor, acción, entidad, motivo, y el antes y el después en `jsonb` |
| `corte` | Una foto de los indicadores, con la versión de catálogo y los IDs exactos del universo |

Las dos están **bloqueadas contra reescritura** con reglas de Postgres que convierten `update`
y `delete` en nada. No es una costumbre del equipo: una auditoría que se puede editar no es
una auditoría, y `R2` exige por escrito que un corte nuevo no reescriba el anterior.

`corte` guarda `universo`: el arreglo de los IDs sobre los que se contó. Es lo que permite que
otro analista reproduzca el total (`TRA-01`), y lo que hace comprobable que el mapa, la lista
y la exportación hablan del mismo conjunto. Si cada uno hiciera su propia cuenta, `I6` se
rompe sola.

### Lo apartado — el esquema `identidad`

| Tabla | Qué guarda |
|---|---|
| `contacto` | Correo, teléfono o WhatsApp, **siempre opcional**, y si la persona aceptó avisos |
| `comprobante` | El **hash** del código con que la persona vuelve a ver lo suyo |

**No es una vista: es una partición física**, y está en otro esquema para que el permiso se dé
o se niegue de una sola vez (`SEG-01`, `I6`, `C2`). Es lo que hace cumplible que
Comunicaciones no pueda descargar contactos, y lo que permitiría resolver `Q7`: borrar de
verdad lo que identifica sin tocar el registro analítico.

El contacto es opcional siempre: `N02` y `DAT-01` prohíben exigirlo para recibir un aporte.

Del comprobante **se guarda el hash, nunca el código**. El código lo ve la persona una vez; si
se guardara en claro, quien lea la tabla podría consultar el aporte de cualquiera. Y el código
tampoco entra a la base por parámetro, porque quedaría en el registro de sentencias de
Postgres —que es donde nadie lo busca y todo el mundo lo puede leer—.

**`identidad` no se expone por la API**, a propósito. Se llega a ella solo por dos funciones:
`emitir_comprobante` y `canjear_comprobante`. La segunda devuelve **un aporte o nada, nunca
una lista**: `N16` dice que la consulta por comprobante no expone expedientes ajenos.

---

## Lo que no hay, y es deliberado

Vale la pena saberlo antes de buscarlo:

- **Ninguna política de acceso a nivel de fila.** El interruptor está **encendido en las 20
  tablas** y sin una sola política, que en Postgres significa que nadie ve nada. Es el estado
  correcto mientras `P4` (no hay mecanismo de identidad escrito en ningún documento) y `Q18`
  (si la visibilidad es aislamiento entre procesos o jerarquía por territorio) sigan abiertas:
  las dos se implementan distinto y no se convierte una en la otra después. Arrancar al revés
  —permitir y luego restringir— es cómo se filtran los datos: basta olvidar una tabla.
- **Ni un permiso para `anon` ni para `authenticated`.** Las llaves que llegan al navegador no
  reciben nada, y está escrito como `revoke` explícito para que se lea como decisión y no como
  olvido. Hoy el servidor trabaja con la llave `secret`, cuyo rol salta esa capa.
- **Ninguna tabla de colectivo.** `V19` dice que el aporte colectivo es del colectivo, pero
  «colectivo» todavía no existe como entidad en ningún documento (`Q23`). Por eso se guarda
  `colectivo_declarado`: lo que la persona dijo, no una referencia a algo que no está modelado.
  Y es **declarado** de verdad — nadie verificó que quien escribe represente a ese grupo.
- **Ningún plazo.** `estado_de_atencion` nunca devuelve «vencido»: el plazo no existe (`Q20`),
  y no se inventa incumplimiento de un plazo que nadie definió.
- **Ningún borrado físico.** El modelo es append-only con lápidas: `retirado_en` y
  `retirado_motivo`, y la restricción de que van juntos o no van.

---

## Cómo comprobarlo contra una base

Desde `producto/`, con `DB_URL` puesto en `.env.local`:

```bash
# las tablas que hay, por esquema
psql "$DB_URL" -c "select table_schema, count(*) from information_schema.tables
                   where table_schema in ('participacion','identidad') group by 1"

# el catálogo territorial, por nivel
psql "$DB_URL" -c "select nivel, count(*) from participacion.territorio group by 1"
```

Con Supabase local, [`producto/LEEME.md`](producto/LEEME.md) tiene el arranque completo. Y
`./scripts/validar.sh` desde esta carpeta corre los tipos, el build, las pruebas y una
veintena de chequeos más.

---

## Dónde vive cada regla

Este documento describe el **nivel 2** de los cuatro de [AGENTS.md §8](AGENTS.md): lo que es
una cuenta o una restricción sobre datos, y tiene que valer aunque el llamado venga por otra
puerta. La pregunta que decide el nivel, y que evita discutirlo cada vez:

> ¿Qué pasa si alguien llama esto por otra puerta? Si la respuesta es «se rompe», el nivel
> está muy arriba y baja.

Por eso `I1` es una restricción única y no un `if` en el servidor: **una invariante
implementada solo en el nivel 3 es una invariante que un `curl` rompe.**
