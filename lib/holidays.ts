/**
 * Semana Santa y puentes nacionales de España, en rangos de fechas fijos.
 * Cubren 2026 y 2027 (suficiente para el horizonte de reservas de 365 días).
 * Agosto se trata aparte (por mes, no como rango) en `availability.ts`.
 */

interface RangoFestivo {
  nombre: string;
  inicio: string; // YYYY-MM-DD, inclusive
  fin: string; // YYYY-MM-DD, inclusive
}

export const RANGOS_TEMPORADA_ALTA: RangoFestivo[] = [
  // Semana Santa 2026 (Domingo de Ramos 29 marzo, Pascua 5 abril)
  { nombre: "Semana Santa 2026", inicio: "2026-03-28", fin: "2026-04-05" },
  // Puente de la Constitución/Inmaculada 2026 (Dom 6 dic, Mar 8 dic)
  { nombre: "Puente de diciembre 2026", inicio: "2026-12-04", fin: "2026-12-08" },
  // Semana Santa 2027 (Domingo de Ramos 21 marzo, Pascua 28 marzo)
  { nombre: "Semana Santa 2027", inicio: "2027-03-20", fin: "2027-03-28" },
];

function aFechaUTC(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function esFechaEnTemporadaAltaPorPuente(fechaIso: string): boolean {
  const t = aFechaUTC(fechaIso);
  return RANGOS_TEMPORADA_ALTA.some(
    (r) => t >= aFechaUTC(r.inicio) && t <= aFechaUTC(r.fin)
  );
}
