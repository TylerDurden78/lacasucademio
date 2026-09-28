import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { getDisponibilidad } from "@/lib/availability";

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;

type BusquedaParams = Promise<{ [clave: string]: string | string[] | undefined }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function generateStaticParams() {
  return [{ slug: ALOJAMIENTO.slug }];
}

export const metadata: Metadata = {
  title: "Reserva simulada",
  robots: { index: false, follow: true },
};

function codigoSimulado(texto: string): string {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return `DEMO-${hash.toString(36).toUpperCase().slice(0, 6)}`;
}

function PaginaConAviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      {children}
      <Link className="text-sm text-blue-600 underline dark:text-blue-400" href={`${RUTA_BASE}/disponibilidad`}>
        ← Volver a disponibilidad
      </Link>
    </main>
  );
}

export default async function ReservaSimuladaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: BusquedaParams;
}) {
  const { slug } = await params;
  if (slug !== ALOJAMIENTO.slug) notFound();

  const sp = await searchParams;
  const habitacionId = primerValor(sp.habitacion);
  const entrada = primerValor(sp.entrada);
  const salida = primerValor(sp.salida);
  const adultosTexto = primerValor(sp.adultos);
  const ninosTexto = primerValor(sp.ninos) ?? "0";

  const tipo = TIPOS_ALOJAMIENTO.find((t) => t.id === habitacionId);

  if (!tipo || !entrada || !salida || !adultosTexto) {
    return (
      <PaginaConAviso titulo="Faltan datos para la reserva">
        <p className="text-zinc-600 dark:text-zinc-400">
          No se ha indicado un alojamiento y unas fechas válidas. Vuelve a
          disponibilidad y elige &quot;Reservar&quot; sobre una habitación disponible.
        </p>
      </PaginaConAviso>
    );
  }

  const adultos = Number(adultosTexto);
  const ninos = Number(ninosTexto);

  let resultado;
  let mensajeError: string | undefined;
  try {
    resultado = getDisponibilidad({ entrada, salida, adultos, ninos }).find(
      (r) => r.habitacionId === tipo.id
    );
  } catch (error) {
    mensajeError = error instanceof Error ? error.message : "Fechas no válidas.";
  }

  if (mensajeError) {
    return (
      <PaginaConAviso titulo="No se puede simular esta reserva">
        <p className="text-zinc-600 dark:text-zinc-400">{mensajeError}</p>
      </PaginaConAviso>
    );
  }

  if (!resultado || !resultado.disponible) {
    return (
      <PaginaConAviso titulo="Esta habitación ya no está disponible">
        <p className="text-zinc-600 dark:text-zinc-400">
          {tipo.nombre} no está disponible para {entrada} → {salida}. Elige otras
          fechas u otro tipo de alojamiento.
        </p>
      </PaginaConAviso>
    );
  }

  const codigo = codigoSimulado(`${tipo.id}|${entrada}|${salida}|${adultos}|${ninos}`);

  return (
    <PaginaConAviso titulo="Reserva simulada confirmada">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
        <p className="font-medium">
          Esta es una reserva de DEMOSTRACIÓN. No se ha realizado ningún cargo ni
          reserva real.
        </p>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <dt className="text-zinc-500">Código de reserva simulado</dt>
        <dd className="font-mono">{codigo}</dd>

        <dt className="text-zinc-500">Alojamiento</dt>
        <dd>{tipo.nombre}</dd>

        <dt className="text-zinc-500">Fechas</dt>
        <dd>
          {entrada} → {salida} ({resultado.noches} noche{resultado.noches === 1 ? "" : "s"})
        </dd>

        <dt className="text-zinc-500">Huéspedes</dt>
        <dd>
          {adultos} adulto{adultos === 1 ? "" : "s"}
          {ninos > 0 ? `, ${ninos} niño${ninos === 1 ? "" : "s"}` : ""}
        </dd>

        <dt className="text-zinc-500">Subtotal</dt>
        <dd>{resultado.subtotalSinIva.toFixed(2)} €</dd>

        <dt className="text-zinc-500">IVA ({resultado.porcentajeIva}%)</dt>
        <dd>{resultado.iva.toFixed(2)} €</dd>

        {resultado.descuentoEstanciaLarga > 0 && (
          <>
            <dt className="text-zinc-500">Descuento estancia larga</dt>
            <dd>−{resultado.descuentoEstanciaLarga.toFixed(2)} €</dd>
          </>
        )}

        <dt className="font-medium text-zinc-900 dark:text-zinc-100">Total</dt>
        <dd className="font-medium">{resultado.totalConIva.toFixed(2)} €</dd>
      </dl>
    </PaginaConAviso>
  );
}
