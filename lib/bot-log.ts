/**
 * Tipos y clasificación de visitantes — sin dependencias de servidor, así que
 * también puede importarse desde componentes cliente (p. ej. la tabla en vivo
 * de `/admin/visitas`). La lectura/escritura en Redis vive aparte, en
 * `bot-log-store.ts`, para no arrastrar el SDK de Upstash al bundle cliente.
 */

export type CategoriaVisitante =
  | "openai"
  | "anthropic"
  | "google"
  | "bing"
  | "perplexity"
  | "otro_bot"
  | "humano";

export const NOMBRES_CATEGORIA: Record<CategoriaVisitante, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  bing: "Bing",
  perplexity: "Perplexity",
  otro_bot: "Otro bot",
  humano: "Humano",
};

export interface VisitaRegistrada {
  timestamp: string;
  ruta: string;
  userAgent: string;
  categoria: CategoriaVisitante;
  ipAnonimizada: string;
}

const PATRONES_CATEGORIA: [RegExp, CategoriaVisitante][] = [
  [/GPTBot|OAI-SearchBot|ChatGPT-User/i, "openai"],
  [/ClaudeBot|Claude-User|Claude-SearchBot|anthropic/i, "anthropic"],
  [/Googlebot|Google-Extended|Mediapartners-Google|APIs-Google/i, "google"],
  [/bingbot|BingPreview|msnbot/i, "bing"],
  [/PerplexityBot|Perplexity-User/i, "perplexity"],
  [
    /bot|crawler|spider|slurp|facebookexternalhit|Applebot|DuckDuckBot|YandexBot|Bytespider|SemrushBot|AhrefsBot|MJ12bot|ia_archiver/i,
    "otro_bot",
  ],
];

export function clasificarUserAgent(userAgent: string): CategoriaVisitante {
  if (!userAgent) return "otro_bot";
  for (const [patron, categoria] of PATRONES_CATEGORIA) {
    if (patron.test(userAgent)) return categoria;
  }
  return "humano";
}

/** IPv4: pone a 0 el último octeto. IPv6: conserva solo los primeros 4 grupos (/64). */
export function anonimizarIp(ip: string): string {
  if (ip.includes(":")) {
    const grupos = ip.split(":").slice(0, 4);
    return `${grupos.join(":")}::`;
  }
  const octetos = ip.split(".");
  if (octetos.length === 4) {
    return `${octetos.slice(0, 3).join(".")}.0`;
  }
  return "desconocida";
}
