import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { crearAlineador } from "@/lib/pnd/alinear";
import { cargarPnd } from "@/lib/pnd/cargar";
import { resolverTema, temaReconocido } from "./catalogos";
import { cuerpoDe } from "./narrativas";
import type {
  AlertaResumen,
  AporteResumen,
  Canal,
  DatosTablero,
  EstadoAtencion,
  EstadoUbicacion,
  EtapaAlerta,
  ExpedienteResumen,
  Indicadores,
  NarrativaResumen,
} from "./tipos";

type Cliente = ReturnType<typeof clienteServidor>;

const PASO = 1000; // tope de filas de PostgREST en este proyecto

/** Lee todas las filas paginando con un orden estable. */
async function todas<T>(
  sb: Cliente,
  tabla: string,
  columnas: string,
  orden: string[],
  filtrar: (q: any) => any = (q) => q, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PASO) {
    let q = filtrar(sb.from(tabla).select(columnas));
    for (const col of orden) q = q.order(col);
    const { data, error } = await q.range(desde, desde + PASO - 1);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    filas.push(...(data as T[]));
    if (!data || data.length < PASO) return filas;
  }
}

const fechaBogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function agruparPor<T, K>(filas: T[], clave: (f: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const f of filas) {
    const k = clave(f);
    const lista = m.get(k);
    if (lista) lista.push(f);
    else m.set(k, [f]);
  }
  return m;
}

type FilaAporte = {
  id: string;
  tema: string | null;
  canal: Canal;
  recibido_en: string;
  es_colectivo: boolean;
};
type FilaUbicacion = {
  aporte_id: string;
  estado: Exclude<EstadoUbicacion, "sin_registro">;
  territorio_codigo: string | null;
  creada_en: string;
};
type FilaVinculo = { aporte_id: string; expediente_id: string };
type FilaExpTerr = { expediente_id: string; territorio_codigo: string };
type FilaActuacion = { expediente_id: string; tipo: string };
type FilaAlerta = {
  id: string;
  aporte_id: string;
  orientacion_mostrada_en: string | null;
  contacto_intentado_en: string | null;
  recepcion_confirmada_en: string | null;
  devuelta_en: string | null;
};
type FilaSintesis = {
  aporte_id: string;
  version: number;
  texto: string;
  clase: NarrativaResumen["clase"];
  confirmada_en: string | null;
};
type FilaTerritorio = {
  codigo: string;
  nombre: string;
  nivel: "departamento" | "municipio";
  tipo: string | null;
  latitud: number | null;
  longitud: number | null;
  version: string;
};

export async function obtenerTablero(): Promise<DatosTablero> {
  const sb = clienteServidor();

  const { data: procesos, error: errProceso } = await sb
    .from("proceso")
    .select("id,nombre,compromiso")
    .is("retirado_en", null)
    .order("creado_en")
    .limit(1);
  if (errProceso) throw new Error(`No se pudo leer proceso: ${errProceso.message}`);
  const proceso = procesos?.[0];
  if (!proceso) throw new Error("No hay un proceso activo en la base de datos");

  const delProceso = (q: any) => q.eq("proceso_id", proceso.id); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [
    territorios,
    aportes,
    ubicaciones,
    vinculos,
    expTerr,
    actuaciones,
    alertas,
    sintesis,
    control,
    catalogoPnd,
  ] = await Promise.all([
      todas<FilaTerritorio>(
        sb,
        "territorio",
        "codigo,nombre,nivel,tipo,latitud,longitud,version",
        ["codigo", "version"],
        (q) => q.in("nivel", ["departamento", "municipio"]),
      ),
      todas<FilaAporte>(sb, "aporte", "id,tema,canal,recibido_en,es_colectivo", ["id"], (q) =>
        delProceso(q).is("retirado_en", null),
      ),
      todas<FilaUbicacion>(
        sb,
        "ubicacion",
        "aporte_id,estado,territorio_codigo,creada_en",
        ["id"],
        delProceso,
      ),
      todas<FilaVinculo>(sb, "vinculo_aporte_expediente", "aporte_id,expediente_id", ["id"], (q) =>
        delProceso(q).is("desvinculado_en", null),
      ),
      todas<FilaExpTerr>(
        sb,
        "expediente_territorio",
        "expediente_id,territorio_codigo",
        ["id"],
        delProceso,
      ),
      todas<FilaActuacion>(sb, "actuacion", "expediente_id,tipo", ["id"], delProceso),
      todas<FilaAlerta>(
        sb,
        "alerta",
        "id,aporte_id,orientacion_mostrada_en,contacto_intentado_en,recepcion_confirmada_en,devuelta_en",
        ["id"],
        delProceso,
      ),
      todas<FilaSintesis>(
        sb,
        "sintesis",
        "aporte_id,version,texto,clase,confirmada_en",
        ["id"],
        delProceso,
      ),
      sb.rpc("indicadores", { p_proceso: proceso.id }).then(({ data, error }) => {
        if (error) return null;
        const fila = (data as Indicadores[] | null)?.[0];
        return fila
          ? {
              ...fila,
              ubicacion_resuelta:
                fila.ubicacion_resuelta === null ? null : Number(fila.ubicacion_resuelta),
            }
          : null;
      }),
      cargarPnd(),
    ]);

  // Catálogo: la versión más reciente manda.
  const catalogoVersion = territorios.reduce((v, t) => (t.version > v ? t.version : v), "");
  const departamentos: DatosTablero["departamentos"] = {};
  const municipios: DatosTablero["municipios"] = {};
  for (const t of territorios) {
    if (t.version !== catalogoVersion) continue;
    const base = { nombre: t.nombre, lat: t.latitud, lon: t.longitud };
    if (t.nivel === "departamento") departamentos[t.codigo] = base;
    else municipios[t.codigo] = { ...base, tipo: t.tipo };
  }

  // Ubicación por aporte: municipios confirmados; si no hay, el último estado.
  const ubicPorAporte = agruparPor(ubicaciones, (u) => u.aporte_id);
  const temasDesconocidos = new Set<string>();
  const aportesResumen: AporteResumen[] = aportes.map((a) => {
    const ubs = ubicPorAporte.get(a.id) ?? [];
    const muni = [
      ...new Set(
        ubs
          .filter((u) => u.estado === "confirmada" && u.territorio_codigo?.length === 5)
          .map((u) => u.territorio_codigo as string),
      ),
    ];
    let ubicacion: EstadoUbicacion = "sin_registro";
    if (muni.length) ubicacion = "confirmada";
    else if (ubs.length)
      ubicacion = [...ubs].sort((x, y) => y.creada_en.localeCompare(x.creada_en))[0].estado;
    const fecha = fechaBogota.format(new Date(a.recibido_en));
    const tema = resolverTema(a.tema);
    if (!temaReconocido(tema)) temasDesconocidos.add(String(tema));
    return {
      id: a.id,
      tema,
      canal: a.canal,
      mes: fecha.slice(0, 7),
      fecha,
      colectivo: a.es_colectivo,
      ubicacion,
      municipios: muni,
    };
  });
  if (temasDesconocidos.size)
    console.warn(`Temas de la base que no están en el catálogo: ${[...temasDesconocidos].join(", ")}`);
  const aportePorId = new Map(aportesResumen.map((a) => [a.id, a]));

  // Necesidades: expedientes con al menos un vínculo vigente a un aporte del universo (R1).
  const vinculosVigentes = vinculos.filter((v) => aportePorId.has(v.aporte_id));
  const aportesPorExp = agruparPor(vinculosVigentes, (v) => v.expediente_id);
  const terrPorExp = agruparPor(expTerr, (e) => e.expediente_id);
  const tiposPorExp = agruparPor(actuaciones, (a) => a.expediente_id);

  const expedientes: ExpedienteResumen[] = [...aportesPorExp.entries()].map(([id, vs]) => {
    const suyos = vs.map((v) => aportePorId.get(v.aporte_id)!);
    const tipos = new Set((tiposPorExp.get(id) ?? []).map((a) => a.tipo));
    const estado: EstadoAtencion = tipos.has("respuesta")
      ? "respondido"
      : tipos.has("remision")
        ? "remitido"
        : tipos.has("recepcion")
          ? "recibido"
          : "sin_respuesta_registrada";
    return {
      id,
      temas: [...new Set(suyos.map((a) => a.tema ?? "sin_tema"))],
      canales: [...new Set(suyos.map((a) => a.canal))],
      estado,
      municipios: [
        ...new Set(
          (terrPorExp.get(id) ?? [])
            .map((t) => t.territorio_codigo)
            .filter((c) => c.length === 5),
        ),
      ],
    };
  });

  const alertasResumen: AlertaResumen[] = alertas
    .filter((al) => aportePorId.has(al.aporte_id))
    .map((al) => {
      const a = aportePorId.get(al.aporte_id)!;
      const etapa: EtapaAlerta = al.recepcion_confirmada_en
        ? "recibida"
        : al.contacto_intentado_en
          ? "contactada"
          : al.orientacion_mostrada_en
            ? "orientada"
            : "levantada";
      return {
        id: al.id,
        tema: a.tema,
        canal: a.canal,
        municipios: a.municipios,
        etapa,
        devuelta: al.devuelta_en !== null,
      };
    });

  // Narrativas: la síntesis vigente (última versión) de cada aporte del universo.
  const vigentes = new Map<string, FilaSintesis>();
  for (const s of sintesis) {
    if (!aportePorId.has(s.aporte_id)) continue;
    const actual = vigentes.get(s.aporte_id);
    if (!actual || s.version > actual.version) vigentes.set(s.aporte_id, s);
  }
  // Relación con el PND: se calcula aquí para que el vocabulario del catálogo no salga del servidor.
  const alinear = catalogoPnd
    ? crearAlineador(
        catalogoPnd.ejes.flatMap((e) => e.lineas.map((l) => ({ ...l, eje: e.id }))),
      )
    : null;
  const narrativas: NarrativaResumen[] = [...vigentes.values()].map((s) => ({
    aporteId: s.aporte_id,
    texto: s.texto,
    version: s.version,
    clase: s.clase,
    confirmada: s.confirmada_en !== null,
    pnd: alinear ? alinear(cuerpoDe(s.texto), aportePorId.get(s.aporte_id)?.tema ?? null) : null,
  }));

  return {
    proceso,
    catalogoVersion,
    actualizadoEn: new Date().toISOString(),
    aportes: aportesResumen,
    expedientes,
    alertas: alertasResumen,
    narrativas,
    pnd: catalogoPnd && {
      fuente: catalogoPnd.fuente,
      ejes: catalogoPnd.ejes.map(({ id, numero, nombre, vision, lineas }) => ({
        id,
        numero,
        nombre,
        vision,
        lineas: lineas.map((l) => ({ id: l.id, nombre: l.nombre })),
      })),
    },
    departamentos,
    municipios,
    control,
  };
}
