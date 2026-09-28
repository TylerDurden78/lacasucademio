import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { anonimizarIp, clasificarUserAgent } from "@/lib/bot-log";
import { registrarVisita } from "@/lib/bot-log-store";

const RUTA_ADMIN = /^\/admin(\/|$)/;
const RUTA_API_ADMIN = /^\/api\/admin(\/|$)/;

function respuestaNoAutorizada(): NextResponse {
  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin"' },
  });
}

function autorizadoComoAdmin(request: NextRequest): boolean {
  const usuario = process.env.ADMIN_USER;
  const clave = process.env.ADMIN_PASSWORD;
  if (!usuario || !clave) return false;

  const cabecera = request.headers.get("authorization");
  if (!cabecera?.startsWith("Basic ")) return false;

  const decodificado = atob(cabecera.slice("Basic ".length));
  const separador = decodificado.indexOf(":");
  if (separador === -1) return false;

  return (
    decodificado.slice(0, separador) === usuario &&
    decodificado.slice(separador + 1) === clave
  );
}

function obtenerIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}

export function proxy(request: NextRequest, event: NextFetchEvent): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (RUTA_ADMIN.test(pathname) || RUTA_API_ADMIN.test(pathname)) {
    if (!autorizadoComoAdmin(request)) return respuestaNoAutorizada();
    return NextResponse.next();
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  event.waitUntil(
    registrarVisita({
      timestamp: new Date().toISOString(),
      ruta: `${pathname}${search}`,
      userAgent,
      categoria: clasificarUserAgent(userAgent),
      ipAnonimizada: anonimizarIp(obtenerIp(request)),
    })
  );

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
