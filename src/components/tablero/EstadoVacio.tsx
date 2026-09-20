import { SearchX, type LucideIcon } from "lucide-react";

type Accion = { etiqueta: string; onClick: () => void };

/** Un vacío siempre dice por qué está vacío y ofrece una salida: nunca un recuadro en blanco. */
export function EstadoVacio({
  icono: Icono = SearchX,
  titulo,
  detalle,
  acciones = [],
  compacto = false,
  children,
}: {
  icono?: LucideIcon;
  titulo: string;
  detalle?: string;
  acciones?: Accion[];
  compacto?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md border border-dashed border-default bg-white/[.02] px-4 text-center ${
        compacto ? "gap-1.5 py-5" : "gap-2 py-10"
      }`}
    >
      <Icono className={compacto ? "size-5 text-muted" : "size-7 text-muted"} />
      <p className={`font-bold text-primary ${compacto ? "text-xs" : "text-sm"}`}>{titulo}</p>
      {detalle && <p className="max-w-md text-xs leading-relaxed text-muted">{detalle}</p>}
      {children}
      {acciones.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {acciones.map((a) => (
            <button
              key={a.etiqueta}
              onClick={a.onClick}
              className="rounded-full border border-default px-3 py-1 text-xs font-bold text-secondary transition-colors hover:border-gold-500 hover:text-accent"
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
