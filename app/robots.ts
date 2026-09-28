import type { MetadataRoute } from "next";
import { ALOJAMIENTO } from "@/lib/config";

const AGENTES_IA_PERMITIDOS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/admin" },
      { userAgent: "Googlebot", allow: "/", disallow: "/admin" },
      { userAgent: "Bingbot", allow: "/", disallow: "/admin" },
      ...AGENTES_IA_PERMITIDOS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: "/admin",
      })),
    ],
    sitemap: `${ALOJAMIENTO.dominio}/sitemap.xml`,
  };
}
