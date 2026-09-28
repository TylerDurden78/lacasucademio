import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "@/lib/config";
import { getDisponibilidad } from "@/lib/availability";
import { permitirPeticionMcp } from "@/lib/rate-limit";

const RUTA_DISPONIBILIDAD = `/alojamientos/${ALOJAMIENTO.slug}/disponibilidad`;
const IDS_HABITACION = TIPOS_ALOJAMIENTO.map((t) => t.id) as [string, ...string[]];
const DESCRIPCION_IDS = TIPOS_ALOJAMIENTO.map((t) => `"${t.id}" (${t.nombre})`).join(
  ", "
);

const ESQUEMA_BUSQUEDA = z.object({
  entrada: z.string().describe("Fecha de entrada, formato AAAA-MM-DD"),
  salida: z.string().describe("Fecha de salida, formato AAAA-MM-DD"),
  adultos: z.number().int().min(1).describe("Número de adultos"),
  ninos: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Número de niños (opcional, por defecto 0)"),
});

const ESQUEMA_HABITACION = ESQUEMA_BUSQUEDA.extend({
  habitacion_id: z
    .enum(IDS_HABITACION)
    .describe(`Identificador del tipo de alojamiento: ${DESCRIPCION_IDS}`),
});

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "Fechas no válidas.";
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "buscar_disponibilidad",
      {
        title: "Buscar disponibilidad",
        description:
          `Consulta la disponibilidad y el precio de los 4 tipos de alojamiento de ` +
          `${ALOJAMIENTO.nombre} (casa rural en ${ALOJAMIENTO.localidad}, ${ALOJAMIENTO.comarca}) ` +
          `para un rango de fechas y número de huéspedes. Úsala ante preguntas como ` +
          `"¿qué disponibilidad tiene ${ALOJAMIENTO.nombre} el próximo fin de semana?" o ` +
          `"¿cuánto cuesta una semana en agosto?". Las fechas van en formato AAAA-MM-DD; ` +
          `la estancia mínima es de 2 noches si incluye la noche del sábado. Devuelve, ` +
          `por cada tipo de alojamiento, si está disponible, unidades libres y precio ` +
          `total con IVA incluido.`,
        inputSchema: ESQUEMA_BUSQUEDA,
      },
      async ({ entrada, salida, adultos, ninos }) => {
        try {
          const resultados = getDisponibilidad({ entrada, salida, adultos, ninos });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    alojamiento: ALOJAMIENTO.nombre,
                    consulta: { entrada, salida, adultos, ninos: ninos ?? 0 },
                    resultados,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return { isError: true, content: [{ type: "text", text: mensajeError(error) }] };
        }
      }
    );

    server.registerTool(
      "cotizar",
      {
        title: "Cotizar un alojamiento",
        description:
          `Calcula el precio detallado (desglose por noche, recargos de fin de semana y ` +
          `temporada alta, IVA y descuento por estancia larga) de UN tipo de alojamiento ` +
          `concreto de ${ALOJAMIENTO.nombre} para unas fechas y un número de huéspedes. ` +
          `Úsala cuando ya se sabe qué alojamiento interesa y se quiere el desglose exacto ` +
          `del precio, no solo la disponibilidad general. habitacion_id debe ser uno de: ` +
          `${DESCRIPCION_IDS}.`,
        inputSchema: ESQUEMA_HABITACION,
      },
      async ({ habitacion_id, entrada, salida, adultos, ninos }) => {
        try {
          const resultado = getDisponibilidad({ entrada, salida, adultos, ninos }).find(
            (r) => r.habitacionId === habitacion_id
          );
          if (!resultado) {
            return {
              isError: true,
              content: [{ type: "text", text: `No existe el alojamiento "${habitacion_id}".` }],
            };
          }
          return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
        } catch (error) {
          return { isError: true, content: [{ type: "text", text: mensajeError(error) }] };
        }
      }
    );

    server.registerTool(
      "crear_enlace_reserva",
      {
        title: "Crear enlace de reserva",
        description:
          `Genera el enlace real a la página de reserva de ${ALOJAMIENTO.nombre} con el ` +
          `alojamiento y las fechas ya precargados, para que la persona solo tenga que ` +
          `confirmar. IMPORTANTE: este sitio es una demostración — el enlace lleva a una ` +
          `reserva SIMULADA, no se realiza ningún cargo real. habitacion_id debe ser uno ` +
          `de: ${DESCRIPCION_IDS}.`,
        inputSchema: ESQUEMA_HABITACION,
      },
      async ({ habitacion_id, entrada, salida, adultos, ninos }) => {
        const query = new URLSearchParams({
          habitacion: habitacion_id,
          entrada,
          salida,
          adultos: String(adultos),
          ninos: String(ninos ?? 0),
        });
        const url = `${ALOJAMIENTO.dominio}${RUTA_DISPONIBILIDAD}/reserva?${query.toString()}`;
        return { content: [{ type: "text", text: url }] };
      }
    );
  },
  {
    serverInfo: { name: "casuca-mio-disponibilidad", version: "1.0.0" },
  }
);

function obtenerIdentificador(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "anonimo";
}

async function handler(request: Request): Promise<Response> {
  const permitido = await permitirPeticionMcp(obtenerIdentificador(request));
  if (!permitido) {
    return new Response(
      JSON.stringify({ error: "Límite de peticiones del MCP excedido. Inténtalo de nuevo en un minuto." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  return mcpHandler(request);
}

export { handler as GET, handler as POST };
