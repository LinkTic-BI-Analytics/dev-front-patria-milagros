import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El documento confidencial vive solo en local: nunca debe quedar copiado en la salida del build.
  outputFileTracingExcludes: {
    "/*": ["./top_secret/**/*.pdf"],
  },
  // La cartografía generada es inmutable: su nombre cambia cuando cambia el contenido
  // (`scripts/preparar-geo.mjs` escribe `src/lib/geo/version.json`). En dev Next pisa el header.
  async headers() {
    return [
      {
        source: "/data/geo/:ruta*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
