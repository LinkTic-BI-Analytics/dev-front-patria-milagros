// Sesión sin estado: la cookie lleva el vencimiento y su firma HMAC-SHA256.
// Usa Web Crypto para funcionar igual en el proxy y en el servidor.

export const COOKIE_SESION = "spn_sesion";
export const DURACION_SESION_S = 60 * 60 * 12;

const codificador = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function llave(): Promise<CryptoKey> {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET en el entorno");
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function firmar(valor: string): Promise<string> {
  return base64url(await crypto.subtle.sign("HMAC", await llave(), codificador.encode(valor)));
}

/** Comparación en tiempo constante para cadenas. */
export function igualesSeguro(a: string, b: string): boolean {
  const ba = codificador.encode(a);
  const bb = codificador.encode(b);
  let diff = ba.length ^ bb.length;
  const n = Math.max(ba.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function crearSesion(): Promise<string> {
  const vence = Math.floor(Date.now() / 1000) + DURACION_SESION_S;
  return `${vence}.${await firmar(String(vence))}`;
}

export async function sesionValida(valor: string | undefined): Promise<boolean> {
  if (!valor) return false;
  const [vence, firma] = valor.split(".");
  if (!vence || !firma || !/^\d+$/.test(vence)) return false;
  if (Number(vence) < Math.floor(Date.now() / 1000)) return false;
  return igualesSeguro(firma, await firmar(vence));
}
