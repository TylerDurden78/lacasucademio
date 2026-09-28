import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALOJAMIENTO } from "@/lib/config";
import { IMAGENES } from "@/lib/images";
import { getCalendarioPrecios, hoyIso } from "@/lib/availability";

export const revalidate = 86400; // regeneración diaria

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;
const RUTA_PRECIOS = `${RUTA_BASE}/precios`;
const DIAS_CALENDARIO = 90;

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
  const descripcion = `Precio por noche y disponibilidad de ${ALOJAMIENTO.nombre} para los próximos ${DIAS_CALENDARIO} días.`;
  return {
    title: "Precios",
    description: descripcion,
    alternates: { canonical: RUTA_PRECIOS },
    openGraph: {
      title: `Precios · ${ALOJAMIENTO.nombre}`,
      description: descripcion,
      url: RUTA_PRECIOS,
      images: [{ url: IMAGENES.valle }],
    },
  };
}

export default async function PreciosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) notFound();

  const calendario = getCalendarioPrecios(DIAS_CALENDARIO);
  const fechas = calendario[0]?.dias.map((d) => d.fecha) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">
          Precios de {ALOJAMIENTO.nombre} — próximos {DIAS_CALENDARIO} días
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Precio por noche con IVA incluido y disponibilidad por tipo de
          alojamiento. Página actualizada el {hoyIso()} (se regenera cada 24 h).
          Para una estancia concreta, con reglas de estancia mínima y descuentos
          por estancia larga, usa{" "}
          <a className="underline" href={`${RUTA_BASE}/disponibilidad`}>
            /disponibilidad
          </a>
          .
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="sticky left-0 bg-white py-2 pr-4 dark:bg-zinc-950">
                Fecha
              </th>
              {calendario.map((tipo) => (
                <th key={tipo.habitacionId} className="py-2 pr-4">
                  {tipo.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fechas.map((fecha, i) => (
              <tr key={fecha} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="sticky left-0 bg-white py-1.5 pr-4 font-mono text-xs dark:bg-zinc-950">
                  {fecha}
                </td>
                {calendario.map((tipo) => {
                  const dia = tipo.dias[i];
                  return (
                    <td key={tipo.habitacionId} className="py-1.5 pr-4">
                      {dia.disponible ? (
                        `${dia.precioNocheConIva.toFixed(2)} €`
                      ) : (
                        <span className="text-zinc-400">Completo</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
