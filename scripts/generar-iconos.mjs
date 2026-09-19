// Genera los iconos de la aplicación a partir de src/app/icon.svg.
//
// Rasteriza el SVG con Chrome (sin dependencias de imagen) y empaqueta los PNG en un .ico
// —el formato admite PNG embebidos desde Windows Vista—. Salidas:
//   src/app/favicon.ico   16, 32, 48, 64, 128 y 256 px
//   src/app/apple-icon.png  180 px
//
// Uso: node scripts/generar-iconos.mjs   (necesita Google Chrome instalado)

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUERTO = 9444;
const TAMANOS = [16, 32, 48, 64, 128, 256];

const svg = readFileSync(join(raiz, "src/app/icon.svg"), "utf8");
const perfil = mkdtempSync(join(tmpdir(), "iconos-"));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let version;
for (let i = 0; i < 60 && !version; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PUERTO}/json/version`)).json();
  } catch {
    await esperar(200);
  }
}
const objetivo = await (
  await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: "PUT" })
).json();
const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pendientes = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m);
    pendientes.delete(m.id);
  }
});
const cdp = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    pendientes.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await cdp("Page.enable");
await cdp("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });

/** Rasteriza el SVG al tamaño pedido y devuelve el PNG. */
async function rasterizar(lado, margen = 0) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: lado,
    height: lado,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;background:transparent}
    body{display:grid;place-items:center}
    svg{width:${lado - margen * 2}px;height:${lado - margen * 2}px;display:block}
  </style>${svg}`;
  await cdp("Page.navigate", { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
  await esperar(180);
  const { result } = await cdp("Page.captureScreenshot", { format: "png" });
  return Buffer.from(result.data, "base64");
}

const pngs = [];
for (const lado of TAMANOS) pngs.push({ lado, datos: await rasterizar(lado) });
writeFileSync(join(raiz, "src/app/apple-icon.png"), await rasterizar(180, 14));

ws.close();
chrome.kill();
await esperar(300);
rmSync(perfil, { recursive: true, force: true });

// ── Empaquetado ICO: cabecera + una entrada por tamaño + los PNG en bruto.
const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0); // reservado
cabecera.writeUInt16LE(1, 2); // tipo: icono
cabecera.writeUInt16LE(pngs.length, 4);

let desplazamiento = 6 + pngs.length * 16;
const entradas = pngs.map(({ lado, datos }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(lado >= 256 ? 0 : lado, 0); // 0 significa 256
  e.writeUInt8(lado >= 256 ? 0 : lado, 1);
  e.writeUInt8(0, 2); // paleta
  e.writeUInt8(0, 3); // reservado
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por píxel
  e.writeUInt32LE(datos.length, 8);
  e.writeUInt32LE(desplazamiento, 12);
  desplazamiento += datos.length;
  return e;
});

writeFileSync(
  join(raiz, "src/app/favicon.ico"),
  Buffer.concat([cabecera, ...entradas, ...pngs.map((p) => p.datos)]),
);

console.log(
  `favicon.ico: ${TAMANOS.join(", ")} px · apple-icon.png: 180 px · icon.svg: ${svg.length} bytes`,
);
process.exit(0);
