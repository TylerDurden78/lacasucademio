import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALOJAMIENTO } from "@/lib/config";
import {
  ContenidoDisponibilidad,
  MensajeExplicativo,
  RUTA_DISPONIBILIDAD,
  adultosConDefecto,
  construirRutaPath,
} from "../_compartido";

/**
 * Versión "limpia" de la página de disponibilidad, con las fechas como
 * segmentos de ruta en vez de query string:
 *
 *   /alojamientos/casuca-mio/disponibilidad/2026-10-06/2026-10-08        (adultos → 2 por defecto)
 *   /alojamientos/casuca-mio/disponibilidad/2026-10-06/2026-10-08/4      (4 adultos)
 *   /alojamientos/casuca-mio/disponibilidad/2026-10-06/2026-10-08/4/2    (4 adultos, 2 niños)
 *
 * Es la URL canónica y la que se usa en los enlaces de ejemplo, el sitemap,
 * `/llms.txt` y el JSON-LD: algunas herramientas de navegación de agentes
 * (p. ej. la de ChatGPT sin conector) rechazan abrir URLs con "?" que el
 * propio modelo se ha inventado ("is not accessible via this tool"), pero sí
 * abren sin problema una URL sin query string. `/disponibilidad` (con
 * query string, para el formulario GET sin JS) redirige aquí.
 */

type Params = Promise<{ slug: string; fechas: string[] }>;

function parsearSegmentos(fechas: string[]) {
  if (fechas.length < 2 || fechas.length > 4) return undefined;
  const [entrada, salida, adultos, ninos] = fechas;
  return { entrada, salida, adultos, ninos };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, fechas } = await params;
  if (slug !== ALOJAMIENTO.slug) return {};
  const segmentos = parsearSegmentos(fechas);
  if (!segmentos) return {};

  const { entrada, salida } = segmentos;
  const { valor: adultos } = adultosConDefecto(segmentos.adultos);
  const titulo = `Disponibilidad ${entrada} → ${salida}`;
  const descripcion = `Disponibilidad y precios de ${ALOJAMIENTO.nombre} del ${entrada} al ${salida}.`;
  const canonical = construirRutaPath(entrada, salida, adultos, segmentos.ninos);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    openGraph: {
      title: `${titulo} · ${ALOJAMIENTO.nombre}`,
      description: descripcion,
      url: canonical,
    },
  };
}

export default async function DisponibilidadPathPage({ params }: { params: Params }) {
  const { slug, fechas } = await params;
  if (slug !== ALOJAMIENTO.slug) notFound();

  const segmentos = parsearSegmentos(fechas);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      {segmentos ? (
        <ContenidoDisponibilidad
          entrada={segmentos.entrada}
          salida={segmentos.salida}
          adultosTextoOriginal={segmentos.adultos}
          ninosTexto={segmentos.ninos}
        />
      ) : (
        <MensajeExplicativo
          titulo="Formato de URL no válido"
          mensaje={`Usa ${RUTA_DISPONIBILIDAD}/AAAA-MM-DD/AAAA-MM-DD, opcionalmente seguido de /adultos o /adultos/ninos.`}
        />
      )}
    </main>
  );
}
