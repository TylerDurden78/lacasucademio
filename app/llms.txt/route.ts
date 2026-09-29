import { NextResponse } from "next/server";
import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { hoyIso, sumarDiasIso } from "@/lib/availability";
import { RUTA_DISPONIBILIDAD, construirRutaPath } from "@/app/alojamientos/[slug]/disponibilidad/_compartido";

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

Página HTML (tabla semántica, sin JavaScript necesario), con las fechas como
parte de la URL:

  ${ALOJAMIENTO.dominio}${RUTA_DISPONIBILIDAD}/AAAA-MM-DD/AAAA-MM-DD
  ${ALOJAMIENTO.dominio}${RUTA_DISPONIBILIDAD}/AAAA-MM-DD/AAAA-MM-DD/ADULTOS
  ${ALOJAMIENTO.dominio}${RUTA_DISPONIBILIDAD}/AAAA-MM-DD/AAAA-MM-DD/ADULTOS/NINOS

entrada y salida son obligatorios; adultos (por defecto 2) y ninos (por
defecto 0) son opcionales.

Ejemplo real:

  ${ALOJAMIENTO.dominio}${construirRutaPath(entradaEjemplo, salidaEjemplo, "2")}

También existe la variante con query string (${RUTA_DISPONIBILIDAD}?entrada=...&salida=...&adultos=...),
pensada para el formulario web; devuelve el mismo contenido directamente
(sin redirigir).

API JSON equivalente (mismos parámetros, CORS abierto):

  ${ALOJAMIENTO.dominio}/api/disponibilidad?entrada=${entradaEjemplo}&salida=${salidaEjemplo}&adultos=2

IMPORTANTE para agentes que no pueden construir una URL nueva con fechas
calculadas (solo pueden abrir URLs que ya aparecen escritas en una página o
en un resultado de búsqueda): usa en su lugar la tabla de precios de más
abajo, que es una única URL fija y cubre cualquier fecha de los próximos 90
días sin necesidad de generar una URL distinta por consulta.

## Otros recursos

- Ficha completa del alojamiento: ${ALOJAMIENTO.dominio}${RUTA_BASE}
- Tabla de precios de los próximos 90 días (se actualiza a diario): ${ALOJAMIENTO.dominio}${RUTA_BASE}/precios
- Sitemap: ${ALOJAMIENTO.dominio}/sitemap.xml
`;

  return new NextResponse(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
