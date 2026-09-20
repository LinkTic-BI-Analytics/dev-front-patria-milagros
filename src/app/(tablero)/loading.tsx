import Image from "next/image";

/**
 * Esqueleto de la carga. Copia la rejilla y las alturas del tablero real: si no, al llegar los
 * datos todo salta de sitio y la espera se siente más larga de lo que fue.
 */
export default function Cargando() {
  return (
    <div className="flex min-h-dvh flex-col" role="status" aria-label="Cargando el tablero">
      {/* Encabezado: la marca ya está, para que la página nazca con identidad */}
      <div className="flex h-16 shrink-0 items-center gap-4 border-b border-subtle px-4 sm:px-6">
        <Image
          src="/linea-grafica-patria/assets/escudo-colombia.png"
          alt=""
          width={34}
          height={36}
        />
        <div>
          <div className="tricolor mb-1">
            <span />
            <span />
            <span />
          </div>
          <p className="titulo-display text-[11px] font-black tracking-tight uppercase sm:text-[13px] xl:text-[1.05rem]">
            Sistema de <span className="text-accent">Escucha</span> y Planeación Nacional
          </p>
        </div>
      </div>

      <div className="grid flex-1 items-start gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_25rem] lg:grid-rows-[auto_auto] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="relative grid h-[72svh] min-h-[28rem] place-items-center overflow-hidden rounded-lg border border-subtle bg-mapa lg:col-start-1 lg:row-start-1 lg:h-[calc(100dvh-7.75rem)]">
          <div className="shimmer absolute inset-0" />
          <div className="relative flex flex-col items-center gap-5">
            <Image
              src="/linea-grafica-patria/assets/escudo-colombia.png"
              alt=""
              width={72}
              height={77}
              className="animate-pulse"
              preload
            />
            <p className="etiqueta">Consolidando el panorama nacional</p>
          </div>
        </div>

        {/* Panel: mismas alturas que el tablero (héroe, KPI, rejilla 2×2 y dos secciones) */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex">
          <div className="panel shimmer h-[115px] md:col-span-2 lg:col-span-1" />
          <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1">
            <div className="panel shimmer col-span-2 h-[160px]" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="panel shimmer h-[100px]" />
            ))}
          </div>
          <div className="panel shimmer h-[240px]" />
          <div className="panel shimmer h-[200px]" />
        </div>

        {/* Narrativas, solo donde van: bajo el mapa */}
        <div className="panel shimmer h-[320px] lg:col-start-1 lg:row-start-2" />
      </div>
    </div>
  );
}
