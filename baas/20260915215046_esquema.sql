-- GENERADO por scripts/esquema.sh desde supabase/schemas/.
-- No se edita a mano: se edita el esquema y se vuelve a correr.

-- ═══ 01_pertenencia.sql ═══
-- La unidad de pertenencia, y va primero porque es lo único que no se puede
-- agregar después (`metodo/frentes.md`).
--
-- No es una restricción sobre una tabla: es una columna en TODAS y una condición
-- en cada consulta que alguien escriba a partir de ahora. Por eso existe antes
-- que cualquier dato.
--
-- **Lo que sí se puede agregar después es la política sobre ella** (`Q9`/`Q18`).
-- Si los procesos resultan ser compartimentos estancos, o si la Nación ve lo de
-- todos y cada territorio solo lo suyo, eso se escribe como acceso a nivel de
-- fila sobre esta columna. Hoy hay un solo proceso sembrado y la política queda
-- abierta a propósito.

create schema if not exists participacion;

-- El contenedor. `definicion_producto_participacion_v1.md` §9 lo pone primero
-- entre las entidades centrales, y dice que «el proceso define fases y reglas».
--
-- Que el expediente le pertenezca al proceso y no a la convocatoria sale de una
-- frase del mismo documento: «el cierre de una convocatoria limita acciones de
-- esa fase, pero no elimina la consulta de comprobantes y decisiones», y «una
-- misma necesidad puede continuar en otro ciclo».
create table participacion.proceso (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,

  -- Los tres niveles de la investigación §11.2, y no hay un cuarto. El propio
  -- documento advierte: «sin usar vinculante como promesa genérica» (`Q17`).
  compromiso      text not null
                  check (compromiso in ('consulta',
                                        'deliberacion_con_respuesta',
                                        'decision_presupuestal_autorizada')),

  -- Quién responde. Sin esto no se publica una promesa de respuesta (`N01`),
  -- y sin esto tampoco hay responsable de alertas por turno (`V13`).
  entidad         text,

  creado_en       timestamptz not null default now(),

  -- Borrado lógico en todas las tablas (`V11`, `V18`). La fila se queda y se
  -- marca; nunca `delete`.
  retirado_en     timestamptz,
  retirado_motivo text,
  constraint retiro_con_motivo
    check ((retirado_en is null) = (retirado_motivo is null))
);

comment on table participacion.proceso is
  'La unidad de pertenencia. Su columna va en todas las tablas; la política de acceso sobre ella está abierta (Q9/Q18).';
comment on column participacion.proceso.compromiso is
  'Qué se promete: consulta, deliberacion_con_respuesta o decision_presupuestal_autorizada. Nunca "vinculante" a secas.';

-- ═══ 02_territorio.sql ═══
-- El catálogo territorial: DIVIPOLA del DANE (`V10`).
--
-- **La versión va en cada fila, no en una tabla aparte** (`Q5`). DIVIPOLA
-- cambia: en 1997 los centros poblados pasaron de 2 dígitos a 3, y las notas al
-- pie de junio de 2026 mencionan un deslinde en curso entre Norte de Santander y
-- Boyacá. Un código histórico significa cosas distintas según la versión con que
-- se escribió, y `R2` exige que un corte exportado siga siendo reproducible.

create table participacion.territorio (
  -- El código compone: departamento 2, municipio 2+3, centro poblado 5+3.
  codigo        text not null,
  version       text not null,   -- 'junio 2026'

  nivel         text not null check (nivel in ('departamento','municipio','centro_poblado')),
  nombre        text not null,
  -- Solo en municipio: Municipio · Isla · Área no municipalizada.
  -- Solo en centro poblado: CM (cabecera) · CP.
  tipo          text,
  padre         text,            -- el código de arriba, dentro de la misma versión

  -- Del municipio o del centro poblado, NUNCA de una necesidad. `GEO-01`:
  -- «no presentar el centro de un municipio como coordenada exacta».
  latitud       numeric,
  longitud      numeric,

  primary key (codigo, version),
  foreign key (padre, version) references participacion.territorio (codigo, version),

  constraint codigo_compone_con_su_padre
    check (padre is null or codigo like padre || '%'),
  constraint largo_del_codigo check (
    (nivel = 'departamento'   and length(codigo) = 2) or
    (nivel = 'municipio'      and length(codigo) = 5) or
    (nivel = 'centro_poblado' and length(codigo) = 8)
  )
);

create index on participacion.territorio (version, nivel);
create index on participacion.territorio (padre, version);

comment on table participacion.territorio is
  'DIVIPOLA del DANE, del geoportal y no de una republicación. No llega al barrio: el nivel sub-municipal es rural (V21).';
comment on column participacion.territorio.version is
  'Va en la clave primaria a propósito: el mismo código puede significar otra cosa en otra versión (Q5).';

-- ═══ 02b_grabacion.sql ═══
-- La voz de quien no escribe (ADR 0013).
--
-- **El audio es el original.** Una transcripción ya es la lectura de una
-- máquina, y no es fiel: en la primera prueba, «la vereda La Martinita» volvió
-- como «La Martinica». Si se guardara solo el texto, el original que `N03`
-- manda conservar sería el error de la máquina.
--
-- Va **antes** del aporte, y no es un capricho de orden: la grabación existe
-- primero porque es el original, y el aporte apunta a ella. Al revés —que la
-- grabación apuntara al aporte— la regla «un aporte por voz tiene grabación»
-- necesitaba un disparador diferido, y con PostgREST cada llamada es su propia
-- transacción: el aporte se confirmaba solo y la regla saltaba siempre.
-- Así es una comprobación normal que no se puede evitar.

create table participacion.grabacion (
  id           uuid primary key default gen_random_uuid(),
  proceso_id   uuid not null references participacion.proceso (id),

  -- Dónde está el archivo. No el archivo: la base no es un depósito de medios,
  -- y un `bytea` de un millón de minutos es una base que no se puede respaldar.
  ruta         text not null unique,
  tipo_mime    text not null,
  bytes        integer not null check (bytes > 0),
  segundos     numeric check (segundos is null or segundos > 0),

  recibida_en  timestamptz not null default now()
);

-- Las transcripciones de una grabación, en versiones.
--
-- **Una transcripción es una versión, no un hecho.** Lleva quién la hizo —el
-- modelo, con nombre— y cuándo. Eso es lo que permite volver a transcribir más
-- tarde con un proveedor mejor sin perder lo anterior, y saber qué cambió.
create table participacion.transcripcion (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),
  grabacion_id  uuid not null references participacion.grabacion (id),
  version       integer not null check (version > 0),

  texto         text not null check (length(btrim(texto)) > 0),
  -- `modelo:google/gemini-3.8-flash` o `ciudadano`. Con el nombre del modelo,
  -- porque «lo transcribió una IA» no sirve para explicar por qué cambió algo.
  autor         text not null,
  motivo        text,
  creada_en     timestamptz not null default now(),

  unique (grabacion_id, version)
);

create index on participacion.transcripcion (grabacion_id, version desc);

-- ═══ 03_aporte.sql ═══
-- El aporte: lo que una persona o un grupo expresa (`V12`, nivel 1 de 3).
--
-- Dos invariantes viven aquí y se hacen imposibles en este nivel, no en el
-- servidor (`AGENTS.md` §8):
--
--   I1  un reintento técnico no duplica  → restricción única sobre la clave de
--       envío. **No por similitud ni por IP**, que la propia I1 prohíbe.
--   I2  no inferir lo que falta          → la ubicación tiene tres estados y el
--       esquema no admite un cuarto implícito. Un NULL que se lee como
--       «desconocido» ya es una inferencia.

create table participacion.aporte (
  id                uuid primary key default gen_random_uuid(),
  proceso_id        uuid not null references participacion.proceso (id),

  -- I1. La genera el cliente antes de enviar; el reintento trae la misma.
  clave_envio       text not null,

  -- Obligatorio y nunca se sustituye por la síntesis (`N03`).
  relato_original   text not null,

  canal             text not null check (canal in ('web','asistida','voz_transcrita')),
  recibido_en       timestamptz not null default now(),
  convocatoria      text,

  -- **El lugar tal como la persona lo dijo. Se guarda SIEMPRE** (`GEO-01`), y es
  -- lo que hace reversible aplazar el barrio (`V21`, `Q26`): sin este texto, el
  -- día que llegue un catálogo urbano solo sirve para lo nuevo.
  lugar_declarado   text,

  -- Colectivo: el aporte es del colectivo, no del vocero (`V19`). El colectivo
  -- todavía no existe como entidad (`Q23`), así que se guarda **lo que la
  -- persona dijo**, no una referencia a algo que no está modelado.
  --
  -- `colectivo_declarado` es exactamente eso: declarado. **Nadie verificó que
  -- quien escribe represente a ese grupo**, y la especificación es explícita —
  -- *«vocero exige verificar representación y destinatario autorizado»*—. Un
  -- campo que dijera «vocero» a secas se leería como verificado, y aquí no hay
  -- con qué verificar hasta que `Q23` se cierre.
  -- Lo que la persona precisó después de contar, en las vueltas de afinado
  -- (ADR 0012). Las dos son opcionales: vacío significa **no lo dijo**, y eso
  -- es una respuesta, no un hueco por llenar.
  --
  -- `desde_cuando` es TEXTO y nunca una fecha. «Hace tres meses» no es una
  -- fecha, y convertirlo en una sería exactamente la inferencia que `I2`
  -- prohíbe: nadie sabe si son noventa días o el invierno pasado.
  afectados         text,
  desde_cuando      text,

  -- La grabación, cuando la persona habló. **Es el original** (ADR 0013), y por
  -- eso el aporte apunta a ella y no al revés.
  --
  -- La comprobación es la regla entera: un aporte por voz **sin** grabación
  -- sería un aporte cuyo original se perdió, y uno escrito **con** grabación
  -- sería un archivo que nadie sabe de dónde salió.
  grabacion_id        uuid unique references participacion.grabacion (id),
  constraint la_voz_exige_grabacion
    check ((canal = 'voz_transcrita') = (grabacion_id is not null)),

  -- El contexto del enlace (`QR-03`), en columnas separadas a propósito.
  --
  -- `enlace_id` dice **de dónde vino**; `evento_confirmado_id`, **en qué evento
  -- dice la persona que participa**; y `lugar_declarado`, más arriba, **dónde
  -- ocurre el problema**. Los tres pueden ser distintos y juntarlos en uno solo
  -- es lo que haría creer que quien escaneó el afiche de A asistió a A.
  --
  -- El evento de origen no se guarda: sale del enlace. «El vínculo registrado
  -- del enlace determina su evento de origen», y duplicarlo abriría la puerta a
  -- que los dos dijeran cosas distintas.
  enlace_id           text references participacion.enlace (id),
  evento_confirmado_id uuid references participacion.encuentro (id),

  -- **Abrir un enlace no confirma contexto.** Nace sin resolver, y solo la
  -- persona lo mueve.
  estado_contexto     text not null default 'sin_resolver'
                      check (estado_contexto in ('confirmado','cambiado','sin_evento','sin_resolver')),
  constraint contexto_con_evento check (
    (estado_contexto in ('confirmado','cambiado')) = (evento_confirmado_id is not null)
  ),

  -- Lo que llegó en la dirección, tal cual y ya validado. Se guarda aparte de
  -- las UTMs configuradas del enlace porque **no son lo mismo**: estas pueden
  -- venir alteradas, y una alterada no cambia el evento registrado.
  utms_recibidas      jsonb,

  -- El tema (`CLA-01`). Es el eje que faltaba: sin él no se puede agrupar lo
  -- que se repite, ni saber a qué entidad compete, ni ver que veinte personas
  -- de un municipio están contando lo mismo.
  --
  -- **La lista es provisional** y así se dice en pantalla: la especificación
  -- dejó las taxonomías sin cerrar (`T018`, `Q32`).
  --
  -- Dos columnas y no una: `tema_propuesto` es lo que leyó la máquina y `tema`
  -- lo que confirmó la persona. Juntarlas haría imposible saber cuánto se
  -- equivoca la lectura, que es lo único que dirá si la lista sirve.
  tema                text,
  tema_propuesto      text,
  -- **Esta lista y la de `src/captura/lectura.ts` son la misma, y hay un
  -- chequeo que lo comprueba.** Se ampliaron los temas en el código y aquí no:
  -- el `update` con «empleo» lo rechazaba la base, el error no se miraba, y el
  -- aporte quedaba sin tema mientras la pantalla decía «la lectura propuso
  -- Empleo e ingresos». Nadie se enteraba porque `tema_propuesto` no tiene esta
  -- restricción y sí se guardaba.
  constraint tema_de_la_lista check (
    tema is null or tema in ('agua','vias','salud','educacion','energia','residuos',
                             'conectividad','vivienda','ambiente','seguridad',
                             'mujeres','campo','empleo','apoyo','justicia','cultura',
                             'animales','otro')
  ),

  es_colectivo        boolean not null default false,
  colectivo_declarado text,
  constraint colectivo_con_nombre
    -- No se puede decir «hablo por un grupo» sin decir cuál. Un aporte marcado
    -- como colectivo y sin grupo no le sirve a nadie: ni se puede notificar ni
    -- se puede saber a quién representa.
    check (colectivo_declarado is null or es_colectivo),

  retirado_en       timestamptz,
  retirado_motivo   text,
  constraint retiro_con_motivo
    check ((retirado_en is null) = (retirado_motivo is null)),

  -- I1: dentro de un proceso, una clave de envío es un aporte. Dos personas en
  -- el mismo equipo traen claves distintas y crean dos aportes legítimos.
  constraint un_envio_un_aporte unique (proceso_id, clave_envio)
);

create index on participacion.aporte (proceso_id, recibido_en desc);

-- La síntesis es versionada y la persona tiene la última palabra sobre la suya
-- (`V14`). Las dos clases de corrección se distinguen porque tienen efectos
-- distintos sobre el registro histórico — cuáles, sigue abierto (`Q15`).
create table participacion.sintesis (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),
  aporte_id     uuid not null references participacion.aporte (id),
  version       integer not null,
  texto         text not null,
  clase         text not null
                check (clase in ('propuesta','mal_interpretado','cambio_de_posicion')),
  autor         text not null,
  motivo        text,
  creada_en     timestamptz not null default now(),
  confirmada_en timestamptz,
  unique (aporte_id, version)
);

-- La ubicación **no son columnas del aporte**: es una entidad con nivel y
-- versión de catálogo. Por eso agregar el nivel `barrio` más adelante (`V21`) es
-- una fila más y no una migración sobre datos que ya existen.
--
-- Un aporte puede tener varias: `GEO-01` permite vincular varios territorios.
create table participacion.ubicacion (
  id                uuid primary key default gen_random_uuid(),
  proceso_id        uuid not null references participacion.proceso (id),
  aporte_id         uuid not null references participacion.aporte (id),

  -- I2: tres estados, y no hay un cuarto implícito.
  estado            text not null check (estado in ('confirmada','por_aclarar','desconocida')),

  -- Solo cuando el estado es 'confirmada'. Si no, no hay código — y no se
  -- rellena con el municipio «más probable».
  territorio_codigo text,
  territorio_version text,

  autor             text,
  motivo            text,
  creada_en         timestamptz not null default now(),

  foreign key (territorio_codigo, territorio_version)
    references participacion.territorio (codigo, version),

  constraint solo_confirmada_lleva_codigo check (
    (estado = 'confirmada' and territorio_codigo is not null)
    or (estado <> 'confirmada' and territorio_codigo is null)
  )
);

create index on participacion.ubicacion (aporte_id);
create index on participacion.ubicacion (proceso_id, territorio_codigo, territorio_version);

comment on column participacion.aporte.clave_envio is
  'I1. Un reintento trae la misma clave y no crea otro aporte. Nunca se deduplica por similitud ni por IP.';
comment on column participacion.aporte.lugar_declarado is
  'GEO-01. Se guarda siempre: es lo único que permitirá re-normalizar al barrio cuando llegue su catálogo (Q26).';

-- ═══ 04_expediente.sql ═══
-- El expediente: el registro de trabajo y seguimiento de una necesidad situada
-- (`V12`, nivel 2 de 3). Puede nacer de un solo aporte, y no hace falta conocer
-- la causa técnica para abrirlo.
--
-- **Abrir un expediente no aprueba nada.** No asigna recursos, no compromete una
-- intervención y no declara resuelto nada.

create table participacion.expediente (
  id                uuid primary key default gen_random_uuid(),
  proceso_id        uuid not null references participacion.proceso (id),

  descripcion       text not null,   -- la afectación
  cambio_esperado   text,

  -- `Q10`: «desde hace tres meses» es una fecha relativa y guardada literalmente
  -- deja de ser cierta mañana. Por eso se guarda la fecha del reporte y la
  -- duración declarada por separado, y la frase se deriva.
  problema_desde    date,
  duracion_declarada text,
  recurrencia       text check (recurrencia in ('puntual','recurrente','desconocida')),

  -- `Q11`: choca con C2 —«doce familias de la vereda X» identifica—. Queda como
  -- texto declarado, no como cifra, y su publicación espera el umbral.
  poblacion_declarada text,

  responsable       text,
  abierto_en        timestamptz not null default now(),

  retirado_en       timestamptz,
  retirado_motivo   text,
  constraint retiro_con_motivo
    check ((retirado_en is null) = (retirado_motivo is null)),

  -- Fusionar y dividir NO destruyen filas (`I4` leída bien: lo que prohíbe es
  -- fusionar *automáticamente por palabras compartidas*). Una fusión escribe un
  -- expediente nuevo y apunta los anteriores hacia él.
  fusionado_en_id   uuid references participacion.expediente (id),
  constraint fusionado_no_es_el_mismo check (fusionado_en_id is distinct from id)
);

create index on participacion.expediente (proceso_id, abierto_en desc);

-- **Un aporte puede alimentar varios expedientes, y un expediente reunir varios
-- aportes** (`V12`). Es muchos a muchos, no una columna `expediente_id` en el
-- aporte. El vínculo lleva autor, fecha y motivo, y es reversible: desagrupar
-- marca la fila, no la borra (`I4`).
create table participacion.vinculo_aporte_expediente (
  id              uuid primary key default gen_random_uuid(),
  proceso_id      uuid not null references participacion.proceso (id),
  aporte_id       uuid not null references participacion.aporte (id),
  expediente_id   uuid not null references participacion.expediente (id),

  autor           text not null,
  motivo          text not null,   -- obligatorio: I4 pide conservar el porqué
  creado_en       timestamptz not null default now(),

  desvinculado_en     timestamptz,
  desvinculado_motivo text,
  desvinculado_autor  text,
  constraint desvinculo_con_motivo
    check ((desvinculado_en is null) = (desvinculado_motivo is null))
);

create index on participacion.vinculo_aporte_expediente (expediente_id) where desvinculado_en is null;
create index on participacion.vinculo_aporte_expediente (aporte_id) where desvinculado_en is null;

-- **Un expediente puede abarcar varios territorios y conserva el seguimiento de
-- cada uno** (`V12`). Un expediente intermunicipal no es uno con un territorio
-- «promedio»: es uno con varios, cada uno con su propio estado de atención.
create table participacion.expediente_territorio (
  id                 uuid primary key default gen_random_uuid(),
  proceso_id         uuid not null references participacion.proceso (id),
  expediente_id      uuid not null references participacion.expediente (id),
  territorio_codigo  text not null,
  territorio_version text not null,
  estado_atencion    text not null default 'sin_atender',
  foreign key (territorio_codigo, territorio_version)
    references participacion.territorio (codigo, version),
  unique (expediente_id, territorio_codigo, territorio_version)
);

comment on table participacion.expediente is
  'La necesidad situada. Le pertenece al proceso, no a la convocatoria: sobrevive a su cierre.';
comment on column participacion.expediente.fusionado_en_id is
  'Una fusión no destruye filas: apunta el viejo al nuevo y conserva los vínculos (I4).';

-- Desagrupar **reabre** lo que dependía de la agrupación.
--
-- `I4` pide conservar originales, diferencias, motivos y vínculos. Y `NEC-01`
-- añade la mitad que se olvida: *«reabre examen de prioridad y respuestas **sin
-- heredar aprobación**»*.
--
-- Si un aporte sale de un expediente y la prioridad se queda como estaba, el
-- sistema afirma algo que ya no sustenta. Estas columnas son la marca de que hay
-- que volver a mirarlo — no borran la prioridad, la señalan como no vigente.
alter table participacion.expediente
  add column reabierto_en     timestamptz,
  add column reabierto_motivo text,
  add constraint reapertura_con_motivo
    check ((reabierto_en is null) = (reabierto_motivo is null));

comment on column participacion.expediente.reabierto_en is
  'Marcado al desagrupar. La prioridad y la respuesta dejan de estar vigentes: no se heredan (NEC-01).';

-- ═══ 05_auditoria.sql ═══
-- La auditoría es append-only y **no se reescribe cuando se revoca un permiso**.
-- Una auditoría que se puede editar no es una auditoría.
--
-- Cada evento conserva fecha, actor, acción, versión y motivo cuando
-- corresponda (`definicion_producto_participacion_v1.md` §9).

create table participacion.auditoria (
  id           bigserial primary key,
  proceso_id   uuid not null references participacion.proceso (id),
  ocurrido_en  timestamptz not null default now(),
  actor        text not null,
  accion       text not null,
  entidad      text not null,
  entidad_id   uuid,
  motivo       text,
  antes        jsonb,
  despues      jsonb
);

create index on participacion.auditoria (proceso_id, ocurrido_en desc);
create index on participacion.auditoria (entidad, entidad_id);

-- Sin `update` ni `delete`. Es la diferencia entre un registro y una bitácora
-- que alguien puede acomodar después.
create rule auditoria_sin_update as on update to participacion.auditoria do instead nothing;
create rule auditoria_sin_delete as on delete to participacion.auditoria do instead nothing;

comment on table participacion.auditoria is
  'Append-only por regla, no por costumbre. Una auditoría editable no es una auditoría.';

-- ═══ 06_identidad.sql ═══
-- **La identidad y el contacto viven separados del dato analítico.** No es una
-- vista: es una partición, y es lo que hace cumplible que Comunicaciones no
-- pueda descargar contactos (`SEG-01`, `I6`, `C2`).
--
-- Está en su propio esquema para que el permiso se dé o se niegue de una sola
-- vez, y para que un `select *` sobre lo analítico no la traiga por descuido.
--
-- **Y es lo que permite resolver `Q7`**: quien retira por seguridad tiene miedo
-- de que lo identifiquen, así que el borrado lógico del aporte no lo protege si
-- esto se queda. Aquí sí se puede borrar de verdad, sin tocar el registro
-- analítico. Falta confirmarlo con quien responda por la política de tratamiento.

create schema if not exists identidad;

create table identidad.contacto (
  id           uuid primary key default gen_random_uuid(),
  proceso_id   uuid not null references participacion.proceso (id),
  aporte_id    uuid not null references participacion.aporte (id),
  -- Opcional siempre: `N02` y `DAT-01` prohíben exigir contacto para recibir.
  valor        text,
  canal        text check (canal in ('correo','telefono','whatsapp')),
  -- Recordatorios solo si la persona los pidió (`N18`).
  acepta_avisos boolean not null default false,
  creado_en    timestamptz not null default now()
);

-- El comprobante: cómo la persona vuelve a ver lo suyo **sin dar correo**
-- (`RF4`, `RF5`, `RES-01`).
--
-- Se guarda el hash, no el código. El código lo ve la persona una vez; si se
-- guardara en claro, quien lea la tabla puede consultar el aporte de cualquiera.
--
-- **El mecanismo completo sigue abierto** (`P4`): no hay nada escrito sobre
-- identidad en ninguno de los 24 documentos fuente. Esto es lo mínimo que no
-- prejuzga esa decisión.
create table identidad.comprobante (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),
  aporte_id     uuid not null references participacion.aporte (id),
  codigo_hash   text not null unique,
  emitido_en    timestamptz not null default now(),
  revocado_en   timestamptz
);

comment on schema identidad is
  'Partición física, no una vista. Separar aquí es lo que hace cumplible I6 y C2, y lo que permite borrar de verdad sin tocar lo analítico (Q7).';
comment on column identidad.comprobante.codigo_hash is
  'El hash, nunca el código. Guardarlo en claro haría que leer la tabla permitiera consultar el aporte de cualquiera.';

-- ═══ 07_conteo.sql ═══
-- Las cuentas. Viven aquí y no en el servidor: `AGENTS.md` §8, nivel 2.
--
-- **JavaScript formatea, no calcula.** Y la razón no es de estilo: si el mapa,
-- la lista y la exportación hacen cada uno su propia cuenta, `I6` se rompe sola
-- —«ni ofrecer mapas y exportaciones con universos contradictorios»—.
--
-- Las dos reglas son antiintuitivas y por eso se prueban contra números
-- calculados a mano, no contra lo que devolvió la primera implementación
-- (`AGENTS.md` §7):
--
--   R1  una necesidad en N municipios sigue siendo UNA necesidad nacional.
--       No se suman subtotales que se solapan.
--   R2  un aporte sin ubicación cuenta en el total recibido y en pendientes,
--       pero NO en el denominador municipal. Y un aporte con dos municipios
--       **no mueve el numerador**.

-- El universo de un corte: los IDs sobre los que se cuenta. Todo indicador sale
-- de aquí, que es lo que hace que mapa, lista y exportación coincidan.
create or replace function participacion.universo(
  p_proceso uuid,
  p_desde   timestamptz default null,
  p_hasta   timestamptz default null
) returns table (aporte_id uuid)
language sql stable as $$
  select a.id
  from participacion.aporte a
  where a.proceso_id = p_proceso
    and a.retirado_en is null
    and (p_desde is null or a.recibido_en >= p_desde)
    and (p_hasta is null or a.recibido_en <  p_hasta);
$$;

comment on function participacion.universo is
  'Los IDs del corte. Un indicador que no salga de aquí puede contradecir a otro (I6).';

-- R2 · ubicación municipal resuelta.
--
-- El numerador cuenta **aportes distintos** con al menos un vínculo municipal
-- aceptado. Por eso un aporte en dos municipios sigue sumando uno: el `distinct`
-- es la regla, no una optimización.
create or replace function participacion.indicadores(
  p_proceso uuid,
  p_desde   timestamptz default null,
  p_hasta   timestamptz default null
) returns table (
  aportes_recibidos     bigint,
  aportes_ubicados      bigint,
  aportes_pendientes    bigint,
  ubicacion_resuelta    numeric,
  municipios_con_aportes bigint,
  necesidades           bigint
)
language sql stable as $$
  with u as (select aporte_id from participacion.universo(p_proceso, p_desde, p_hasta)),
  ubicados as (
    select distinct ub.aporte_id
    from participacion.ubicacion ub
    join u on u.aporte_id = ub.aporte_id
    join participacion.territorio t
      on t.codigo = ub.territorio_codigo and t.version = ub.territorio_version
    where ub.estado = 'confirmada' and t.nivel = 'municipio'
  )
  select
    (select count(*) from u),
    (select count(*) from ubicados),
    (select count(*) from u) - (select count(*) from ubicados),
    -- Sin aportes no hay porcentaje. Devolver 0 diría «cero por ciento resuelto»,
    -- que es distinto de «no hay nada que resolver».
    case when (select count(*) from u) = 0 then null
         else round((select count(*) from ubicados)::numeric
                    * 100 / (select count(*) from u), 2) end,
    (select count(distinct ub.territorio_codigo)
       from participacion.ubicacion ub
       join u on u.aporte_id = ub.aporte_id
       join participacion.territorio t
         on t.codigo = ub.territorio_codigo and t.version = ub.territorio_version
      where ub.estado = 'confirmada' and t.nivel = 'municipio'),
    -- R1 · expedientes distintos. Uno que abarca dos municipios sigue siendo uno.
    (select count(distinct v.expediente_id)
       from participacion.vinculo_aporte_expediente v
       join u on u.aporte_id = v.aporte_id
      where v.desvinculado_en is null);
$$;

comment on function participacion.indicadores is
  'R1 y R2. El distinct del numerador ES la regla: un aporte en dos municipios no lo mueve.';

-- El corte: una foto **inmutable**. `R2` lo exige por escrito — *al aclarar otro
-- aporte se genera un corte nuevo, sin reescribir el exportado anterior*.
--
-- Guarda los números **y** la versión de catálogo con que se calcularon, porque
-- DIVIPOLA cambia (`Q5`).
create table participacion.corte (
  id                 uuid primary key default gen_random_uuid(),
  proceso_id         uuid not null references participacion.proceso (id),
  tomado_en          timestamptz not null default now(),
  zona_horaria       text not null default 'America/Bogota',
  filtro_desde       timestamptz,
  filtro_hasta       timestamptz,
  catalogo_version   text not null,
  indicadores        jsonb not null,
  -- Los IDs exactos. Es lo que permite que otro analista reproduzca el total
  -- (`TRA-01`), y lo que hace comprobable que mapa, lista y exportación
  -- hablan del mismo universo.
  universo           uuid[] not null
);

create index on participacion.corte (proceso_id, tomado_en desc);

-- Un corte no se reescribe. Nunca.
create rule corte_sin_update as on update to participacion.corte do instead nothing;
create rule corte_sin_delete as on delete to participacion.corte do instead nothing;

create or replace function participacion.tomar_corte(
  p_proceso uuid,
  p_desde   timestamptz default null,
  p_hasta   timestamptz default null
) returns uuid
language plpgsql as $$
declare v_id uuid; v_cat text;
begin
  select max(version) into v_cat from participacion.territorio;
  if v_cat is null then
    raise exception 'no hay catálogo territorial sembrado: un corte sin versión de catálogo no es reproducible';
  end if;
  insert into participacion.corte
    (proceso_id, filtro_desde, filtro_hasta, catalogo_version, indicadores, universo)
  select p_proceso, p_desde, p_hasta, v_cat, to_jsonb(i),
         array(select aporte_id from participacion.universo(p_proceso, p_desde, p_hasta))
  from participacion.indicadores(p_proceso, p_desde, p_hasta) i
  returning id into v_id;
  return v_id;
end;
$$;

comment on table participacion.corte is
  'Inmutable por regla. R2: un corte nuevo no reescribe el anterior.';

-- ═══ 08_comprobante.sql ═══
-- Emitir un comprobante sin exponer `identidad` por la API.
--
-- **Es una decisión, no una comodidad.** `identidad` guarda contacto y
-- comprobantes, y existe como partición física para que el permiso se dé o se
-- niegue de una sola vez (`SEG-01`, `I6`, `C2`). Exponerla a PostgREST la
-- volvería alcanzable por URL directa, que es justo lo que `SEG-01` prohíbe:
-- los permisos aplican *«también por URL directa»*.
--
-- Entonces el servidor no escribe ahí: pide que se escriba. La función corre con
-- los privilegios de su dueño y devuelve solo el identificador del aporte.
--
-- **El código nunca entra ni sale por aquí.** Se genera en el servidor, se pasa
-- su hash, y el código en claro solo existe en la respuesta al navegador. Si la
-- función recibiera el código, quedaría en el registro de sentencias de Postgres.

create or replace function participacion.emitir_comprobante(
  p_proceso uuid,
  p_aporte  uuid,
  p_hash    text
) returns void
language plpgsql
security definer
set search_path = identidad, participacion, pg_temp
as $$
begin
  if length(coalesce(p_hash, '')) <> 64 then
    raise exception 'el comprobante se guarda como hash sha256, no como código';
  end if;
  insert into identidad.comprobante (proceso_id, aporte_id, codigo_hash)
  values (p_proceso, p_aporte, p_hash);
end;
$$;

revoke all on function participacion.emitir_comprobante(uuid, uuid, text) from public;

comment on function participacion.emitir_comprobante is
  'La única puerta a identidad.comprobante. El esquema identidad no se expone por la API a propósito (SEG-01).';

-- Limpieza de pruebas. `identidad` no se expone por la API, así que una prueba
-- que crea comprobantes necesita una puerta para llevárselos. Es de pruebas y lo
-- dice el nombre: si apareciera en código de producto, se ve.
create or replace function participacion.borrar_comprobantes_de_prueba(p_aportes uuid[])
returns void
language plpgsql
security definer
set search_path = identidad, participacion, pg_temp
as $$
begin
  delete from identidad.comprobante where aporte_id = any(p_aportes);
end;
$$;

revoke all on function participacion.borrar_comprobantes_de_prueba(uuid[]) from public;

-- Canjear un comprobante. **La única puerta de lectura a `identidad`.**
--
-- Recibe el hash, nunca el código: si recibiera el código quedaría en el
-- registro de sentencias de Postgres, que es donde nadie lo busca y todo el
-- mundo lo puede leer.
--
-- Devuelve **un aporte o nada**. Nunca una lista — `N16`: *«consulta por
-- comprobante no expone expedientes ajenos»*. Y el proceso va en la condición:
-- un código no cruza procesos.
create or replace function participacion.canjear_comprobante(
  p_proceso uuid,
  p_hash    text
) returns table (
  aporte_id        uuid,
  relato           text,
  lugar_declarado  text,
  estado_ubicacion text,
  recibido_en      timestamptz,
  -- Lo que la persona precisó, devuelto **a ella misma**. No es filtrar nada:
  -- es su aporte, y no poder ver lo que uno mismo contó es lo que hace que la
  -- gente deje de creer que sirvió de algo.
  afectados        text,
  desde_cuando     text,
  canal            text,
  municipio        text,
  colectivo        text,
  sintesis         text
) language sql security definer set search_path = identidad, participacion, pg_temp as $$
  select a.id, a.relato_original, a.lugar_declarado,
         (select ub.estado from participacion.ubicacion ub
           where ub.aporte_id = a.id order by ub.creada_en desc limit 1),
         a.recibido_en,
         a.afectados, a.desde_cuando, a.canal,
         -- El municipio **solo si alguien lo aceptó**. Mostrar el declarado
         -- como si fuera el aceptado sería la inferencia que `I2` prohíbe, y
         -- aquí además se la estaríamos devolviendo a ella como un hecho.
         (select t.nombre from participacion.ubicacion ub
            join participacion.territorio t
              on t.codigo = ub.territorio_codigo and t.version = ub.territorio_version
           where ub.aporte_id = a.id and ub.estado = 'confirmada' limit 1),
         a.colectivo_declarado,
         -- La síntesis vigente: la última versión, que es la que manda.
         (select s.texto from participacion.sintesis s
           where s.aporte_id = a.id order by s.version desc limit 1)
  from identidad.comprobante c
  join participacion.aporte a on a.id = c.aporte_id
  where c.codigo_hash = p_hash
    and c.proceso_id = p_proceso
    and c.revocado_en is null
    and a.retirado_en is null
  limit 1;
$$;

revoke all on function participacion.canjear_comprobante(uuid, text) from public;

comment on function participacion.canjear_comprobante is
  'Un comprobante abre UN aporte, nunca una lista (N16). Recibe el hash: el código en claro no entra a la base.';

-- Solo para pruebas: comprueba que el código en claro no quedó guardado en
-- ninguna parte de la tabla. Existe porque es la única forma de probarlo sin
-- exponer `identidad`, y el nombre lo dice para que se vea si se cuela.
create or replace function participacion.buscar_texto_en_comprobantes_de_prueba(p_texto text)
returns bigint
language sql
security definer
set search_path = identidad, participacion, pg_temp
as $$
  select count(*) from identidad.comprobante
  where codigo_hash = p_texto or codigo_hash ilike '%' || p_texto || '%';
$$;

revoke all on function participacion.buscar_texto_en_comprobantes_de_prueba(text) from public;

-- ═══ 10_estados.sql ═══
-- Los cuatro estados de `CAL-01`, **separados**.
--
-- La tentación es un campo `estado` con todos los valores. Es el error que
-- `CAL-01` existe para impedir: pide *«mantener estados separados para
-- ubicación, clasificación, confirmación del relato y revisión institucional»*
-- y que *«cada indicador declare qué estados incluye»* — con un campo no se
-- puede declarar nada.
--
-- El de ubicación ya vive en `participacion.ubicacion`, porque un aporte puede
-- tener varias. Estos tres son del aporte.

alter table participacion.aporte
  add column estado_clasificacion text not null default 'por_clasificar'
    check (estado_clasificacion in ('por_clasificar','clasificado')),
  -- Confirmación del RELATO por la persona, no de los hechos. `backoffice-especificacion.md`:
  -- *«validar una síntesis no equivale a verificar los hechos»*.
  add column estado_confirmacion text not null default 'sin_confirmar'
    check (estado_confirmacion in ('sin_confirmar','confirmado')),
  add column estado_revision text not null default 'sin_revisar'
    check (estado_revision in ('sin_revisar','en_revision','revisado'));

comment on column participacion.aporte.estado_confirmacion is
  'Que la persona confirmó su síntesis. NO que los hechos estén verificados: son cosas distintas.';

-- ═══ 11_gestion.sql ═══
-- Las actuaciones: **un hecho por fila**.
--
-- La tentación es un campo `estado` en el expediente con cinco valores. Es el
-- error que `RES-01` existe para impedir: *«recepción, respuesta, solución,
-- financiación y ejecución son cinco eventos distintos»*. Con un campo no se
-- puede decir que algo fue recibido y remitido **pero no respondido**, que es
-- justo el estado en que va a estar casi todo.
--
-- Y por eso el estado de atención **se deriva** de estas filas y no se guarda:
-- un campo almacenado se desincroniza de sus hechos, y entonces el tablero
-- afirma algo que la historia contradice.

create table participacion.actuacion (
  id             uuid primary key default gen_random_uuid(),
  proceso_id     uuid not null references participacion.proceso (id),
  expediente_id  uuid not null references participacion.expediente (id),

  -- Cinco, y no hay un sexto. `N14` distingue además recibido, examinado,
  -- incorporado, financiado, ejecutado y resultado — pero eso es incidencia, y
  -- la incidencia no está en esta entrega.
  tipo           text not null check (tipo in
                   ('recepcion','remision','decision','respuesta','siguiente_paso')),

  autor          text not null,
  ocurrida_en    timestamptz not null default now(),
  motivo         text,

  -- Solo en `remision`. **Una remisión no aceptada sigue pendiente** (`N13`), y
  -- por eso la aceptación es su propio hecho con su propia fecha: no un booleano
  -- que alguien cambia sin dejar cuándo.
  destino        text,
  aceptada_en    timestamptz,

  -- Solo en `siguiente_paso`. Nunca una promesa de plazo: `Q20` está abierta y
  -- el plazo no se inventa.
  siguiente_paso text,

  constraint destino_solo_en_remision
    check (destino is null or tipo = 'remision'),
  constraint aceptacion_solo_en_remision
    check (aceptada_en is null or tipo = 'remision'),
  constraint paso_solo_en_siguiente_paso
    check (siguiente_paso is null or tipo = 'siguiente_paso')
);

create index on participacion.actuacion (expediente_id, ocurrida_en);
create index on participacion.actuacion (proceso_id, tipo);

-- El estado de atención, **derivado**. Nunca almacenado.
--
-- Devuelve `sin_respuesta_registrada` cuando no hay respuesta, y **nunca
-- «vencido»**: el plazo no existe (`Q20`), y el paquete es explícito — *«no
-- inventar incumplimiento de plazo si no existe plazo definido»*.
create or replace function participacion.estado_de_atencion(p_expediente uuid)
returns table (
  estado           text,
  ultima_actuacion timestamptz,
  dias_sin_actuar  numeric,
  remision_pendiente boolean
)
language sql stable as $$
  select
    case
      when exists (select 1 from participacion.actuacion a
                    where a.expediente_id = p_expediente and a.tipo = 'respuesta')
        then 'respondido'
      when exists (select 1 from participacion.actuacion a
                    where a.expediente_id = p_expediente and a.tipo = 'remision')
        then 'remitido'
      when exists (select 1 from participacion.actuacion a
                    where a.expediente_id = p_expediente and a.tipo = 'recepcion')
        then 'recibido'
      else 'sin_respuesta_registrada'
    end,
    (select max(a.ocurrida_en) from participacion.actuacion a where a.expediente_id = p_expediente),
    round(extract(epoch from (now() - coalesce(
      (select max(a.ocurrida_en) from participacion.actuacion a where a.expediente_id = p_expediente),
      (select e.abierto_en from participacion.expediente e where e.id = p_expediente)))) / 86400, 1),
    exists (select 1 from participacion.actuacion a
             where a.expediente_id = p_expediente and a.tipo = 'remision' and a.aceptada_en is null);
$$;

comment on function participacion.estado_de_atencion is
  'Derivado de los hechos, nunca almacenado. Y nunca devuelve "vencido": el plazo no existe (Q20).';

-- ═══ 12_alerta.sql ═══
-- La ruta de alerta urgente (`V13`).
--
-- **Es una entidad propia, no un estado del aporte.** Se abre desde un aporte
-- sin esperar a que exista un expediente: un formulario a medio llenar ya puede
-- tener alerta.
--
-- Y los tres momentos van separados porque la tentación es juntarlos:
--
--   orientación mostrada   le dijimos a la persona a dónde llamar
--   contacto intentado     intentamos avisarle a alguien
--   recepción confirmada   alguien confirmó que recibió el aviso
--
-- **Mostrar un teléfono no es haber contactado, y contactar no es que alguien
-- haya recibido.** Con un solo campo `estado` esas tres cosas se vuelven la
-- misma, y el tablero diría que una emergencia está atendida cuando lo único que
-- pasó es que alguien vio un número.

create table participacion.alerta (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),
  aporte_id     uuid not null references participacion.aporte (id),

  -- Quién o qué la levantó. `V13`: puede activarla la persona, un facilitador,
  -- un revisor o una detección automática — y se distingue, porque una señal de
  -- texto no es lo mismo que alguien diciendo «esto es una emergencia».
  origen        text not null check (origen in ('persona','facilitador','revisor','senal')),
  indicio       text,

  levantada_en  timestamptz not null default now(),

  -- Los tres momentos. Cada uno con su fecha: nulo significa que no ha pasado.
  orientacion_mostrada_en timestamptz,
  contacto_intentado_en   timestamptz,
  contacto_canal          text,
  recepcion_confirmada_en timestamptz,
  recepcion_constancia    text,
  responsable             text,

  -- Volver al flujo ordinario exige justificación, y conserva todo (`V13`).
  devuelta_en     timestamptz,
  devuelta_motivo text,
  devuelta_autor  text,
  constraint devolucion_con_motivo
    check ((devuelta_en is null) = (devuelta_motivo is null)),

  -- I1 otra vez: un aporte, una alerta. Un reintento del mismo envío no crea
  -- otro aporte, luego tampoco otra alerta.
  constraint un_aporte_una_alerta unique (aporte_id),

  -- No se puede confirmar una recepción sin haber intentado el contacto. Es la
  -- secuencia, y sin esto un tablero podría decir «recibido» sin que nadie
  -- hubiera llamado.
  constraint recepcion_despues_del_intento
    check (recepcion_confirmada_en is null or contacto_intentado_en is not null)
);

create index on participacion.alerta (proceso_id, levantada_en desc)
  where devuelta_en is null;

comment on table participacion.alerta is
  'Entidad propia, no un estado. Se abre desde un aporte sin esperar expediente (V13).';
comment on column participacion.alerta.origen is
  'Una señal de texto no es lo mismo que una persona diciendo que es una emergencia. Se distingue.';

-- **No existe una función para desactivar una alerta.** `V13`: la IA puede
-- detectar, pero *«su valoración no puede impedir que una persona active la
-- alerta ni desactivarla por sí sola»*. Lo más parecido es devolverla al flujo
-- ordinario, que exige autor y motivo — es decir, una persona respondiendo.

-- ═══ 13_prioridad.sql ═══
-- Prioridad de examen (`PRI-01`, `RF12`).
--
-- **Lo que define esta tabla es lo que no tiene.**
--
-- No hay columna de puntaje, ni de peso, ni de ranking. `PRI-01` es explícito:
-- *«los pesos o cuotas no acordados no se rellenan automáticamente»*, y
-- `vacios.md` confirma que no existen ni pesos ni cuotas ni desempate.
--
-- Un número plausible es indistinguible de uno real y nadie lo cuestiona
-- después. Aquí eso significaría decidir a quién se atiende primero con una
-- cuenta que nadie autorizó.
--
-- Y no hay **nada** de selección presupuestal. Ni apagado: `I5` la bloquea
-- detrás de ocho condiciones publicadas y ninguna está. Una bandera apagada es
-- una bandera que alguien enciende.

create table participacion.prioridad_examen (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),
  expediente_id uuid not null references participacion.expediente (id),

  autor         text not null,
  motivo        text not null,
  registrada_en timestamptz not null default now(),

  -- Los cinco de `PRI-01`, **separados**. Separados porque son cosas distintas,
  -- y porque juntarlos en un número es exactamente la fórmula que no existe.
  -- Todos opcionales: registrar lo que se sabe, no rellenar lo que no.
  urgencia_reportada text check (urgencia_reportada in ('alta','media','baja','sin_declarar')),
  afectacion         text check (afectacion in ('alta','media','baja','sin_establecer')),
  recurrencia        text check (recurrencia in ('alta','media','baja','unica')),
  competencia        text check (competencia in ('clara','en_disputa','sin_establecer')),

  -- La incertidumbre se registra **como tal**, no como un valor bajo. La
  -- especificación pide «conservar la incertidumbre», y una afectación
  -- desconocida no es una afectación baja: confundirlas entierra el caso.
  incertidumbre      text,

  -- Reabrir el expediente (T029) deja la prioridad no vigente. No se borra: se
  -- señala, porque `NEC-01` pide reabrir *«sin heredar aprobación»*.
  vigente_hasta      timestamptz,
  no_vigente_motivo  text,
  constraint no_vigencia_con_motivo
    check ((vigente_hasta is null) = (no_vigente_motivo is null))
);

create index on participacion.prioridad_examen (expediente_id, registrada_en desc);
create index on participacion.prioridad_examen (proceso_id) where vigente_hasta is null;

comment on table participacion.prioridad_examen is
  'Qué examinar primero y por qué. Sin puntaje, sin pesos, sin ranking: PRI-01 prohíbe rellenar lo que nadie acordó.';
comment on column participacion.prioridad_examen.incertidumbre is
  'Se registra como tal. Una afectación desconocida NO es una afectación baja: confundirlas entierra el caso.';

-- Solo para pruebas: las columnas de una tabla. Existe para poder comprobar que
-- NO hay una columna de puntaje ni de selección presupuestal — una prueba que
-- afirme eso leyendo el código no prueba nada sobre la base.
create or replace function participacion.columnas_de_prueba(p_tabla text)
returns text[]
language sql stable as $$
  select array_agg(column_name::text)
  from information_schema.columns
  where table_schema = 'participacion' and table_name = p_tabla;
$$;

-- ═══ 14_convocatoria.sql ═══
-- Convocatorias y encuentros (`M06`, `RF10`).
--
-- La primera entrega que pide el módulo: *«sección pública permanente
-- Participa → Convocatorias y agenda, accesible sin cuenta, con próximos
-- encuentros en portada»*.
--
-- Lo que el modelo tiene que hacer imposible está escrito abajo, restricción
-- por restricción. Lo más importante: **una convocatoria cerrada no puede
-- prometer recepción**, y **cancelar un encuentro no lo borra**.

create table participacion.convocatoria (
  id            uuid primary key default gen_random_uuid(),
  proceso_id    uuid not null references participacion.proceso (id),

  nombre        text not null,
  -- `RF10`: propósito, alcance, fechas, canales y **efecto de participar**. El
  -- último no es decorativo: sin decir qué pasa con lo que se aporta, la
  -- convocatoria promete por omisión.
  proposito     text not null,
  alcance       text not null,
  efecto        text not null,

  -- Una convocatoria puede recibir aportes por internet **sin ninguna
  -- reunión**, así que la ventana es de la convocatoria y no de los encuentros.
  abre_en       timestamptz not null,
  cierra_en     timestamptz,

  estado        text not null default 'borrador'
                check (estado in ('borrador','publicada','cerrada')),
  -- El borrador no altera la versión pública: lo que no está publicado no se ve.
  publicada_en  timestamptz,
  constraint publicada_con_fecha
    check ((estado = 'borrador') = (publicada_en is null)),
  constraint cierra_despues_de_abrir
    check (cierra_en is null or cierra_en > abre_en)
);

create table participacion.encuentro (
  id              uuid primary key default gen_random_uuid(),
  proceso_id      uuid not null references participacion.proceso (id),
  convocatoria_id uuid not null references participacion.convocatoria (id),

  titulo          text not null,
  tema            text,
  modalidad       text not null check (modalidad in ('presencial','virtual','mixta')),

  -- Con zona horaria siempre. Un encuentro a las 9 no dice nada sin decir
  -- dónde son las 9, y la gente que se conecta desde otro huso llega tarde.
  comienza_en     timestamptz not null,
  zona_horaria    text not null default 'America/Bogota',

  -- Dónde, según la modalidad. Un encuentro presencial sin lugar y uno virtual
  -- sin sala son fichas que no sirven para ir.
  lugar           text,
  sala            text,
  constraint presencial_con_lugar check (modalidad = 'virtual' or lugar is not null),
  constraint virtual_con_sala     check (modalidad = 'presencial' or sala is not null),

  -- Las ayudas reales, dichas o no dichas. `null` es «no se dijo»; prometerlas
  -- sin tenerlas es peor que callarlas.
  ayudas          text,
  cupos           integer check (cupos is null or cupos > 0),

  estado          text not null default 'programado'
                  check (estado in ('programado','reprogramado','cancelado')),

  -- **Reprogramar conserva la ficha y muestra el cambio.** Por eso la fecha
  -- anterior se guarda: sin ella, quien ya se había organizado no puede saber
  -- que cambió.
  comenzaba_en    timestamptz,
  motivo_cambio   text,
  constraint reprogramado_dice_desde_cuando
    check ((estado = 'reprogramado') = (comenzaba_en is not null)),
  constraint cambio_con_motivo
    check (estado = 'programado' or motivo_cambio is not null)
);

create index on participacion.encuentro (proceso_id, comienza_en);
create index on participacion.convocatoria (proceso_id, estado);

-- ¿Está abierta de verdad ahora mismo?
--
-- Una sola función para que la portada, la ficha y cualquier aviso digan lo
-- mismo. «Publicada» no basta: una convocatoria publicada cuya ventana ya
-- cerró **no recibe**, y ofrecer participar ahí es la promesa que `RF10`
-- prohíbe —*«no promete recepción en convocatoria cerrada»*—.
create or replace function participacion.recibe_aportes(c participacion.convocatoria)
returns boolean language sql immutable as $$
  select c.estado = 'publicada'
     and c.abre_en <= now()
     and (c.cierra_en is null or c.cierra_en > now());
$$;

-- ═══ 16_enlace.sql ═══
-- Enlaces y QR por evento y por pieza (`QR-01` … `QR-04`).
--
-- La clave del requerimiento, dicha en su primera página:
--
--   > separar **de dónde vino el enlace**, **en qué evento dice participar la
--   > persona** y **dónde ocurre el problema que está reportando**. Estos datos
--   > pueden ser distintos y los tres son útiles.
--
-- Todo lo de abajo existe para que esos tres no se confundan nunca. El caso que
-- lo explica: alguien recibe reenviado el QR del evento A mientras está en el
-- evento B, y cuenta un problema de una vereda del municipio C. **Es un solo
-- aporte con tres contextos distintos**, y ninguno de ellos es asistencia.

create table participacion.enlace (
  -- Corto y estable: va impreso en un afiche y se teclea a mano cuando la
  -- cámara no lee. Por eso es `text` y no un uuid.
  id            text primary key check (id ~ '^[A-Z0-9]{6,12}$'),
  proceso_id    uuid not null references participacion.proceso (id),
  encuentro_id  uuid not null references participacion.encuentro (id),

  -- Afiche y publicación digital del mismo encuentro se distinguen **sin
  -- dividir el evento**: son piezas, no eventos distintos.
  pieza         text not null
                check (pieza in ('afiche','volante','publicacion','radio','otro')),

  -- Las UTMs describen difusión y **no otorgan permisos**. Se guardan las
  -- configuradas, que es distinto de las recibidas: las de abajo son lo que
  -- alguien puso en la dirección, y pueden venir manipuladas.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,

  -- Retirar un enlace le quita el acceso, pero **no borra los aportes que
  -- entraron por él** ni su procedencia. Puede seguir explicando qué pasó.
  estado        text not null default 'activo' check (estado in ('activo','retirado')),
  creado_por    text not null,
  creado_en     timestamptz not null default now()
);

create index on participacion.enlace (encuentro_id);

-- ═══ 99_acceso.sql ═══
-- El acceso, en su versión mínima: **negar por defecto**.
--
-- **Va de último en el orden del esquema, y por eso se llama 99.** La primera vez
-- se llamó 09 y las tablas creadas después —`actuacion`— quedaron sin permiso:
-- `grant on all tables` solo alcanza a las que existen cuando corre. El síntoma
-- fue «permission denied», que no se parece en nada a «el archivo está en el
-- orden equivocado».
--
-- La política de verdad —quién ve qué— es `T032`, y está bloqueada por `P4` (no
-- hay mecanismo de identidad escrito en ningún documento) y `Q18` (si la
-- visibilidad es aislamiento entre procesos o jerarquía por territorio). Las dos
-- se implementan distinto y no se convierte una en la otra después.
--
-- Entonces esto **no decide nada de eso**. Hace lo único que no prejuzga:
--
--   · el acceso a nivel de fila queda ENCENDIDO en todas las tablas
--   · sin ninguna política, que en Postgres significa: nadie ve nada
--   · el rol del servidor —el de la llave `secret`— lo salta, que es como
--     trabaja el servidor hoy
--   · `anon` y `authenticated` —las llaves que llegan al navegador— no reciben
--     ni un permiso
--
-- Cuando `T032` se desbloquee, agregar una política es escribir una regla sobre
-- una tabla que ya tiene el interruptor puesto. Arrancar al revés —permitir y
-- luego restringir— es cómo se filtran los datos: basta olvidar una tabla.

grant usage on schema participacion to service_role;
grant all on all tables in schema participacion to service_role;
grant all on all sequences in schema participacion to service_role;
grant execute on all functions in schema participacion to service_role;

-- Y explícito, para que se lea como decisión y no como olvido.
revoke all on schema participacion from anon, authenticated;
revoke all on all tables in schema participacion from anon, authenticated;

-- Se recorren todas, no se enumeran. Enumerar es exactamente cómo se olvida
-- una tabla nueva, y una tabla sin acceso a nivel de fila es una tabla abierta.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename from pg_tables
     where schemaname in ('participacion', 'identidad')
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;
end $$;

-- Ni una política. Es el estado correcto mientras `P4` y `Q18` sigan abiertas:
-- una política escrita antes de saber contra qué identidad se comprueba es una
-- política equivocada escrita con confianza.

