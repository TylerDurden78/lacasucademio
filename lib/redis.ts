import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Cliente Upstash Redis compartido por el log de visitas
 * (`bot-log-store.ts`) y el rate limiting del MCP (`rate-limit.ts`).
 * `undefined` cuando no hay credenciales configuradas — ambos consumidores
 * deben degradarse con normalidad en ese caso, nunca lanzar.
 */
export function clienteRedis(): Redis | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return new Redis({ url, token });
}
