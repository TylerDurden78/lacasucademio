#!/usr/bin/env node
/**
 * Comprueba que la página de disponibilidad (vía su JSON-LD embebido), la
 * API JSON y el servidor MCP devuelven el mismo precio y disponibilidad para
 * una muestra de fechas. Pensado para lanzarse contra local o producción:
 *
 *   node scripts/verify.ts
 *   SITE_URL=http://localhost:3000 node scripts/verify.ts
 *
 * Standalone a propósito (sin importar lib/*): así se verifican las
 * respuestas HTTP reales de las tres superficies, no la lógica interna.
 */

const SITE_URL = process.env.SITE_URL ?? "https://lacasucademio.vercel.app";
const SLUG = "casuca-mio"; // debe coincidir con ALOJAMIENTO.slug en lib/config.ts
const TOLERANCIA_EUROS = 0.01;

interface OfertaJsonLd {
  name: string;
  price: string;
  availability: string;
}

interface ResultadoApi {
  nombre: string;
  disponible: boolean;
  totalConIva: number;
}

interface Muestra {
  entrada: string;
  salida: string;
  adultos: number;
}

function fechaIso(offsetDias: number): string {
  const hoy = new Date();
  const t = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return new Date(t + offsetDias * 86400000).toISOString().slice(0, 10);
}

function muestras(): Muestra[] {
  return [
    { entrada: fechaIso(7), salida: fechaIso(9), adultos: 2 }, // fin de semana
    { entrada: fechaIso(30), salida: fechaIso(31), adultos: 1 }, // 1 noche entre semana
    { entrada: fechaIso(45), salida: fechaIso(50), adultos: 4 }, // estancia larga (descuento)
    { entrada: fechaIso(120), salida: fechaIso(122), adultos: 2 }, // más lejos en el horizonte
  ];
}

async function extraerOfertasWeb(m: Muestra): Promise<OfertaJsonLd[]> {
  // URL "limpia" (sin query string): es el formato canónico, el que se
  // comparte en enlaces y el que aceptan las herramientas de navegación más
  // restrictivas (ver _compartido.tsx).
  const url = `${SITE_URL}/alojamientos/${SLUG}/disponibilidad/${m.entrada}/${m.salida}/${m.adultos}`;
  const html = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Web ${url} → HTTP ${r.status}`);
    return r.text();
  });
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const bloque of bloques) {
    const datos = JSON.parse(bloque[1]);
    if (Array.isArray(datos.makesOffer)) return datos.makesOffer;
  }
  throw new Error(`No se encontró makesOffer en el JSON-LD de ${url}`);
}

async function extraerResultadosApi(m: Muestra): Promise<ResultadoApi[]> {
  const url = `${SITE_URL}/api/disponibilidad?entrada=${m.entrada}&salida=${m.salida}&adultos=${m.adultos}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${url} → HTTP ${res.status}`);
  const datos = await res.json();
  return datos.resultados;
}

async function extraerResultadosMcp(m: Muestra): Promise<ResultadoApi[]> {
  const url = `${SITE_URL}/api/mcp`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "buscar_disponibilidad",
        arguments: { entrada: m.entrada, salida: m.salida, adultos: m.adultos },
      },
    }),
  });
  if (!res.ok) throw new Error(`MCP ${url} → HTTP ${res.status}`);
  const texto = await res.text();
  const lineaDatos = texto.split("\n").find((l) => l.startsWith("data:"));
  if (!lineaDatos) throw new Error(`Respuesta MCP inesperada de ${url}: ${texto}`);
  const payload = JSON.parse(lineaDatos.slice("data:".length).trim());
  const contenido = payload.result?.content?.[0]?.text;
  if (!contenido) throw new Error(`Respuesta MCP sin contenido de ${url}: ${texto}`);
  return JSON.parse(contenido).resultados;
}

function compararMuestra(
  m: Muestra,
  web: OfertaJsonLd[],
  api: ResultadoApi[],
  mcp: ResultadoApi[]
): string[] {
  const errores: string[] = [];
  for (const oferta of web) {
    const enApi = api.find((r) => r.nombre === oferta.name);
    const enMcp = mcp.find((r) => r.nombre === oferta.name);
    if (!enApi) {
      errores.push(`[${oferta.name}] no aparece en la API`);
      continue;
    }
    if (!enMcp) {
      errores.push(`[${oferta.name}] no aparece en el MCP`);
      continue;
    }

    const precioWeb = Number(oferta.price);
    if (Math.abs(precioWeb - enApi.totalConIva) > TOLERANCIA_EUROS) {
      errores.push(`[${oferta.name}] precio web ${precioWeb} € != API ${enApi.totalConIva} €`);
    }
    if (Math.abs(enApi.totalConIva - enMcp.totalConIva) > TOLERANCIA_EUROS) {
      errores.push(`[${oferta.name}] precio API ${enApi.totalConIva} € != MCP ${enMcp.totalConIva} €`);
    }

    const disponibleWeb = oferta.availability.endsWith("InStock");
    if (disponibleWeb !== enApi.disponible) {
      errores.push(
        `[${oferta.name}] disponibilidad web (${disponibleWeb}) != API (${enApi.disponible})`
      );
    }
    if (enApi.disponible !== enMcp.disponible) {
      errores.push(
        `[${oferta.name}] disponibilidad API (${enApi.disponible}) != MCP (${enMcp.disponible})`
      );
    }
  }
  return errores;
}

/** El formulario GET (query string) debe redirigir a la URL "limpia". */
async function comprobarRedireccion(m: Muestra): Promise<string | undefined> {
  const url = `${SITE_URL}/alojamientos/${SLUG}/disponibilidad?entrada=${m.entrada}&salida=${m.salida}&adultos=${m.adultos}`;
  const esperado = `/alojamientos/${SLUG}/disponibilidad/${m.entrada}/${m.salida}/${m.adultos}`;
  const res = await fetch(url);
  if (!res.ok) return `Redirección ${url} → HTTP ${res.status}`;
  if (!res.url.endsWith(esperado)) {
    return `Redirección ${url} llevó a ${res.url}, se esperaba que acabase en ${esperado}`;
  }
  return undefined;
}

async function main() {
  console.log(`Verificando ${SITE_URL} ...\n`);
  let totalErrores = 0;

  const errorRedireccion = await comprobarRedireccion(muestras()[0]);
  if (errorRedireccion) {
    totalErrores += 1;
    console.log(`✗ redirección ?query → URL limpia`);
    console.log(`    - ${errorRedireccion}`);
  } else {
    console.log(`✓ redirección ?query → URL limpia`);
  }

  for (const m of muestras()) {
    const etiqueta = `${m.entrada} → ${m.salida}, ${m.adultos} adulto(s)`;
    try {
      const [web, api, mcp] = await Promise.all([
        extraerOfertasWeb(m),
        extraerResultadosApi(m),
        extraerResultadosMcp(m),
      ]);
      const errores = compararMuestra(m, web, api, mcp);
      if (errores.length === 0) {
        console.log(`✓ ${etiqueta}`);
      } else {
        totalErrores += errores.length;
        console.log(`✗ ${etiqueta}`);
        for (const e of errores) console.log(`    - ${e}`);
      }
    } catch (error) {
      totalErrores += 1;
      console.log(`✗ ${etiqueta}`);
      console.log(`    - ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log();
  if (totalErrores > 0) {
    console.log(`${totalErrores} discrepancia(s) encontrada(s).`);
    process.exitCode = 1;
  } else {
    console.log("Todo coincide entre web, API y MCP.");
  }
}

main();
