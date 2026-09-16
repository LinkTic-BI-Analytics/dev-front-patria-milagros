import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth/sesion";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const autenticado = await sesionValida(request.cookies.get(COOKIE_SESION)?.value);

  if (pathname.startsWith("/acceso")) {
    return autenticado ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!autenticado) {
    return NextResponse.redirect(new URL("/acceso", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|data/|linea-grafica-patria/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|geojson)$).*)",
  ],
};
