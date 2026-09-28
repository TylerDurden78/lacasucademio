import type { MetadataRoute } from "next";
import { ALOJAMIENTO } from "@/lib/config";
import { proximosFinesDeSemana } from "@/lib/availability";

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
  // pero no tiene sentido listarlas todas en el sitemap.
  //
  // Next no escapa el `&` del query string al serializar el XML del
  // sitemap, así que hay que hacerlo a mano (si no, el `&` sin escapar deja
  // el XML inválido: "EntityRef: expecting ';'").
  const urlsDisponibilidad: MetadataRoute.Sitemap = proximosFinesDeSemana(8).map(
    ({ entrada, salida }) => {
      const query = new URLSearchParams({ entrada, salida, adultos: "2" }).toString();
      return {
        url: `${ALOJAMIENTO.dominio}${RUTA_BASE}/disponibilidad?${query}`.replace(/&/g, "&amp;"),
        lastModified: ahora,
        changeFrequency: "daily",
        priority: 0.6,
      };
    }
  );

  return [...urlsFijas, ...urlsDisponibilidad];
}
