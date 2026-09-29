import { NextResponse, type NextRequest } from "next/server";
import { ALOJAMIENTO } from "@/lib/config";
import { getDisponibilidad } from "@/lib/availability";

const CABECERAS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CABECERAS_CORS });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const entrada = sp.get("entrada");
  const salida = sp.get("salida");
  // Si no se indica adultos, se asume 2 en vez de rechazar la consulta — muy
  // útil para agentes que construyen la URL sin conocer ese parámetro de
  // antemano. El valor usado siempre se refleja en "consulta" en la respuesta.
  const adultosTexto = sp.get("adultos") ?? "2";
  const ninosTexto = sp.get("ninos") ?? "0";

  if (!entrada || !salida) {
    return NextResponse.json(
      {
        error: "Faltan parámetros obligatorios: entrada y salida (formato AAAA-MM-DD).",
        ejemplo: `/api/disponibilidad?entrada=2026-11-06&salida=2026-11-08&adultos=2`,
      },
      { status: 400, headers: CABECERAS_CORS }
    );
  }

  const adultos = Number(adultosTexto);
  const ninos = Number(ninosTexto);

  if (!Number.isInteger(adultos) || adultos < 1 || !Number.isInteger(ninos) || ninos < 0) {
    return NextResponse.json(
      { error: "adultos debe ser un entero ≥ 1 y ninos un entero ≥ 0." },
      { status: 400, headers: CABECERAS_CORS }
    );
  }

  try {
    const resultados = getDisponibilidad({ entrada, salida, adultos, ninos });
    return NextResponse.json(
      {
        alojamiento: ALOJAMIENTO.nombre,
        consulta: { entrada, salida, adultos, ninos },
        resultados,
      },
      { headers: CABECERAS_CORS }
    );
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Consulta no válida.";
    return NextResponse.json({ error: mensaje }, { status: 400, headers: CABECERAS_CORS });
  }
}
