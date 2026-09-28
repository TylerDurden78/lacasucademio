/**
 * Constructores de JSON-LD (schema.org), pensados para que un agente que lea
 * el HTML crudo (sin ejecutar JS) pueda extraer precio y disponibilidad
 * estructurados. Reutilizan los datos de `config.ts` y los resultados ya
 * calculados por `availability.ts` — no recalculan precios aquí.
 */

import { ALOJAMIENTO, TIPOS_ALOJAMIENTO } from "./config";
import { IMAGENES } from "./images";
import type { ResultadoDisponibilidad } from "./availability";

const RUTA_FICHA = `/alojamientos/${ALOJAMIENTO.slug}`;
const URL_FICHA = `${ALOJAMIENTO.dominio}${RUTA_FICHA}`;
const ID_NEGOCIO = `${URL_FICHA}#negocio`;

function precioRango(): string {
  const precios = TIPOS_ALOJAMIENTO.map((t) => t.precioBaseNoche);
  return `${Math.min(...precios)}€ - ${Math.max(...precios)}€`;
}

/** JSON-LD `LodgingBusiness` para la ficha del alojamiento. */
export function jsonLdAlojamiento() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": ID_NEGOCIO,
    name: ALOJAMIENTO.nombre,
    description: ALOJAMIENTO.descripcionCorta,
    url: URL_FICHA,
    image: [IMAGENES.fachada, IMAGENES.portada, IMAGENES.valle],
    address: {
      "@type": "PostalAddress",
      streetAddress: ALOJAMIENTO.calle,
      postalCode: ALOJAMIENTO.codigoPostal,
      addressLocality: ALOJAMIENTO.localidad,
      addressRegion: ALOJAMIENTO.provincia,
      addressCountry: "ES",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: ALOJAMIENTO.geo.lat,
      longitude: ALOJAMIENTO.geo.lng,
    },
    checkinTime: ALOJAMIENTO.checkIn,
    checkoutTime: ALOJAMIENTO.checkOut,
    priceRange: precioRango(),
    currenciesAccepted: ALOJAMIENTO.moneda,
    containsPlace: TIPOS_ALOJAMIENTO.map((tipo) => ({
      "@type": "HotelRoom",
      name: tipo.nombre,
      description: tipo.descripcionCorta,
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: tipo.capacidadMaxima,
      },
      floorSize: {
        "@type": "QuantitativeValue",
        value: tipo.metrosCuadrados,
        unitCode: "MTK",
      },
    })),
  };
}

/**
 * JSON-LD `LodgingBusiness` (mismo `@id` que la ficha) con `makesOffer`: una
 * `Offer` por tipo de alojamiento para una búsqueda de disponibilidad
 * concreta. `resultados` viene de `getDisponibilidad`, ya calculado por la
 * página — aquí solo se traduce a schema.org.
 */
export function jsonLdOfertas({
  entrada,
  salida,
  resultados,
  urlPagina,
}: {
  entrada: string;
  salida: string;
  resultados: ResultadoDisponibilidad[];
  urlPagina: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": ID_NEGOCIO,
    name: ALOJAMIENTO.nombre,
    url: URL_FICHA,
    makesOffer: resultados.map((r) => ({
      "@type": "Offer",
      name: r.nombre,
      url: urlPagina,
      price: r.totalConIva.toFixed(2),
      priceCurrency: ALOJAMIENTO.moneda,
      availability: r.disponible
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      validFrom: entrada,
      validThrough: salida,
    })),
  };
}
