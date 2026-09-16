export type Canal = "web" | "asistida" | "voz_transcrita";

export type EstadoUbicacion = "confirmada" | "por_aclarar" | "desconocida" | "sin_registro";

/** Derivado de las actuaciones, con la misma regla de `participacion.estado_de_atencion`. */
export type EstadoAtencion = "respondido" | "remitido" | "recibido" | "sin_respuesta_registrada";

/** Los tres momentos de una alerta, en orden. */
export type EtapaAlerta = "levantada" | "orientada" | "contactada" | "recibida";

export type AporteResumen = {
  id: string;
  /** `null` = sin clasificar */
  tema: string | null;
  canal: Canal;
  /** YYYY-MM en hora de Bogotá */
  mes: string;
  /** YYYY-MM-DD en hora de Bogotá */
  fecha: string;
  colectivo: boolean;
  ubicacion: EstadoUbicacion;
  /** Municipios confirmados (código DIVIPOLA de 5 dígitos) */
  municipios: string[];
};

export type ExpedienteResumen = {
  id: string;
  temas: string[];
  canales: Canal[];
  estado: EstadoAtencion;
  municipios: string[];
};

export type AlertaResumen = {
  id: string;
  tema: string | null;
  canal: Canal;
  municipios: string[];
  etapa: EtapaAlerta;
  devuelta: boolean;
};

/** La síntesis vigente de un aporte: la última versión, que es la que manda. */
export type NarrativaResumen = {
  aporteId: string;
  texto: string;
  version: number;
  clase: "propuesta" | "mal_interpretado" | "cambio_de_posicion";
  /** La persona confirmó su síntesis. No significa que los hechos estén verificados. */
  confirmada: boolean;
};

export type Territorio = { nombre: string; lat: number | null; lon: number | null };

export type Indicadores = {
  aportes_recibidos: number;
  aportes_ubicados: number;
  aportes_pendientes: number;
  ubicacion_resuelta: number | null;
  municipios_con_aportes: number;
  necesidades: number;
};

export type DatosTablero = {
  proceso: { id: string; nombre: string; compromiso: string };
  catalogoVersion: string;
  actualizadoEn: string;
  aportes: AporteResumen[];
  expedientes: ExpedienteResumen[];
  alertas: AlertaResumen[];
  narrativas: NarrativaResumen[];
  departamentos: Record<string, Territorio>;
  municipios: Record<string, Territorio & { tipo: string | null }>;
  /** Salida del RPC `indicadores`: la cuenta oficial para contrastar. */
  control: Indicadores | null;
};
