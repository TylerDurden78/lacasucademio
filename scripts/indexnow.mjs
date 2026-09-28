#!/usr/bin/env node
/**
 * Notifica a IndexNow (Bing, Yandex, Seznam...) de las URLs del sitemap.
 * Pensado para lanzarse manualmente (o desde CI) tras cada despliegue:
 *
 *   node scripts/indexnow.mjs
 *   SITE_URL=http://localhost:3000 node scripts/indexnow.mjs   # para probar en local
 *
 * La clave debe coincidir con el nombre del fichero en public/<clave>.txt
 * (ver public/af0f14317438902df7cf79363563a86c.txt). Si se regenera la
 * clave, hay que renombrar ese fichero y actualizar INDEXNOW_KEY aquí (o
 * pasarla por variable de entorno).
 */

const SITE_URL = process.env.SITE_URL ?? "https://lacasucademio.vercel.app";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? "af0f14317438902df7cf79363563a86c";

async function main() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const respuestaSitemap = await fetch(sitemapUrl);
  if (!respuestaSitemap.ok) {
    throw new Error(`No se pudo leer ${sitemapUrl}: HTTP ${respuestaSitemap.status}`);
  }
  const xml = await respuestaSitemap.text();
  const urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  if (urlList.length === 0) {
    throw new Error(`El sitemap (${sitemapUrl}) no contiene ninguna URL.`);
  }

  const host = new URL(SITE_URL).host;
  const cuerpo = JSON.stringify({
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  });

  const respuesta = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: cuerpo,
  });

  console.log(`IndexNow: HTTP ${respuesta.status} para ${urlList.length} URLs de ${host}.`);
  if (!respuesta.ok) {
    console.error(await respuesta.text());
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error notificando a IndexNow:", error);
  process.exitCode = 1;
});
