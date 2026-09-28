/**
 * Datos fijos del alojamiento ficticio. Todo el contenido (nombre, dirección,
 * habitaciones) se usa tanto en las páginas como en el JSON-LD y en el MCP,
 * así que vive en un único sitio.
 */

export const ALOJAMIENTO = {
  nombre: "La Casuca de Mio",
  slug: "casuca-mio",
  descripcionCorta:
    "Casa rural en Piedracorva, en plena Sierra de Gredos (Ávila), con habitaciones, suite con chimenea y casa completa.",
  localidad: "Piedracorva",
  provincia: "Ávila",
  comarca: "Sierra de Gredos",
  pais: "España",
  calle: "Camino de la Casuca, 4",
  codigoPostal: "05635",
  direccion: "Camino de la Casuca, 4, 05635 Piedracorva (Ávila)",
  geo: { lat: 40.2667, lng: -5.15 },
  dominio: "https://lacasucademio.es",
  moneda: "EUR",
  zonaHoraria: "Europe/Madrid",
  checkIn: "16:00",
  checkOut: "11:00",
  politicaCancelacion:
    "Cancelación gratuita hasta 7 días antes de la entrada. Fuera de ese plazo, se retiene el 50% del importe total.",
  avisoDemo: "Sitio de demostración. No se aceptan reservas reales.",
} as const;

export const SERVICIOS: string[] = [
  "Wifi de alta velocidad en todo el alojamiento",
  "Desayuno casero incluido",
  "Parking privado gratuito",
  "Chimenea de leña (suite y zonas comunes)",
  "Jardín y terraza con vistas al valle",
  "Mascotas admitidas bajo consulta previa",
  "Calefacción central",
  "Sábanas y toallas incluidas",
];

export type HabitacionId =
  | "doble"
  | "doble-superior"
  | "suite-chimenea"
  | "casa-completa";

export interface TipoAlojamiento {
  id: HabitacionId;
  nombre: string;
  descripcionCorta: string;
  metrosCuadrados: number;
  capacidadMaxima: number;
  precioBaseNoche: number;
  unidadesTotales: number;
}

export const TIPOS_ALOJAMIENTO: TipoAlojamiento[] = [
  {
    id: "doble",
    nombre: "Habitación Doble",
    descripcionCorta:
      "Habitación acogedora con cama de matrimonio, baño privado y vistas al valle.",
    metrosCuadrados: 22,
    capacidadMaxima: 2,
    precioBaseNoche: 85,
    unidadesTotales: 3,
  },
  {
    id: "doble-superior",
    nombre: "Habitación Doble Superior",
    descripcionCorta:
      "Habitación más amplia con zona de estar, cama supletoria opcional y terraza privada.",
    metrosCuadrados: 28,
    capacidadMaxima: 3,
    precioBaseNoche: 105,
    unidadesTotales: 2,
  },
  {
    id: "suite-chimenea",
    nombre: "Suite con Chimenea",
    descripcionCorta:
      "Suite con chimenea de leña, bañera de hidromasaje y balcón orientado al valle.",
    metrosCuadrados: 35,
    capacidadMaxima: 3,
    precioBaseNoche: 150,
    unidadesTotales: 1,
  },
  {
    id: "casa-completa",
    nombre: "Casa Completa",
    descripcionCorta:
      "La casa entera en alquiler exclusivo: 3 dormitorios, cocina completa, jardín y barbacoa.",
    metrosCuadrados: 120,
    capacidadMaxima: 6,
    precioBaseNoche: 320,
    unidadesTotales: 1,
  },
];

export const IVA_ALOJAMIENTO = 0.1;
export const RECARGO_FIN_DE_SEMANA = 0.25;
export const RECARGO_TEMPORADA_ALTA = 0.4;
export const DESCUENTO_ESTANCIA_LARGA = 0.1;
export const NOCHES_MINIMAS_ESTANCIA_LARGA = 5;
export const HORIZONTE_RESERVAS_DIAS = 365;
