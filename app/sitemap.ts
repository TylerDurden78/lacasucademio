import type { MetadataRoute } from "next";
import { ALOJAMIENTO } from "@/lib/config";
import { proximosFinesDeSemana } from "@/lib/availability";
import { construirRutaPath } from "./alojamientos/[slug]/disponibilidad/_compartido";

export const revalidate = 86400; // regeneración diaria

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  const urlsFijas: MetadataRoute.Sitemap = [
    { url: ALOJAMIENTO.dominio, lastModified: ahora, changeFrequency: "monthly", priority: 1 },
    {
      url: `${ALOJAMIENTO.dominio}${RUTA_BASE}`,
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${ALOJAMIENTO.dominio}${RUTA_BASE}/precios`,
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Solo unas pocas URLs de ejemplo de /disponibilidad (próximos fines de
  // semana): el resto de combinaciones de fechas son válidas y navegables,
  // pero no tiene sentido listarlas todas en el sitemap. Usan el formato de
  // ruta "limpio" (sin query string): además de evitar el problema de
  // escapar "&" en el XML, es el formato que aceptan herramientas de
  // navegación de agentes más restrictivas (ver _compartido.tsx).
  const urlsDisponibilidad: MetadataRoute.Sitemap = proximosFinesDeSemana(8).map(
    ({ entrada, salida }) => ({
      url: `${ALOJAMIENTO.dominio}${construirRutaPath(entrada, salida, "2")}`,
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 0.6,
    })
  );

  return [...urlsFijas, ...urlsDisponibilidad];
}
