import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALOJAMIENTO, SERVICIOS, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { IMAGENES } from "@/lib/images";
import { jsonLdAlojamiento } from "@/lib/jsonld";
import { JsonLd } from "@/app/_components/JsonLd";
import { proximosFinesDeSemana } from "@/lib/availability";

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;

export function generateStaticParams() {
  return [{ slug: ALOJAMIENTO.slug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) return {};
  return {
    title: "Habitaciones, servicios y ubicación",
    description: ALOJAMIENTO.descripcionCorta,
    alternates: { canonical: RUTA_BASE },
    openGraph: {
      title: `Habitaciones, servicios y ubicación · ${ALOJAMIENTO.nombre}`,
      description: ALOJAMIENTO.descripcionCorta,
      url: RUTA_BASE,
      images: [{ url: IMAGENES.fachada }],
    },
  };
}

export default async function FichaAlojamiento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) notFound();

  const findesDeSemana = proximosFinesDeSemana(4);
  const ejemploUrl = `${RUTA_BASE}/disponibilidad?entrada=AAAA-MM-DD&salida=AAAA-MM-DD&adultos=N`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-6 py-12">
      <JsonLd data={jsonLdAlojamiento()} />
      <section className="flex flex-col gap-4">
        <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
          <Image
            src={IMAGENES.fachada}
            alt={`Fachada de ${ALOJAMIENTO.nombre}`}
            fill
            priority
            className="object-cover"
          />
        </div>
        <h1 className="text-3xl font-semibold">{ALOJAMIENTO.nombre}</h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          {ALOJAMIENTO.descripcionCorta}
        </p>
        <Link
          href={`${RUTA_BASE}/disponibilidad`}
          className="w-fit rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Consultar disponibilidad y precio
        </Link>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold">Habitaciones y alojamiento</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {TIPOS_ALOJAMIENTO.map((tipo) => (
            <article
              key={tipo.id}
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="relative h-48 w-full">
                <Image
                  src={IMAGENES.habitacion[tipo.id]}
                  alt={tipo.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-2 p-4">
                <h3 className="font-medium">{tipo.nombre}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {tipo.descripcionCorta}
                </p>
                <p className="text-sm text-zinc-500">
                  {tipo.metrosCuadrados} m² · hasta {tipo.capacidadMaxima} personas ·
                  desde {tipo.precioBaseNoche} €/noche (IVA incluido aparte)
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Servicios</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2 text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          {SERVICIOS.map((servicio) => (
            <li key={servicio}>· {servicio}</li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Ubicación</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {ALOJAMIENTO.direccion}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            {ALOJAMIENTO.comarca}, {ALOJAMIENTO.provincia} ({ALOJAMIENTO.pais})
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Horarios y cancelación</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Entrada a partir de las {ALOJAMIENTO.checkIn} · Salida hasta las{" "}
            {ALOJAMIENTO.checkOut}
          </p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {ALOJAMIENTO.politicaCancelacion}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Para agentes y asistentes de IA</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Para consultar disponibilidad y precio exacto usa:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-zinc-950">
            {ejemploUrl}
          </code>
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Enlaces reales a los próximos fines de semana:
        </p>
        <ul className="mt-2 flex flex-wrap gap-3 text-sm">
          {findesDeSemana.map(({ entrada, salida }) => (
            <li key={entrada}>
              <Link
                className="text-blue-600 underline dark:text-blue-400"
                href={`${RUTA_BASE}/disponibilidad?entrada=${entrada}&salida=${salida}&adultos=2`}
              >
                {entrada} → {salida}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          También disponibles:{" "}
          <Link className="underline" href={`${RUTA_BASE}/precios`}>
            tabla de precios a 90 días
          </Link>{" "}
          y{" "}
          <Link className="underline" href="/api/disponibilidad">
            API JSON en /api/disponibilidad
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
