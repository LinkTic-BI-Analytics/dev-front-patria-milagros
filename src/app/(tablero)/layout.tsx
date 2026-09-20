/**
 * Marco del tablero. El fondo vivo (la aurora animada) solo vive aquí: en `/acceso` la tapa
 * la bandera a pantalla completa y se animaba sin que nadie la viera.
 */
export default function MarcoTablero({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="fondo-vivo" aria-hidden />
      {children}
    </>
  );
}
