import {
  BriefcaseBusiness,
  CircleDashed,
  Droplets,
  Globe,
  GraduationCap,
  HandHeart,
  Handshake,
  HeartPulse,
  House,
  Leaf,
  Mic,
  Palette,
  PawPrint,
  Route,
  Scale,
  ShieldCheck,
  Shapes,
  Tractor,
  Trash2,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Canal, EstadoAtencion, EtapaAlerta } from "./tipos";

export const SIN_TEMA = "sin_tema";

// Lista provisional de la base (`tema_de_la_lista`): así se dice en pantalla.
export const TEMAS: Record<string, { etiqueta: string; icono: LucideIcon }> = {
  agua: { etiqueta: "Agua", icono: Droplets },
  vias: { etiqueta: "Vías", icono: Route },
  salud: { etiqueta: "Salud", icono: HeartPulse },
  educacion: { etiqueta: "Educación", icono: GraduationCap },
  energia: { etiqueta: "Energía", icono: Zap },
  residuos: { etiqueta: "Residuos", icono: Trash2 },
  conectividad: { etiqueta: "Conectividad", icono: Wifi },
  vivienda: { etiqueta: "Vivienda", icono: House },
  ambiente: { etiqueta: "Ambiente", icono: Leaf },
  seguridad: { etiqueta: "Seguridad", icono: ShieldCheck },
  mujeres: { etiqueta: "Mujeres", icono: Users },
  campo: { etiqueta: "Campo", icono: Tractor },
  empleo: { etiqueta: "Empleo", icono: BriefcaseBusiness },
  apoyo: { etiqueta: "Apoyo social", icono: HandHeart },
  justicia: { etiqueta: "Justicia", icono: Scale },
  cultura: { etiqueta: "Cultura", icono: Palette },
  animales: { etiqueta: "Animales", icono: PawPrint },
  otro: { etiqueta: "Otro", icono: Shapes },
  [SIN_TEMA]: { etiqueta: "Sin clasificar", icono: CircleDashed },
};

export const temaDe = (tema: string | null) => TEMAS[tema ?? SIN_TEMA] ?? TEMAS.otro;

export const CANALES: Record<Canal, { etiqueta: string; icono: LucideIcon; color: string }> = {
  // Orden fijo y validado (CVD) sobre la superficie navy: dorado · azul · rojo.
  web: { etiqueta: "Web", icono: Globe, color: "#D4AA45" },
  asistida: { etiqueta: "Asistida", icono: Handshake, color: "#4E8BE0" },
  voz_transcrita: { etiqueta: "Voz", icono: Mic, color: "#E8455F" },
};

// Es una progresión (ordinal): una sola familia azul, de tenue a brillante.
export const ESTADOS_ATENCION: Record<EstadoAtencion, { etiqueta: string; color: string }> = {
  sin_respuesta_registrada: { etiqueta: "Sin respuesta registrada", color: "#1E3A6B" },
  recibido: { etiqueta: "Recibido", color: "#2F66B8" },
  remitido: { etiqueta: "Remitido", color: "#5B93E0" },
  respondido: { etiqueta: "Respondido", color: "#A9CBF5" },
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
