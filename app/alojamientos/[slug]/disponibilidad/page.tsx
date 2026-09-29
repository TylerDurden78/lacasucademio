import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ALOJAMIENTO } from "@/lib/config";
import {
  MensajeExplicativo,
  adultosConDefecto,
  construirRutaPath,
} from "./_compartido";

/**
 * Punto de entrada por query string (`?entrada=...&salida=...&adultos=...`):
 * es el formato que produce el formulario GET sin JS y el que documentaba el
 * plan original. En cuanto hay fechas, redirige a la URL "limpia"
 * (`[...fechas]/page.tsx`, con las fechas como segmentos de ruta), que es la
 * que de verdad valida y renderiza — así solo hay un sitio con esa lógica, y
 * los enlaces que se comparten (ficha, sitemap, llms.txt) usan siempre el
 * formato limpio, más compatible con agentes que no abren URLs con "?" que
 * ellos mismos se han inventado.
 */

type BusquedaParams = Promise<{ [clave: string]: string | string[] | undefined }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export const metadata: Metadata = {
  title: "Disponibilidad",
  description: "Consulta disponibilidad y precio por fechas.",
};

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
  const entrada = primerValor(sp.entrada);
  const salida = primerValor(sp.salida);
  const ninos = primerValor(sp.ninos);

  if (!entrada || !salida) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">Disponibilidad en {ALOJAMIENTO.nombre}</h1>
        <MensajeExplicativo
          titulo="Faltan datos para consultar disponibilidad"
          mensaje="Indica fecha de entrada y fecha de salida."
          entrada={entrada}
          salida={salida}
          adultos={primerValor(sp.adultos)}
          ninos={ninos}
        />
      </main>
    );
  }

  const { valor: adultos } = adultosConDefecto(primerValor(sp.adultos));
  redirect(construirRutaPath(entrada, salida, adultos, ninos));
}
