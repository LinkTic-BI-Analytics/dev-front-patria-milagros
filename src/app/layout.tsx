import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Proveedores } from "@/components/Proveedores";

const montserrat = Montserrat({
  variable: "--fuente-montserrat",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const inter = Inter({
  variable: "--fuente-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--fuente-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Sistema de Escucha y Planeación Nacional",
  description: "Escucha ciudadana y panorama territorial para la planeación nacional.",
};

export const viewport: Viewport = {
  themeColor: "#06142A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${montserrat.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="fondo-vivo" aria-hidden />
        <div className="grano" aria-hidden />
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
