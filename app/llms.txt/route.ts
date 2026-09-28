import { NextResponse } from "next/server";
import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { hoyIso, sumarDiasIso } from "@/lib/availability";

export const revalidate = 86400; // regeneración diaria

const RUTA_BASE = `/alojamientos/${ALOJAMIENTO.slug}`;

export async function GET() {
  const hoy = hoyIso();
  const entradaEjemplo = sumarDiasIso(hoy, 7);
  const salidaEjemplo = sumarDiasIso(hoy, 9);

  const lineasHabitaciones = TIPOS_ALOJAMIENTO.map(
    (t) =>
      `- ${t.nombre} (${t.id}): ${t.metrosCuadrados} m², hasta ${t.capacidadMaxima} personas, desde ${t.precioBaseNoche} €/noche + IVA. ${t.descripcionCorta}`
  ).join("\n");

  const texto = `# ${ALOJAMIENTO.nombre}

> ${ALOJAMIENTO.descripcionCorta}
> ${ALOJAMIENTO.avisoDemo}

Ubicación: ${ALOJAMIENTO.direccion}, ${ALOJAMIENTO.comarca}, ${ALOJAMIENTO.provincia} (${ALOJAMIENTO.pais}).
Check-in: ${ALOJAMIENTO.checkIn} · Check-out: ${ALOJAMIENTO.checkOut}
Cancelación: ${ALOJAMIENTO.politicaCancelacion}

## Alojamientos

${lineasHabitaciones}

## Cómo consultar disponibilidad y precio real

Página HTML (tabla semántica, sin JavaScript necesario):

  ${ALOJAMIENTO.dominio}${RUTA_BASE}/disponibilidad?entrada=AAAA-MM-DD&salida=AAAA-MM-DD&adultos=N&ninos=N

Ejemplo real:

  ${ALOJAMIENTO.dominio}${RUTA_BASE}/disponibilidad?entrada=${entradaEjemplo}&salida=${salidaEjemplo}&adultos=2

API JSON equivalente (mismos parámetros, CORS abierto):

  ${ALOJAMIENTO.dominio}/api/disponibilidad?entrada=${entradaEjemplo}&salida=${salidaEjemplo}&adultos=2

## Otros recursos

- Ficha completa del alojamiento: ${ALOJAMIENTO.dominio}${RUTA_BASE}
- Tabla de precios de los próximos 90 días (se actualiza a diario): ${ALOJAMIENTO.dominio}${RUTA_BASE}/precios
- Sitemap: ${ALOJAMIENTO.dominio}/sitemap.xml
`;

  return new NextResponse(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
