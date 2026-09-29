import {
  DESCUENTO_ESTANCIA_LARGA,
  HORIZONTE_RESERVAS_DIAS,
  IVA_ALOJAMIENTO,
  NOCHES_MINIMAS_ESTANCIA_LARGA,
  RECARGO_FIN_DE_SEMANA,
  RECARGO_TEMPORADA_ALTA,
  TIPOS_ALOJAMIENTO,
  type HabitacionId,
  type TipoAlojamiento,
} from "./config";
import { esFechaEnTemporadaAltaPorPuente } from "./holidays";

export type MotivoNoDisponible =
  | "completo"
  | "capacidad"
  | "estancia_minima";

export interface ConsultaDisponibilidad {
  entrada: string; // YYYY-MM-DD
  salida: string; // YYYY-MM-DD
  adultos: number;
  ninos?: number;
}

export interface DesgloseNoche {
  fecha: string;
  finDeSemana: boolean;
  temporadaAlta: boolean;
  precioBaseNoche: number;
}

export interface ResultadoDisponibilidad {
  habitacionId: HabitacionId;
  nombre: string;
  metrosCuadrados: number;
  capacidadMaxima: number;
  disponible: boolean;
  unidadesLibres: number;
  unidadesTotales: number;
  noches: number;
  desgloseNoches: DesgloseNoche[];
  subtotalSinIva: number;
  iva: number;
  porcentajeIva: number;
  descuentoEstanciaLarga: number;
  totalConIva: number;
  motivoNoDisponible?: MotivoNoDisponible;
}

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function parsearFechaUtc(fechaIso: string, etiqueta: string): number {
  if (!REGEX_FECHA.test(fechaIso)) {
    throw new Error(
      `${etiqueta} es inválida: "${fechaIso}". El formato esperado es AAAA-MM-DD.`
    );
  }
  const timestamp = Date.parse(`${fechaIso}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    throw new Error(
      `${etiqueta} es inválida: "${fechaIso}" no es una fecha real.`
    );
  }
  return timestamp;
}

function inicioDeHoyUtc(): number {
  const ahora = new Date();
  return Date.UTC(
    ahora.getUTCFullYear(),
    ahora.getUTCMonth(),
    ahora.getUTCDate()
  );
}

function sumarDias(timestampUtc: number, dias: number): number {
  return timestampUtc + dias * 24 * 60 * 60 * 1000;
}

function formatearFechaUtc(timestampUtc: number): string {
  return new Date(timestampUtc).toISOString().slice(0, 10);
}

function diaDeLaSemanaUtc(timestampUtc: number): number {
  return new Date(timestampUtc).getUTCDay(); // 0 = domingo, 5 = viernes, 6 = sábado
}

function esNocheDeFinDeSemana(timestampUtc: number): boolean {
  const dia = diaDeLaSemanaUtc(timestampUtc);
  return dia === 5 || dia === 6;
}

function esNocheDeTemporadaAlta(timestampUtc: number): boolean {
  const fechaIso = formatearFechaUtc(timestampUtc);
  const mes = new Date(timestampUtc).getUTCMonth(); // 0-indexado: 7 = agosto
  return mes === 7 || esFechaEnTemporadaAltaPorPuente(fechaIso);
}

/** Hash djb2, determinista: misma entrada siempre produce el mismo resultado. */
function hashDjb2(texto: string): number {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 33 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function cargaOcupacion(fechaIso: string, habitacionId: HabitacionId): number {
  const hash = hashDjb2(`${fechaIso}|${habitacionId}`);
  return (hash % 100000) / 100000; // valor en [0, 1)
}

/**
 * Unidades ocupadas para una noche y tipo de alojamiento dados, de forma
 * pseudoaleatoria pero determinista (misma fecha + habitación → mismo
 * resultado). Los fines de semana y la temporada alta tienen más carga.
 */
function unidadesOcupadas(
  fechaIso: string,
  timestampUtc: number,
  tipo: TipoAlojamiento
): number {
  const carga = cargaOcupacion(fechaIso, tipo.id);
  const altaDemanda =
    esNocheDeFinDeSemana(timestampUtc) || esNocheDeTemporadaAlta(timestampUtc);
  // Elevar la carga a una potencia mayor entre semana concentra los valores
  // altos (que llevan al completo) en una franja más pequeña: menos noches
  // completas entre semana que en fin de semana/temporada alta.
  const exponente = altaDemanda ? 1.15 : 2.6;
  const cargaAjustada = Math.pow(carga, exponente);
  return Math.min(
    tipo.unidadesTotales,
    Math.round(cargaAjustada * tipo.unidadesTotales)
  );
}

function precioNocheBase(timestampUtc: number, tipo: TipoAlojamiento): number {
  let precio = tipo.precioBaseNoche;
  if (esNocheDeFinDeSemana(timestampUtc)) {
    precio *= 1 + RECARGO_FIN_DE_SEMANA;
  }
  if (esNocheDeTemporadaAlta(timestampUtc)) {
    precio *= 1 + RECARGO_TEMPORADA_ALTA;
  }
  return precio;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function construirNoches(entradaUtc: number, salidaUtc: number): number[] {
  const noches: number[] = [];
  for (let t = entradaUtc; t < salidaUtc; t = sumarDias(t, 1)) {
    noches.push(t);
  }
  return noches;
}

function incluyeNocheDeSabado(noches: number[]): boolean {
  return noches.some((t) => diaDeLaSemanaUtc(t) === 6);
}

/** Fecha de hoy en formato ISO (UTC), para construir enlaces de ejemplo. */
export function hoyIso(): string {
  return formatearFechaUtc(inicioDeHoyUtc());
}

/** Suma (o resta) días a una fecha ISO y devuelve el resultado en ISO. */
export function sumarDiasIso(fechaIso: string, dias: number): string {
  const t = parsearFechaUtc(fechaIso, "La fecha");
  return formatearFechaUtc(sumarDias(t, dias));
}

/**
 * Próximos `cantidad` fines de semana (viernes → domingo, 2 noches), para
 * construir enlaces de ejemplo reales en la ficha, el sitemap y `/llms.txt`.
 */
export function proximosFinesDeSemana(
  cantidad: number
): { entrada: string; salida: string }[] {
  const hoyUtc = inicioDeHoyUtc();
  const diaSemana = diaDeLaSemanaUtc(hoyUtc);
  const primerViernesUtc = sumarDias(hoyUtc, (5 - diaSemana + 7) % 7);
  return Array.from({ length: cantidad }, (_, i) => {
    const entradaUtc = sumarDias(primerViernesUtc, i * 7);
    const salidaUtc = sumarDias(entradaUtc, 2);
    return {
      entrada: formatearFechaUtc(entradaUtc),
      salida: formatearFechaUtc(salidaUtc),
    };
  });
}

export interface PrecioNocheCalendario {
  fecha: string;
  finDeSemana: boolean;
  temporadaAlta: boolean;
  precioNocheSinIva: number;
  iva: number;
  precioNocheConIva: number;
  disponible: boolean;
  unidadesLibres: number;
  unidadesTotales: number;
}

export interface CalendarioPreciosTipo {
  habitacionId: HabitacionId;
  nombre: string;
  dias: PrecioNocheCalendario[];
}

/**
 * Calendario de precio y disponibilidad por noche (no por estancia) para los
 * próximos `dias` días, pensado para la página `/precios` (Fase 2): a
 * diferencia de `getDisponibilidad`, no aplica reglas de estancia (mínima
 * de noches, descuento por estancia larga), solo precio y stock de esa noche
 * concreta. Reutiliza las mismas reglas de precio y ocupación que
 * `getDisponibilidad` para no duplicar lógica.
 */
export function getCalendarioPrecios(dias = 90): CalendarioPreciosTipo[] {
  const hoyUtc = inicioDeHoyUtc();
  const fechasUtc = Array.from({ length: dias }, (_, i) => sumarDias(hoyUtc, i));

  return TIPOS_ALOJAMIENTO.map((tipo) => ({
    habitacionId: tipo.id,
    nombre: tipo.nombre,
    dias: fechasUtc.map((t) => {
      const fechaIso = formatearFechaUtc(t);
      const precioNocheSinIva = redondear(precioNocheBase(t, tipo));
      const iva = redondear(precioNocheSinIva * IVA_ALOJAMIENTO);
      const unidadesLibres =
        tipo.unidadesTotales - unidadesOcupadas(fechaIso, t, tipo);
      return {
        fecha: fechaIso,
        finDeSemana: esNocheDeFinDeSemana(t),
        temporadaAlta: esNocheDeTemporadaAlta(t),
        precioNocheSinIva,
        iva,
        precioNocheConIva: redondear(precioNocheSinIva + iva),
        disponible: unidadesLibres > 0,
        unidadesLibres: Math.max(0, unidadesLibres),
        unidadesTotales: tipo.unidadesTotales,
      };
    }),
  }));
}

/**
 * Fuente única de verdad de disponibilidad y precios: la usan la web, la API
 * REST (/api/disponibilidad) y, más adelante, el servidor MCP.
 *
 * Lanza un Error con mensaje explicativo ante parámetros de entrada
 * inválidos (fechas mal formadas, en el pasado, fuera de orden o fuera del
 * horizonte de reservas). La disponibilidad por tipo de alojamiento
 * (completo, estancia mínima, capacidad) se devuelve como datos, no como
 * excepción.
 */
export function getDisponibilidad(
  consulta: ConsultaDisponibilidad
): ResultadoDisponibilidad[] {
  const { entrada, salida, adultos, ninos = 0 } = consulta;

  if (!Number.isInteger(adultos) || adultos < 1) {
    throw new Error("El número de adultos debe ser un entero mayor o igual a 1.");
  }
  if (!Number.isInteger(ninos) || ninos < 0) {
    throw new Error("El número de niños debe ser un entero mayor o igual a 0.");
  }

  const entradaUtc = parsearFechaUtc(entrada, "La fecha de entrada");
  const salidaUtc = parsearFechaUtc(salida, "La fecha de salida");
  const hoyUtc = inicioDeHoyUtc();
  const horizonteUtc = sumarDias(hoyUtc, HORIZONTE_RESERVAS_DIAS);

  if (entradaUtc < hoyUtc) {
    throw new Error(
      `La fecha de entrada (${entrada}) ya ha pasado. Elige una fecha a partir de hoy.`
    );
  }
  if (salidaUtc <= entradaUtc) {
    throw new Error(
      `La fecha de salida (${salida}) debe ser posterior a la fecha de entrada (${entrada}).`
    );
  }
  if (entradaUtc > horizonteUtc) {
    throw new Error(
      `Solo se admiten reservas dentro de los próximos ${HORIZONTE_RESERVAS_DIAS} días. La fecha de entrada (${entrada}) está fuera de ese horizonte.`
    );
  }

  const noches = construirNoches(entradaUtc, salidaUtc);
  const numeroNoches = noches.length;
  const estanciaIncluyeSabado = incluyeNocheDeSabado(noches);
  const estanciaMinimaRequerida = estanciaIncluyeSabado ? 2 : 1;
  const cumpleEstanciaMinima = numeroNoches >= estanciaMinimaRequerida;
  const personasTotales = adultos + ninos;

  return TIPOS_ALOJAMIENTO.map((tipo) => {
    const desgloseNoches: DesgloseNoche[] = noches.map((t) => ({
      fecha: formatearFechaUtc(t),
      finDeSemana: esNocheDeFinDeSemana(t),
      temporadaAlta: esNocheDeTemporadaAlta(t),
      precioBaseNoche: redondear(precioNocheBase(t, tipo)),
    }));

    const subtotalSinIva = redondear(
      desgloseNoches.reduce((acc, n) => acc + n.precioBaseNoche, 0)
    );

    const minimoUnidadesLibres = Math.min(
      ...noches.map(
        (t) =>
          tipo.unidadesTotales -
          unidadesOcupadas(formatearFechaUtc(t), t, tipo)
      )
    );

    const cumpleCapacidad = personasTotales <= tipo.capacidadMaxima;
    const hayStock = minimoUnidadesLibres > 0;
    const disponible = hayStock && cumpleCapacidad && cumpleEstanciaMinima;

    let motivoNoDisponible: MotivoNoDisponible | undefined;
    if (!cumpleCapacidad) {
      motivoNoDisponible = "capacidad";
    } else if (!cumpleEstanciaMinima) {
      motivoNoDisponible = "estancia_minima";
    } else if (!hayStock) {
      motivoNoDisponible = "completo";
    }

    const aplicaDescuento = numeroNoches >= NOCHES_MINIMAS_ESTANCIA_LARGA;
    const ivaSinDescuento = redondear(subtotalSinIva * IVA_ALOJAMIENTO);
    const totalSinDescuento = redondear(subtotalSinIva + ivaSinDescuento);
    const descuentoEstanciaLarga = aplicaDescuento
      ? redondear(totalSinDescuento * DESCUENTO_ESTANCIA_LARGA)
      : 0;
    const totalConIva = redondear(totalSinDescuento - descuentoEstanciaLarga);

    return {
      habitacionId: tipo.id,
      nombre: tipo.nombre,
      metrosCuadrados: tipo.metrosCuadrados,
      capacidadMaxima: tipo.capacidadMaxima,
      disponible,
      unidadesLibres: Math.max(0, minimoUnidadesLibres),
      unidadesTotales: tipo.unidadesTotales,
      noches: numeroNoches,
      desgloseNoches,
      subtotalSinIva,
      iva: ivaSinDescuento,
      porcentajeIva: IVA_ALOJAMIENTO * 100,
      descuentoEstanciaLarga,
      totalConIva,
      motivoNoDisponible,
    };
  });
}
