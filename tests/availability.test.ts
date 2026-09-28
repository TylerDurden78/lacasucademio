import { describe, expect, it } from "vitest";
import { getDisponibilidad } from "../lib/availability";
import { TIPOS_ALOJAMIENTO } from "../lib/config";

/**
 * Fecha ISO (UTC) a `offsetDias` días de hoy. Se usa solo para los casos que
 * comprueban validación de rango (pasado, orden, horizonte), no para las
 * reglas de precio ligadas a un fin de semana o festivo concreto, que usan
 * fechas de calendario fijas (2026-2027, cubiertas por `lib/holidays.ts`).
 */
function fechaRelativa(offsetDias: number): string {
  const hoy = new Date();
  const t = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return new Date(t + offsetDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const BASE_DOBLE = TIPOS_ALOJAMIENTO.find((t) => t.id === "doble")!.precioBaseNoche;

function doble(resultados: ReturnType<typeof getDisponibilidad>) {
  return resultados.find((r) => r.habitacionId === "doble")!;
}

describe("determinismo", () => {
  it("la misma consulta produce siempre el mismo resultado", () => {
    const consulta = {
      entrada: fechaRelativa(10),
      salida: fechaRelativa(12),
      adultos: 2,
    };
    expect(getDisponibilidad(consulta)).toEqual(getDisponibilidad(consulta));
  });
});

describe("reglas de precio", () => {
  it("no aplica recargo entre semana y fuera de temporada alta", () => {
    // Martes 2026-11-03: ni fin de semana ni festivo.
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-03", salida: "2026-11-04", adultos: 2 })
    );
    expect(r.desgloseNoches).toHaveLength(1);
    expect(r.desgloseNoches[0].finDeSemana).toBe(false);
    expect(r.desgloseNoches[0].temporadaAlta).toBe(false);
    expect(r.desgloseNoches[0].precioBaseNoche).toBeCloseTo(BASE_DOBLE, 2);
  });

  it("aplica +25% la noche del viernes", () => {
    // Viernes 2026-11-06, fuera de cualquier rango de temporada alta.
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-06", salida: "2026-11-07", adultos: 2 })
    );
    expect(r.desgloseNoches[0].finDeSemana).toBe(true);
    expect(r.desgloseNoches[0].temporadaAlta).toBe(false);
    expect(r.desgloseNoches[0].precioBaseNoche).toBeCloseTo(BASE_DOBLE * 1.25, 2);
  });

  it("aplica +40% en un día de Semana Santa entre semana", () => {
    // Lunes 2027-03-22, dentro del rango de Semana Santa 2027.
    const r = doble(
      getDisponibilidad({ entrada: "2027-03-22", salida: "2027-03-23", adultos: 2 })
    );
    expect(r.desgloseNoches[0].finDeSemana).toBe(false);
    expect(r.desgloseNoches[0].temporadaAlta).toBe(true);
    expect(r.desgloseNoches[0].precioBaseNoche).toBeCloseTo(BASE_DOBLE * 1.4, 2);
  });

  it("combina recargo de fin de semana y de temporada alta", () => {
    // Sábado 2027-03-20 (Semana Santa 2027) + domingo 2027-03-21 (mismo rango).
    const r = doble(
      getDisponibilidad({ entrada: "2027-03-20", salida: "2027-03-22", adultos: 2 })
    );
    expect(r.desgloseNoches[0].finDeSemana).toBe(true);
    expect(r.desgloseNoches[0].temporadaAlta).toBe(true);
    expect(r.desgloseNoches[0].precioBaseNoche).toBeCloseTo(BASE_DOBLE * 1.25 * 1.4, 2);
    expect(r.desgloseNoches[1].finDeSemana).toBe(false);
    expect(r.desgloseNoches[1].temporadaAlta).toBe(true);
    expect(r.desgloseNoches[1].precioBaseNoche).toBeCloseTo(BASE_DOBLE * 1.4, 2);
  });

  it("incluye el desglose de IVA (10%) sobre el subtotal", () => {
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-03", salida: "2026-11-04", adultos: 2 })
    );
    expect(r.porcentajeIva).toBe(10);
    expect(r.iva).toBeCloseTo(r.subtotalSinIva * 0.1, 2);
    expect(r.totalConIva).toBeCloseTo(r.subtotalSinIva + r.iva, 2);
  });

  it("aplica el 10% de descuento en estancias de 5 noches o más", () => {
    // Martes a domingo (5 noches), sin caer en estancia mínima insuficiente.
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-03", salida: "2026-11-08", adultos: 2 })
    );
    const totalAntesDescuento = r.subtotalSinIva + r.iva;
    expect(r.descuentoEstanciaLarga).toBeCloseTo(totalAntesDescuento * 0.1, 2);
    expect(r.totalConIva).toBeCloseTo(totalAntesDescuento - r.descuentoEstanciaLarga, 2);
  });

  it("no aplica descuento en estancias de menos de 5 noches", () => {
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-03", salida: "2026-11-06", adultos: 2 })
    );
    expect(r.descuentoEstanciaLarga).toBe(0);
  });
});

describe("estancia mínima", () => {
  it("rechaza una sola noche si es la noche del sábado", () => {
    // Sábado 2026-11-07 a domingo 2026-11-08: 1 noche que empieza en sábado.
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-07", salida: "2026-11-08", adultos: 2 })
    );
    expect(r.disponible).toBe(false);
    expect(r.motivoNoDisponible).toBe("estancia_minima");
  });

  it("acepta dos noches si incluyen la noche del sábado", () => {
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-07", salida: "2026-11-09", adultos: 2 })
    );
    expect(r.motivoNoDisponible).not.toBe("estancia_minima");
  });

  it("acepta una sola noche entre semana sin sábado", () => {
    const r = doble(
      getDisponibilidad({ entrada: "2026-11-03", salida: "2026-11-04", adultos: 2 })
    );
    expect(r.motivoNoDisponible).not.toBe("estancia_minima");
  });
});

describe("capacidad", () => {
  it("marca 'capacidad' cuando adultos + niños supera el máximo de todos los tipos", () => {
    const resultados = getDisponibilidad({
      entrada: "2026-11-03",
      salida: "2026-11-04",
      adultos: 4,
      ninos: 4,
    });
    for (const r of resultados) {
      expect(r.disponible).toBe(false);
      expect(r.motivoNoDisponible).toBe("capacidad");
    }
  });

  it("permite la Casa Completa (máx. 6) con 4 adultos y 2 niños", () => {
    const resultados = getDisponibilidad({
      entrada: "2026-11-03",
      salida: "2026-11-04",
      adultos: 4,
      ninos: 2,
    });
    const casaCompleta = resultados.find((r) => r.habitacionId === "casa-completa")!;
    expect(casaCompleta.motivoNoDisponible).not.toBe("capacidad");
  });
});

describe("fechas inválidas", () => {
  it("lanza un error explicativo si la entrada ya ha pasado", () => {
    expect(() =>
      getDisponibilidad({ entrada: fechaRelativa(-5), salida: fechaRelativa(-3), adultos: 2 })
    ).toThrow(/ha pasado/);
  });

  it("lanza un error explicativo si la salida no es posterior a la entrada", () => {
    expect(() =>
      getDisponibilidad({ entrada: fechaRelativa(10), salida: fechaRelativa(10), adultos: 2 })
    ).toThrow(/posterior/);
  });

  it("lanza un error explicativo si la entrada supera el horizonte de reservas", () => {
    expect(() =>
      getDisponibilidad({ entrada: fechaRelativa(400), salida: fechaRelativa(402), adultos: 2 })
    ).toThrow(/horizonte/);
  });

  it("lanza un error explicativo con un formato de fecha inválido", () => {
    expect(() =>
      getDisponibilidad({ entrada: "03/11/2026", salida: fechaRelativa(2), adultos: 2 })
    ).toThrow(/inválida/);
  });
});
