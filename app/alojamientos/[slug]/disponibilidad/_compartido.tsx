import Link from "next/link";
import { ALOJAMIENTO } from "@/lib/config";
import {
  getDisponibilidad,
  hoyIso,
  sumarDiasIso,
  type ResultadoDisponibilidad,
} from "@/lib/availability";
import { jsonLdOfertas } from "@/lib/jsonld";
import { JsonLd } from "@/app/_components/JsonLd";

export const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;
export const RUTA_DISPONIBILIDAD = `${RUTA_BASE}/disponibilidad`;
export const ADULTOS_POR_DEFECTO = 2;

/**
 * Si no se indica `adultos` (muy habitual cuando un agente construye la URL
 * él mismo, sin partir de uno de los enlaces de ejemplo), se asume un valor
 * razonable en vez de bloquear la consulta — así no hace falta que el agente
 * conozca de antemano ese parámetro para obtener un precio real.
 */
export function adultosConDefecto(adultosTexto: string | undefined): {
  valor: string;
  asumido: boolean;
} {
  if (adultosTexto) return { valor: adultosTexto, asumido: false };
  return { valor: String(ADULTOS_POR_DEFECTO), asumido: true };
}

/**
 * URL "limpia", con las fechas como segmentos de ruta en vez de query string
 * (`/disponibilidad/2026-10-06/2026-10-08/2`). Es el formato recomendado para
 * enlaces pensados para agentes: algunas herramientas de navegación (p. ej.
 * la de ChatGPT sin conector) rechazan abrir URLs con "?" que el propio
 * modelo se ha inventado, con el mensaje "is not accessible via this tool",
 * pero si abren sin problema una URL sin query string. El formulario GET
 * (que un navegador siempre envía como query string) se sigue aceptando en
 * `/disponibilidad` y redirige aquí.
 */
export function construirRutaPath(
  entrada: string,
  salida: string,
  adultos: string,
  ninos?: string
): string {
  const segmentos = [entrada, salida, adultos].map(encodeURIComponent);
  if (ninos && ninos !== "0") segmentos.push(encodeURIComponent(ninos));
  return `${RUTA_DISPONIBILIDAD}/${segmentos.join("/")}`;
}

export function FormularioBusqueda({
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
    // action apunta siempre a la ruta base: un envío GET añade el query
    // string ahí, y esa página (page.tsx) redirige a la URL "limpia".
    <form method="get" action={RUTA_DISPONIBILIDAD} className="flex flex-wrap items-end gap-4 text-sm">
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

export function MensajeExplicativo({
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
  const ejemploRuta = construirRutaPath(ejemploEntrada, ejemploSalida, "2");
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
        Ejemplo de URL válida: <Link className="text-blue-600 underline dark:text-blue-400" href={ejemploRuta}>{ejemploRuta}</Link>
      </p>
    </div>
  );
}

export const NOMBRES_MOTIVO: Record<string, string> = {
  completo: "Completo en esas fechas",
  capacidad: "Supera la capacidad máxima",
  estancia_minima: "No cumple la estancia mínima (2 noches si incluye sábado)",
};

export function TablaResultados({
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

/**
 * Todo el contenido de la página de disponibilidad (validación, mensajes de
 * error, tabla de resultados y JSON-LD), parametrizado por las 4 cadenas de
 * entrada — vengan de un query string (`page.tsx`, que redirige aquí) o de
 * segmentos de ruta (`[...fechas]/page.tsx`, la URL "limpia" y canónica).
 */
export async function ContenidoDisponibilidad({
  entrada,
  salida,
  adultosTextoOriginal,
  ninosTexto = "0",
}: {
  entrada?: string;
  salida?: string;
  adultosTextoOriginal?: string;
  ninosTexto?: string;
}) {
  const { valor: adultosTexto, asumido: adultosAsumido } =
    adultosConDefecto(adultosTextoOriginal);

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
      <>
        {encabezado}
        <MensajeExplicativo
          titulo="Faltan datos para consultar disponibilidad"
          mensaje="Indica fecha de entrada y fecha de salida."
          entrada={entrada}
          salida={salida}
          adultos={adultosTextoOriginal}
          ninos={ninosTexto}
        />
      </>
    );
  }

  const adultos = Number(adultosTexto);
  const ninos = Number(ninosTexto);

  if (!Number.isInteger(adultos) || adultos < 1 || !Number.isInteger(ninos) || ninos < 0) {
    return (
      <>
        {encabezado}
        <MensajeExplicativo
          titulo="Número de adultos o niños no válido"
          mensaje="adultos debe ser un entero ≥ 1 y ninos un entero ≥ 0."
          entrada={entrada}
          salida={salida}
          adultos={adultosTexto}
          ninos={ninosTexto}
        />
      </>
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
      <>
        {encabezado}
        <MensajeExplicativo
          titulo="No se puede consultar esa combinación de fechas"
          mensaje={mensajeError ?? "Fechas no válidas."}
          entrada={entrada}
          salida={salida}
          adultos={adultosTexto}
          ninos={ninosTexto}
        />
      </>
    );
  }

  const rutaCanonica = construirRutaPath(entrada, salida, adultosTexto, ninosTexto);

  return (
    <>
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
          {ADULTOS_POR_DEFECTO}.
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
    </>
  );
}
