import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALOJAMIENTO } from "@/lib/config";
import {
  getDisponibilidad,
  hoyIso,
  sumarDiasIso,
  type ResultadoDisponibilidad,
} from "@/lib/availability";
import { jsonLdOfertas } from "@/lib/jsonld";
import { JsonLd } from "@/app/_components/JsonLd";

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;
const RUTA_DISPONIBILIDAD = `${RUTA_BASE}/disponibilidad`;
const ADULTOS_POR_DEFECTO = 2;

type BusquedaParams = Promise<{ [clave: string]: string | string[] | undefined }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Si no se indica `adultos` (muy habitual cuando un agente construye la URL
 * él mismo, sin partir de uno de los enlaces de ejemplo), se asume un valor
 * razonable en vez de bloquear la consulta con el formulario — así no hace
 * falta que el agente conozca de antemano ese parámetro para obtener un
 * precio real.
 */
function adultosConDefecto(adultosTexto: string | undefined): {
  valor: string;
  asumido: boolean;
} {
  if (adultosTexto) return { valor: adultosTexto, asumido: false };
  return { valor: String(ADULTOS_POR_DEFECTO), asumido: true };
}

/** URL con query normalizada (orden fijo), para un canonical autorreferente. */
function construirRutaCanonica(
  entrada?: string,
  salida?: string,
  adultos?: string,
  ninos?: string
): string | undefined {
  if (!entrada || !salida || !adultos) return undefined;
  const query = new URLSearchParams({ entrada, salida, adultos });
  if (ninos && ninos !== "0") query.set("ninos", ninos);
  return `${RUTA_DISPONIBILIDAD}?${query.toString()}`;
}

export function generateStaticParams() {
  return [{ slug: ALOJAMIENTO.slug }];
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
  const { valor: adultos } = adultosConDefecto(primerValor(sp.adultos));
  const ninos = primerValor(sp.ninos);
  const fechas = entrada && salida ? ` ${entrada} → ${salida}` : "";
  const titulo = `Disponibilidad${fechas}`;
  const descripcion = `Disponibilidad y precios de ${ALOJAMIENTO.nombre}${fechas}.`;
  // Cada combinación de fechas es una URL distinta y con contenido propio
  // (precio y disponibilidad reales), pensada para que un agente la visite
  // directamente. El canonical autorreferente (con la misma query,
  // normalizada, y con `adultos` siempre explícito aunque no se haya pasado)
  // evita que buscadores la traten como duplicado de la versión sin
  // parámetros en vez de ocultarla.
  const canonical = construirRutaCanonica(entrada, salida, adultos, ninos);
  return {
    title: titulo,
    description: descripcion,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${titulo} · ${ALOJAMIENTO.nombre}`,
      description: descripcion,
      url: canonical ?? RUTA_DISPONIBILIDAD,
    },
  };
}

function FormularioBusqueda({
  entrada,
  salida,
  adultos,
  ninos,
}: {
  entrada?: string;
  salida?: string;
  adultos?: string;
  ninos?: string;
}) {
  const hoy = hoyIso();
  return (
    <form method="get" className="flex flex-wrap items-end gap-4 text-sm">
      <label className="flex flex-col gap-1">
        Entrada
        <input
          type="date"
          name="entrada"
          defaultValue={entrada ?? hoy}
          min={hoy}
          required
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Salida
        <input
          type="date"
          name="salida"
          defaultValue={salida ?? sumarDiasIso(hoy, 2)}
          min={hoy}
          required
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Adultos
        <input
          type="number"
          name="adultos"
          min={1}
          defaultValue={adultos ?? "2"}
          required
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Niños
        <input
          type="number"
          name="ninos"
          min={0}
          defaultValue={ninos ?? "0"}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Consultar
      </button>
    </form>
  );
}

function MensajeExplicativo({
  titulo,
  mensaje,
  entrada,
  salida,
  adultos,
  ninos,
}: {
  titulo: string;
  mensaje: string;
  entrada?: string;
  salida?: string;
  adultos?: string;
  ninos?: string;
}) {
  const hoy = hoyIso();
  const ejemploEntrada = sumarDiasIso(hoy, 7);
  const ejemploSalida = sumarDiasIso(hoy, 9);
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-medium">{titulo}</p>
        <p className="mt-1">{mensaje}</p>
      </div>
      <FormularioBusqueda
        entrada={entrada}
        salida={salida}
        adultos={adultos}
        ninos={ninos}
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ejemplo de URL válida:{" "}
        <Link
          className="text-blue-600 underline dark:text-blue-400"
          href={`${RUTA_BASE}/disponibilidad?entrada=${ejemploEntrada}&salida=${ejemploSalida}&adultos=2`}
        >
          {RUTA_BASE}/disponibilidad?entrada={ejemploEntrada}&salida=
          {ejemploSalida}&adultos=2
        </Link>
      </p>
    </div>
  );
}

const NOMBRES_MOTIVO: Record<string, string> = {
  completo: "Completo en esas fechas",
  capacidad: "Supera la capacidad máxima",
  estancia_minima: "No cumple la estancia mínima (2 noches si incluye sábado)",
};

function TablaResultados({
  resultados,
  entrada,
  salida,
  adultos,
  ninos,
}: {
  resultados: ResultadoDisponibilidad[];
  entrada: string;
  salida: string;
  adultos: string;
  ninos: string;
}) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="mb-3 text-left text-zinc-600 dark:text-zinc-400">
        {resultados[0]?.noches ?? 0} noche(s), del {entrada} al {salida}, para{" "}
        {adultos} adulto(s)
        {Number(ninos) > 0 ? ` y ${ninos} niño(s)` : ""}.
      </caption>
      <thead>
        <tr className="border-b border-zinc-300 dark:border-zinc-700">
          <th className="py-2 pr-4">Alojamiento</th>
          <th className="py-2 pr-4">Disponible</th>
          <th className="py-2 pr-4">Unidades</th>
          <th className="py-2 pr-4">Precio/noche medio</th>
          <th className="py-2 pr-4">Total con IVA</th>
          <th className="py-2 pr-4">Motivo</th>
          <th className="py-2">Reserva</th>
        </tr>
      </thead>
      <tbody>
        {resultados.map((r) => {
          const precioMedioNoche = r.noches > 0 ? r.subtotalSinIva / r.noches : 0;
          return (
            <tr key={r.habitacionId} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="py-2 pr-4 font-medium">{r.nombre}</td>
              <td className="py-2 pr-4">{r.disponible ? "Sí" : "No"}</td>
              <td className="py-2 pr-4">
                {r.unidadesLibres} / {r.unidadesTotales}
              </td>
              <td className="py-2 pr-4">{precioMedioNoche.toFixed(2)} €</td>
              <td className="py-2 pr-4">{r.totalConIva.toFixed(2)} €</td>
              <td className="py-2 pr-4 text-zinc-500">
                {r.motivoNoDisponible ? NOMBRES_MOTIVO[r.motivoNoDisponible] : "—"}
              </td>
              <td className="py-2">
                {r.disponible ? (
                  <Link
                    className="rounded-full bg-zinc-900 px-4 py-1.5 text-white dark:bg-white dark:text-zinc-900"
                    href={`${RUTA_BASE}/disponibilidad/reserva?habitacion=${r.habitacionId}&entrada=${entrada}&salida=${salida}&adultos=${adultos}&ninos=${ninos}`}
                  >
                    Reservar
                  </Link>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function DisponibilidadPage({
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
  const { valor: adultosTexto, asumido: adultosAsumido } = adultosConDefecto(
    primerValor(sp.adultos)
  );
  const ninosTexto = primerValor(sp.ninos) ?? "0";

  const encabezado = (
    <h1 className="text-2xl font-semibold">
      Disponibilidad en {ALOJAMIENTO.nombre}
      {entrada && salida ? ` — ${entrada} a ${salida}` : ""}
    </h1>
  );

  // entrada y salida no tienen un valor por defecto razonable (son las
  // fechas que se quieren consultar), así que siguen siendo obligatorias.
  if (!entrada || !salida) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        {encabezado}
        <MensajeExplicativo
          titulo="Faltan datos para consultar disponibilidad"
          mensaje="Indica fecha de entrada y fecha de salida (parámetros entrada y salida, en formato AAAA-MM-DD)."
          entrada={entrada}
          salida={salida}
          adultos={primerValor(sp.adultos)}
          ninos={ninosTexto}
        />
      </main>
    );
  }

  const adultos = Number(adultosTexto);
  const ninos = Number(ninosTexto);

  if (!Number.isInteger(adultos) || adultos < 1 || !Number.isInteger(ninos) || ninos < 0) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        {encabezado}
        <MensajeExplicativo
          titulo="Número de adultos o niños no válido"
          mensaje="adultos debe ser un entero ≥ 1 y ninos un entero ≥ 0."
          entrada={entrada}
          salida={salida}
          adultos={adultosTexto}
          ninos={ninosTexto}
        />
      </main>
    );
  }

  let resultados: ResultadoDisponibilidad[] | undefined;
  let mensajeError: string | undefined;
  try {
    resultados = getDisponibilidad({ entrada, salida, adultos, ninos });
  } catch (error) {
    mensajeError = error instanceof Error ? error.message : "Fechas no válidas.";
  }

  if (mensajeError || !resultados) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        {encabezado}
        <MensajeExplicativo
          titulo="No se puede consultar esa combinación de fechas"
          mensaje={mensajeError ?? "Fechas no válidas."}
          entrada={entrada}
          salida={salida}
          adultos={adultosTexto}
          ninos={ninosTexto}
        />
      </main>
    );
  }

  const rutaCanonica =
    construirRutaCanonica(entrada, salida, adultosTexto, ninosTexto) ??
    RUTA_DISPONIBILIDAD;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <JsonLd
        data={jsonLdOfertas({
          entrada,
          salida,
          resultados,
          urlPagina: `${ALOJAMIENTO.dominio}${rutaCanonica}`,
        })}
      />
      {encabezado}
      {adultosAsumido && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No se indicó el número de adultos, así que se han asumido{" "}
          {ADULTOS_POR_DEFECTO}. Añade <code>adultos=N</code> en la URL para un
          número distinto.
        </p>
      )}
      <TablaResultados
        resultados={resultados}
        entrada={entrada}
        salida={salida}
        adultos={adultosTexto}
        ninos={ninosTexto}
      />
      <details className="text-sm text-zinc-600 dark:text-zinc-400">
        <summary className="cursor-pointer">Cambiar la búsqueda</summary>
        <div className="mt-3">
          <FormularioBusqueda
            entrada={entrada}
            salida={salida}
            adultos={adultosTexto}
            ninos={ninosTexto}
          />
        </div>
      </details>
    </main>
  );
}
