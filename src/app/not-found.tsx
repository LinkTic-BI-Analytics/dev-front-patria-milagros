import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Página no encontrada · Sistema de Escucha" };

export default function NoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <Image
          src="/linea-grafica-patria/assets/escudo-colombia.png"
          alt=""
          width={56}
          height={60}
          className="mx-auto opacity-90"
        />
        <div className="tricolor mt-4 justify-center">
          <span />
          <span />
          <span />
        </div>
        <h1 className="titulo-display mt-3 text-2xl font-black uppercase">Página no encontrada</h1>
        <p className="mt-2 text-sm text-secondary">
          La dirección no corresponde a ninguna vista del tablero.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-sm bg-action-primary px-5 text-xs font-extrabold tracking-[0.06em] text-action-primary-text uppercase shadow-glow-gold"
        >
          Volver al tablero
        </Link>
      </div>
    </main>
  );
}
