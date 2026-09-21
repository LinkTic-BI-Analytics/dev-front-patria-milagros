import {
  Building2,
  Bus,
  ChartColumn,
  CircleDashed,
  Coins,
  Compass,
  Earth,
  Flag,
  FlaskConical,
  Globe,
  GraduationCap,
  HandHeart,
  Handshake,
  HardHat,
  HeartPulse,
  IdCard,
  Landmark,
  Leaf,
  Mic,
  Palette,
  Scale,
  ScanEye,
  Shapes,
  Shield,
  Store,
  Tractor,
  Trophy,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Canal, EstadoAtencion, EtapaAlerta } from "./tipos";

export const SIN_TEMA = "sin_tema";

type Tema = { etiqueta: string; corta: string; icono: LucideIcon };

// Los 24 sectores del Gobierno nacional. La base guarda la etiqueta oficial completa;
// aquí la clave es un slug estable y `corta` sirve donde no cabe el nombre entero.
export const TEMAS: Record<string, Tema> = {
  salud_proteccion_social: { etiqueta: "Salud y Protección Social", corta: "Salud", icono: HeartPulse },
  vivienda_ciudad_territorio: { etiqueta: "Vivienda, Ciudad y Territorio", corta: "Vivienda y territorio", icono: Building2 },
  transporte: { etiqueta: "Transporte", corta: "Transporte", icono: Bus },
  educacion: { etiqueta: "Educación", corta: "Educación", icono: GraduationCap },
  ambiente_desarrollo_sostenible: { etiqueta: "Ambiente y Desarrollo Sostenible", corta: "Ambiente", icono: Leaf },
  defensa: { etiqueta: "Defensa", corta: "Defensa", icono: Shield },
  agricultura_desarrollo_rural: { etiqueta: "Agricultura y Desarrollo Rural", corta: "Agricultura", icono: Tractor },
  comercio_industria_turismo: { etiqueta: "Comercio, Industria y Turismo", corta: "Comercio e industria", icono: Store },
  minas_energia: { etiqueta: "Minas y Energía", corta: "Minas y energía", icono: Zap },
  inclusion_social_reconciliacion: { etiqueta: "Inclusión Social y Reconciliación", corta: "Inclusión social", icono: HandHeart },
  presidencia: { etiqueta: "Presidencia de la República", corta: "Presidencia", icono: Landmark },
  tic: { etiqueta: "Tecnologías de la Información y la Comunicación", corta: "TIC", icono: Wifi },
  deporte_recreacion: { etiqueta: "Deporte y Recreación", corta: "Deporte", icono: Trophy },
  justicia: { etiqueta: "Justicia", corta: "Justicia", icono: Scale },
  culturas: { etiqueta: "Culturas", corta: "Culturas", icono: Palette },
  interior: { etiqueta: "Interior", corta: "Interior", icono: Flag },
  relaciones_exteriores: { etiqueta: "Relaciones Exteriores", corta: "Relaciones exteriores", icono: Earth },
  funcion_publica: { etiqueta: "Función Pública", corta: "Función pública", icono: IdCard },
  hacienda: { etiqueta: "Hacienda", corta: "Hacienda", icono: Coins },
  ciencia_tecnologia_innovacion: { etiqueta: "Ciencia, Tecnología e Innovación", corta: "Ciencia y tecnología", icono: FlaskConical },
  planeacion: { etiqueta: "Planeación", corta: "Planeación", icono: Compass },
  trabajo: { etiqueta: "Trabajo", corta: "Trabajo", icono: HardHat },
  estadistica: { etiqueta: "Estadística", corta: "Estadística", icono: ChartColumn },
  inteligencia: { etiqueta: "Inteligencia", corta: "Inteligencia", icono: ScanEye },
  [SIN_TEMA]: { etiqueta: "Sin clasificar", corta: "Sin clasificar", icono: CircleDashed },
};

/** Letras y números sin tildes: "Salud y Protección Social" y "salud_y_proteccion_social" coinciden. */
const compacto = (s: string) =>
  s.toLocaleLowerCase("es-CO").normalize("NFD").replace(/[^a-z0-9]/g, "");

const TEMA_POR_FORMA = new Map<string, string>();
for (const [clave, { etiqueta }] of Object.entries(TEMAS)) {
  TEMA_POR_FORMA.set(compacto(clave), clave);
  TEMA_POR_FORMA.set(compacto(etiqueta), clave);
}

/**
 * El tema tal como lo guarda la base → clave del catálogo. Acepta la etiqueta oficial o un slug.
 * Un valor que no está en el catálogo se conserva tal cual (y `temaDe` lo muestra así).
 */
export function resolverTema(valor: string | null): string | null {
  if (valor === null || !valor.trim()) return null;
  return TEMA_POR_FORMA.get(compacto(valor)) ?? valor.trim();
}

export const temaReconocido = (tema: string | null) => tema === null || tema in TEMAS;

export const temaDe = (tema: string | null): Tema =>
  TEMAS[tema ?? SIN_TEMA] ?? { etiqueta: tema ?? "", corta: tema ?? "", icono: Shapes };

export const CANALES: Record<Canal, { etiqueta: string; icono: LucideIcon; color: string }> = {
  // Orden fijo y validado (CVD) sobre la superficie navy: dorado · azul · rojo.
  web: { etiqueta: "Web", icono: Globe, color: "#D4AA45" },
  asistida: { etiqueta: "Asistida", icono: Handshake, color: "#4E8BE0" },
  voz_transcrita: { etiqueta: "Voz", icono: Mic, color: "#E8455F" },
};

// Es una progresión (ordinal): una sola familia azul, de tenue a brillante.
export const ESTADOS_ATENCION: Record<EstadoAtencion, { etiqueta: string; color: string }> = {
  // El pendiente va rayado y con borde: el navy liso casi no se distinguía del fondo (1,5:1).
  sin_respuesta_registrada: { etiqueta: "Sin respuesta registrada", color: "#1E3A6B" },
  recibido: { etiqueta: "Recibido", color: "#3D74C9" },
  remitido: { etiqueta: "Remitido", color: "#6FA3EA" },
  respondido: { etiqueta: "Respondido", color: "#CFE2FB" },
};

/** Escala secuencial del mapa: un solo tono dorado, de tenue (poco) a brillante (mucho). */
export const RAMPA_MAPA = ["#7A6220", "#96771F", "#B49022", "#D4AA45", "#FFC800"] as const;

export const ETAPAS_ALERTA: Record<EtapaAlerta, string> = {
  levantada: "Levantada",
  orientada: "Orientación mostrada",
  contactada: "Contacto intentado",
  recibida: "Recepción confirmada",
};

export const METRICAS = {
  aportes: { etiqueta: "Aportes", singular: "aporte", plural: "aportes" },
  necesidades: { etiqueta: "Necesidades", singular: "necesidad", plural: "necesidades" },
  alertas: { etiqueta: "Alertas", singular: "alerta", plural: "alertas" },
} as const;

export type Metrica = keyof typeof METRICAS;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const etiquetaMes = (mes: string) => {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
};

const diaBogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** El «hoy» del tablero es el corte de los datos, no el reloj de quien mira (YYYY-MM-DD). */
export const fechaEnBogota = (iso: string) => diaBogota.format(new Date(iso));

// ── Fechas para mostrar ──────────────────────────────────────────────────────────────────
//
// Los nombres de mes se escriben aquí, NO con `Intl` en español: Node dice «20 de sept» y el
// navegador «20 de sep.», y esa diferencia entre el HTML del servidor y el del cliente rompe la
// hidratación de React. De `Intl` solo se toman partes numéricas, que sí son iguales en los dos.

/** «8 sep» a partir de YYYY-MM-DD. */
export const etiquetaDia = (fecha: string) => {
  const [, m, d] = fecha.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
};

/** «8 sep», con el año solo cuando no es el del corte de los datos. */
export const etiquetaFecha = (fecha: string, anioDelCorte = "") => {
  const [a] = fecha.split("-");
  return `${etiquetaDia(fecha)}${a === anioDelCorte ? "" : ` ${a}`}`;
};

const relojBogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** «20 sep, 5:15 p. m.»: cuándo se leyó la base, en hora de Bogotá. */
export function corteBogota(iso: string): string {
  const partes = new Map(relojBogota.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  const hora24 = Number(partes.get("hour"));
  const hora = hora24 % 12 || 12;
  const dia = Number(partes.get("day"));
  const mes = MESES[Number(partes.get("month")) - 1];
  return `${dia} ${mes}, ${hora}:${partes.get("minute")} ${hora24 < 12 ? "a. m." : "p. m."}`;
}

const numero = new Intl.NumberFormat("es-CO");
export const formatoNumero = (n: number) => numero.format(Math.round(n));

/** "BOGOTÁ, D.C." → "Bogotá, D.C."; "SAN JOSÉ DE URÉ" → "San José de Uré" */
export function nombrePropio(nombre: string): string {
  const menores = new Set(["de", "del", "la", "las", "los", "y", "el", "d.c."]);
  return nombre
    .toLocaleLowerCase("es-CO")
    .split(/(\s+|-)/)
    .map((p, i) =>
      i > 0 && menores.has(p) ? (p === "d.c." ? "D.C." : p) : p.charAt(0).toLocaleUpperCase("es-CO") + p.slice(1),
    )
    .join("");
}

/** Un solo nombre para cada cosa, en toda la aplicación. Lo muestra «Cómo leer este tablero». */
export const GLOSARIO: { termino: string; definicion: string }[] = [
  {
    termino: "Aporte",
    definicion:
      "Lo que registra una persona: un dolor, una problemática o una propuesta. Llega por la web, por atención asistida o por voz transcrita.",
  },
  {
    termino: "Necesidad",
    definicion:
      "El expediente que agrupa uno o varios aportes sobre el mismo asunto y sigue su atención.",
  },
  {
    termino: "Alerta activa",
    definicion: "Un caso que pidió atención inmediata y todavía no se ha devuelto.",
  },
  {
    termino: "Narrativa",
    definicion:
      "La síntesis vigente de un aporte. Se agrupa contando relatos iguales, sin inteligencia artificial.",
  },
  {
    termino: "Eje y línea del Plan",
    definicion:
      "La parte del Plan Nacional de Desarrollo 2026–2030 con la que se relaciona el relato, por sus palabras clave.",
  },
  {
    termino: "Aportes ubicados",
    definicion:
      "Los que tienen municipio confirmado. Los demás suman al total nacional, pero no pintan el mapa.",
  },
];

/** Cómo se cuenta, en una frase por regla. Se repite en el pie del panel y en las narrativas. */
export const REGLAS_CONTEO = [
  "Un aporte o una necesidad en varios municipios se cuenta una sola vez por territorio.",
  "Los aportes sin ubicación confirmada suman al total nacional, pero no al mapa.",
];

/** Los filtros vigentes en palabras, para decirlo igual en el panel, el modal y las narrativas. */
export function describirFiltros(
  filtros: { temas: string[]; canales: Canal[]; ejes: string[] },
  pnd: { ejes: { id: string; numero: number; nombre: string }[] } | null,
): string[] {
  return [
    ...filtros.temas.map((t) => (t === SIN_TEMA ? "Sin clasificar" : temaDe(t).corta)),
    ...filtros.canales.map((c) => CANALES[c].etiqueta),
    ...filtros.ejes.map((id) => {
      const eje = pnd?.ejes.find((e) => e.id === id);
      return eje ? `Eje ${eje.numero} · ${eje.nombre}` : id;
    }),
  ];
}
