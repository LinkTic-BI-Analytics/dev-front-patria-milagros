import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth/sesion";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookie = request.cookies.get(COOKIE_SESION)?.value;
  const autenticado = await sesionValida(cookie);

  if (pathname.startsWith("/acceso")) {
    return autenticado ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!autenticado) {
    const destino = new URL("/acceso", request.url);
    // Había cookie pero ya no vale: la sesión venció, y eso se dice en vez de un login mudo.
    if (cookie) destino.searchParams.set("vencida", "1");
    // Volver a donde se iba, solo si es una ruta interna: nunca un enlace de vuelta a otro sitio.
    if (pathname !== "/") destino.searchParams.set("volver", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|data/|linea-grafica-patria/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|geojson)$).*)",
  ],
};
