import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El documento confidencial vive solo en local: nunca debe quedar copiado en la salida del build.
  outputFileTracingExcludes: {
    "/*": ["./top_secret/**/*.pdf"],
  },
};

export default nextConfig;
