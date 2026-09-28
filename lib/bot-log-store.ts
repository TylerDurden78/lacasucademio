/**
 * Persistencia del log de visitas sobre Upstash Redis. Solo se importa desde
 * código de servidor (proxy.ts, route handlers) — nunca desde componentes
 * cliente. Si no hay credenciales de Upstash configuradas (desarrollo local
 * sin `.env`), se degrada con normalidad: no se registra nada y quien lea el
 * panel de admin lo ve indicado, en vez de romper el sitio.
 */

import "server-only";
import { clienteRedis } from "./redis";
import type { VisitaRegistrada } from "./bot-log";

const CLAVE_REDIS = "casuca-mio:visitas";
const MAX_VISITAS_GUARDADAS = 500;

export async function registrarVisita(visita: VisitaRegistrada): Promise<void> {
  const redis = clienteRedis();
  if (!redis) return;
  try {
    await redis.lpush(CLAVE_REDIS, JSON.stringify(visita));
    await redis.ltrim(CLAVE_REDIS, 0, MAX_VISITAS_GUARDADAS - 1);
  } catch (error) {
    console.error("No se pudo registrar la visita en Redis:", error);
  }
}

export async function obtenerVisitas(
  limite: number
): Promise<{ visitas: VisitaRegistrada[]; persistenciaConfigurada: boolean }> {
  const redis = clienteRedis();
  if (!redis) return { visitas: [], persistenciaConfigurada: false };
  try {
    const bruto = await redis.lrange<string | VisitaRegistrada>(
      CLAVE_REDIS,
      0,
      limite - 1
    );
    const visitas = bruto.map((v) => (typeof v === "string" ? JSON.parse(v) : v));
    return { visitas, persistenciaConfigurada: true };
  } catch (error) {
    console.error("No se pudieron leer las visitas de Redis:", error);
    return { visitas: [], persistenciaConfigurada: true };
  }
}
