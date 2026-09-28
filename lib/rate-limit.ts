/**
 * Rate limiting básico para el servidor MCP (Fase 5), ventana fija sobre
 * Upstash Redis. Sin credenciales de Upstash configuradas, no se limita
 * nada — es una demo de solo lectura, así que fallar abierto es preferible a
 * bloquearla por falta de configuración.
 */

import "server-only";
import { clienteRedis } from "./redis";

const LIMITE_PETICIONES = 30;
const VENTANA_SEGUNDOS = 60;

export async function permitirPeticionMcp(identificador: string): Promise<boolean> {
  const redis = clienteRedis();
  if (!redis) return true;

  try {
    const clave = `casuca-mio:mcp-rl:${identificador}`;
    const conteo = await redis.incr(clave);
    if (conteo === 1) {
      await redis.expire(clave, VENTANA_SEGUNDOS);
    }
    return conteo <= LIMITE_PETICIONES;
  } catch (error) {
    console.error("Error comprobando el rate limit del MCP:", error);
    return true;
  }
}
