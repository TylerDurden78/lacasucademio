# La Casuca de Mio

Web de demostración de una casa rural **ficticia**, pensada para mostrar cómo un
sitio bien preparado puede ser consultado por agentes IA (ChatGPT, Claude, Gemini,
Perplexity) navegando el HTML crudo — sin JavaScript ni integraciones especiales.

> Sitio de demostración. No se aceptan reservas reales.

## Arranque local

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # vitest run
```

## Estado del proyecto

Ver [`CLAUDE.md`](./CLAUDE.md) para el detalle de fases (motor de disponibilidad,
páginas, SEO para agentes, observabilidad de bots, servidor MCP) y las
convenciones del repo. Completadas: Fases 1-5.

## SEO y legibilidad para agentes (Fase 3)

- `/robots.txt`, `/sitemap.xml` y `/llms.txt` se generan dinámicamente
  (`app/robots.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`).
- Cada página incluye JSON-LD (`LodgingBusiness` en la ficha, `Offer` por
  habitación en disponibilidad) y metadata/Open Graph con canonical.
- Tras cada despliegue, notificar a IndexNow:
  ```bash
  npm run indexnow
  # o para probar en local:
  SITE_URL=http://localhost:3000 npm run indexnow
  ```
- Verificación rápida (HTML crudo, sin JS):
  ```bash
  curl -s https://lacasucademio.vercel.app/alojamientos/casuca-mio | grep LodgingBusiness
  curl -s "https://lacasucademio.vercel.app/alojamientos/casuca-mio/disponibilidad/2026-11-06/2026-11-08/2" | grep -E "makesOffer|€"
  ```

## Observabilidad de bots (Fase 4)

- `proxy.ts` clasifica cada petición (OpenAI, Anthropic, Google, Bing,
  Perplexity, otro bot o humano por user-agent), anonimiza la IP y la registra
  en Upstash Redis **de forma asíncrona** (no bloquea la respuesta).
- `/admin/visitas` — tabla en vivo (autorefresco cada 4 s), filtro "solo bots
  IA" y resalta las peticiones a `/disponibilidad` y `/precios`. Protegida con
  Basic Auth.
- Sin `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configuradas, el
  sitio funciona igual: simplemente no se registra ni se muestra ninguna
  visita (fallo seguro). Sin `ADMIN_USER`/`ADMIN_PASSWORD`, `/admin/visitas`
  devuelve 401 siempre.

## Servidor MCP remoto (Fase 5)

`/api/mcp` expone, en Streamable HTTP (sin SSE, vía [`mcp-handler`](https://www.npmjs.com/package/mcp-handler)),
3 herramientas de solo lectura que reutilizan `lib/availability.ts` — nunca
recalculan precios por su cuenta:

- **`buscar_disponibilidad`** — disponibilidad y precio de los 4 tipos de
  alojamiento para unas fechas y huéspedes.
- **`cotizar`** — desglose de precio completo (recargos, IVA, descuento) de un
  tipo de alojamiento concreto.
- **`crear_enlace_reserva`** — genera el enlace real a la reserva simulada con
  todo precargado.

Sin autenticación (demo de solo lectura) pero con rate limiting básico sobre
Upstash Redis (30 peticiones/minuto por IP; sin Upstash configurado, no se
limita nada). Las llamadas MCP se registran en `/admin/visitas` igual que
cualquier otra petición, porque pasan por `proxy.ts` como cualquier ruta.

### Añadirlo como conector en Claude

En claude.ai (o Claude Desktop): **Ajustes → Conectores → Añadir conector
personalizado**, y pega la URL `https://lacasucademio.vercel.app/api/mcp`
(o `http://localhost:3000/api/mcp` en local).

### Añadirlo en el modo desarrollador de ChatGPT

En ChatGPT: **Ajustes → Conectores → Avanzado → Modo desarrollador**
(actívalo si no lo está) → **Añadir conector** → introduce la URL
`https://lacasucademio.vercel.app/api/mcp` como servidor MCP remoto (Streamable HTTP).

### WebMCP (experimental — demo de cara al futuro)

`/api/mcp` también publica un puente [WebMCP](https://github.com/webmachinelearning/webmcp)
(`?webmcp-script`, cargado automáticamente en todas las páginas): si el
navegador del visitante implementa `document.modelContext` (todavía ninguno
mainstream lo hace de forma extendida), las mismas 3 herramientas quedarían
disponibles para un agente integrado en ese navegador **sin conector ni
instalación**. Hoy no tiene efecto práctico — es una demostración de que el
sitio ya está preparado para ese estándar cuando llegue, no una solución al
caso de navegación sin conector (ver más abajo).

### Verificar que web, API y MCP coinciden

```bash
npm run verify
# o contra un servidor en marcha en otro sitio:
SITE_URL=http://localhost:3000 npm run verify
```

`scripts/verify.ts` compara, para una muestra de fechas, el JSON-LD `makesOffer`
de la página de disponibilidad, la respuesta de `/api/disponibilidad` y la de
la herramienta MCP `buscar_disponibilidad`.

## Despliegue en Vercel

> Desplegado en `https://lacasucademio.vercel.app`. Si más adelante se
> registra el dominio `lacasucademio.es` de verdad, hay que: (1) añadirlo en
> Vercel → Settings → Domains y apuntar el DNS, y (2) cambiar
> `ALOJAMIENTO.dominio` en `lib/config.ts` a la URL nueva (de ahí salen el
> sitemap, el JSON-LD, el canonical y `robots.txt`).

1. Importa el repo en Vercel (framework autodetectado: Next.js).
2. Configura las variables de entorno de la tabla de abajo en el proyecto
   (Settings → Environment Variables). Ninguna es obligatoria para que el
   sitio público funcione.
3. Despliega. Después de cada despliegue a producción, notifica a IndexNow:
   `SITE_URL=https://lacasucademio.vercel.app npm run indexnow`.
4. Verifica con `npm run verify` (o `curl`) que la web, la API y el MCP
   responden con normalidad en producción.

## Checklist de indexación

- [ ] **Google Search Console**: añadir la propiedad `lacasucademio.vercel.app`,
      verificar dominio, enviar `https://lacasucademio.vercel.app/sitemap.xml`.
- [ ] **Bing Webmaster Tools**: añadir el sitio (puede importarse directamente
      desde Google Search Console) y enviar el mismo sitemap.
- [ ] **IndexNow**: confirmar que `public/af0f14317438902df7cf79363563a86c.txt`
      es accesible en `https://lacasucademio.vercel.app/af0f14317438902df7cf79363563a86c.txt`
      y lanzar `npm run indexnow` tras el primer despliegue.
- [ ] Comprobar `https://lacasucademio.vercel.app/robots.txt` y `/llms.txt` en
      producción (deben servir contenido real, no un 404).
- [ ] Registrar `/api/mcp` como conector en Claude y en el modo desarrollador
      de ChatGPT (ver arriba) para la demo en directo.

## Batería de preguntas de prueba

Para probar con ChatGPT, Claude, Gemini o Perplexity (dales la URL de la ficha,
`https://lacasucademio.vercel.app/alojamientos/casuca-mio`, o simplemente el nombre
"La Casuca de Mio" si el buscador del agente ya la ha indexado):

1. "¿Qué disponibilidad tiene La Casuca de Mio el próximo fin de semana para 2 adultos?"
2. "¿Cuánto costaría alquilar la Casa Completa una semana en agosto?"
3. "Quiero una habitación doble para 2 personas, 3 noches entre semana — ¿precio con IVA incluido?"
4. "¿Cuál es la política de cancelación y el horario de check-in de La Casuca de Mio?"
5. "Resérvame la Suite con Chimenea para el 10-12 de octubre" (debe llevar a la reserva simulada, dejando claro que es una demo).
6. "Dame los precios de La Casuca de Mio para los próximos 3 meses" (debe usar `/precios`, no inventar cifras).

Con el conector MCP añadido, las mismas preguntas deberían resolverse llamando
a `buscar_disponibilidad`/`cotizar`/`crear_enlace_reserva` en vez de navegar el
HTML — buena forma de mostrar la diferencia en la demo.

## Variables de entorno

Ver [`.env.example`](./.env.example). Todas opcionales para el sitio público:

| Variable | Para qué |
|---|---|
| `ADMIN_USER`, `ADMIN_PASSWORD` | Basic Auth de `/admin/visitas` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Log de visitas (Fase 4) y rate limiting del MCP (Fase 5) |
| `SITE_URL`, `INDEXNOW_KEY` | Solo para `npm run indexnow` |
| `SITE_URL` | También usada por `npm run verify` |
