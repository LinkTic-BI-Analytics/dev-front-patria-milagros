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
export const RAMPA_MAPA = ["#3B3217", "#6B5518", "#A07D1F", "#D4AA45", "#FFC800"] as const;

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
