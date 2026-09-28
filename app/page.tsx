import Link from "next/link";
import Image from "next/image";
import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { IMAGENES } from "@/lib/images";

const rutaFicha = `/alojamientos/${ALOJAMIENTO.slug}`;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative flex min-h-[420px] items-end overflow-hidden">
        <Image
          src={IMAGENES.portada}
          alt={`Vista exterior de ${ALOJAMIENTO.nombre}`}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-10 text-white">
          <h1 className="text-4xl font-semibold sm:text-5xl">{ALOJAMIENTO.nombre}</h1>
          <p className="mt-2 max-w-xl text-lg text-zinc-100">
            {ALOJAMIENTO.descripcionCorta}
          </p>
          <Link
            href={rutaFicha}
            className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Ver el alojamiento
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="text-2xl font-semibold">
          {ALOJAMIENTO.localidad}, {ALOJAMIENTO.comarca} ({ALOJAMIENTO.provincia})
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Cuatro formas de alojarte en plena naturaleza: dos tipos de habitación
          doble, una suite con chimenea y la casa completa para grupos. Consulta
          disponibilidad y precio exacto al instante, sin llamadas ni esperas.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {TIPOS_ALOJAMIENTO.map((tipo) => (
            <div
              key={tipo.id}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h3 className="font-medium">{tipo.nombre}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {tipo.descripcionCorta}
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                {tipo.metrosCuadrados} m² · hasta {tipo.capacidadMaxima} personas ·
                desde {tipo.precioBaseNoche} €/noche
              </p>
            </div>
          ))}
        </div>

        <Link
          href={rutaFicha}
          className="mt-10 inline-block rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Ver descripción completa, servicios y disponibilidad →
        </Link>
      </section>
    </main>
  );
}
