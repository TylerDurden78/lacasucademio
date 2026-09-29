import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALOJAMIENTO } from "@/lib/config";
import {
  ContenidoDisponibilidad,
  adultosConDefecto,
  construirRutaPath,
} from "./_compartido";

/**
 * Punto de entrada por query string (`?entrada=...&salida=...&adultos=...`):
 * es el formato que produce el formulario GET sin JS y el que documentaba el
 * plan original. Renderiza el mismo contenido que la URL "limpia"
 * (`[...fechas]/page.tsx`, con las fechas como segmentos de ruta) en vez de
 * redirigir — se probó una redirección 307 y alguna herramienta de
 * navegación de agentes (la de ChatGPT sin conector) no la sigue y se queda
 * sin contenido. El `canonical` sigue apuntando a la URL limpia para que
 * buscadores no traten esto como contenido duplicado, y todos los enlaces
 * que generamos (ficha, sitemap, llms.txt) usan siempre el formato limpio.
 */

type BusquedaParams = Promise<{ [clave: string]: string | string[] | undefined }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: BusquedaParams;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) return {};
  const sp = await searchParams;
  const entrada = primerValor(sp.entrada);
  const salida = primerValor(sp.salida);
  const ninos = primerValor(sp.ninos);
  if (!entrada || !salida) {
    return {
      title: "Disponibilidad",
      description: "Consulta disponibilidad y precio por fechas.",
    };
  }
  const { valor: adultos } = adultosConDefecto(primerValor(sp.adultos));
  const canonical = construirRutaPath(entrada, salida, adultos, ninos);
  const titulo = `Disponibilidad ${entrada} → ${salida}`;
  const descripcion = `Disponibilidad y precios de ${ALOJAMIENTO.nombre} del ${entrada} al ${salida}.`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    openGraph: { title: `${titulo} · ${ALOJAMIENTO.nombre}`, description: descripcion, url: canonical },
  };
}

export default async function DisponibilidadQueryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: BusquedaParams;
}) {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) notFound();

  const sp = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <ContenidoDisponibilidad
        entrada={primerValor(sp.entrada)}
        salida={primerValor(sp.salida)}
        adultosTextoOriginal={primerValor(sp.adultos)}
        ninosTexto={primerValor(sp.ninos)}
      />
    </main>
  );
}
