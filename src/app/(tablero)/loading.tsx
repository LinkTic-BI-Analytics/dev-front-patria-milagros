import Image from "next/image";

export default function Cargando() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-16 border-b border-subtle" />
      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="relative grid h-[72vh] place-items-center overflow-hidden rounded-lg border border-subtle bg-[#040C1D] lg:h-[calc(100dvh-7.75rem)]">
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
            <div className="tricolor">
              <span />
              <span />
              <span />
            </div>
            <p className="etiqueta">Consolidando el panorama nacional</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[140, 150, 110, 260, 200].map((h, i) => (
            <div key={i} className="panel shimmer" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  );
}
