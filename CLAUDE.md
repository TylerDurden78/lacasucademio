@AGENTS.md

# CLAUDE.md

Guía para Claude Code al trabajar en este repo. Ver también el plan de proyecto
original y el estado de fases más abajo.

## Qué es esto

Web ficticia de una casa rural ("La Casuca de Mio") para una demo comercial: mostrar
que los LLM/agentes IA (ChatGPT, Claude, Gemini, Perplexity) pueden consultar
disponibilidad y precios reales navegando el HTML crudo del sitio, sin JavaScript ni
integraciones, o vía el servidor MCP remoto (`/api/mcp`) sobre la misma lógica.

**No es un negocio real.** Nombre, localidad, dirección y dominio son ficticios
(ver `lib/config.ts`). Todas las páginas deben dejarlo explícito ("Sitio de
demostración. No se aceptan reservas reales.").

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (`@import "tailwindcss"`,
  sin `tailwind.config.js`).
- **Importante:** Next 16 tiene cambios respecto a versiones anteriores — el fichero
  de middleware se llama `proxy.ts`, no `middleware.ts`. Antes de tocar rutas,
  metadata dinámica o middleware, revisar `node_modules/next/dist/docs/` (ver
  `AGENTS.md`, autogenerado por `next dev`).
- Vitest para tests (`npm test`).
- npm como gestor de paquetes.

## Principio central: una sola fuente de verdad

`lib/availability.ts` es la ÚNICA fuente de verdad de disponibilidad y precios. La
web (páginas y `/api/disponibilidad`), y más adelante el servidor MCP, deben
**reutilizar** esta función — nunca reimplementar sus reglas de precio o stock en
otro sitio.

- `lib/config.ts` — datos fijos del alojamiento y de los 4 tipos de habitación.
- `lib/holidays.ts` — rangos fijos de Semana Santa/puentes (2026-2027) usados por
  `availability.ts` para el recargo de temporada alta. Revisar y ampliar si el
  horizonte de reservas (365 días) empieza a acercarse a 2028.
- `lib/images.ts` — URLs de fotos de stock (Unsplash, hotlinkeadas), centralizadas
  para poder sustituirlas sin tocar las páginas.
- `lib/availability.ts` — motor de precios/disponibilidad. Determinista: la
  ocupación pseudoaleatoria se deriva de un hash de `fecha + habitación`, nunca de
  `Math.random()`.
- `lib/jsonld.ts` — construye los objetos JSON-LD (`LodgingBusiness`, `Offer`) a
  partir de `config.ts` y de los resultados ya calculados por `availability.ts`;
  no recalcula precios. Se inyectan con `app/_components/JsonLd.tsx`.
- `lib/bot-log.ts` — tipos y clasificación de visitantes (sin dependencias de
  servidor; también se importa desde el componente cliente de `/admin/visitas`).
  `lib/bot-log-store.ts` (con `import "server-only"`) es quien lee/escribe en
  Redis — nunca importar este segundo fichero desde un componente cliente.
- `lib/redis.ts` — construcción del cliente Upstash Redis (`undefined` si no
  hay credenciales), compartida por `bot-log-store.ts` y `rate-limit.ts`.

## URLs de disponibilidad: ruta "limpia", no query string

`app/alojamientos/[slug]/disponibilidad/_compartido.tsx` tiene toda la lógica
compartida (validación, tabla, mensajes, JSON-LD). Hay dos entradas:

- **`[...fechas]/page.tsx`** — la canónica, con las fechas como segmentos de
  ruta: `/disponibilidad/AAAA-MM-DD/AAAA-MM-DD[/adultos[/ninos]]`. Es la que
  se usa en todos los enlaces que generamos (ficha, sitemap, `/llms.txt`,
  JSON-LD) y la que de verdad valida/renderiza.
- **`page.tsx`** — la de query string (`?entrada=...&salida=...&adultos=...`),
  necesaria porque un `<form method="get">` sin JS siempre produce ese
  formato. Renderiza el mismo contenido directamente (sin redirigir), con
  `canonical` apuntando a la URL limpia de arriba.

**Por qué existen dos, y por qué la de query string NO redirige:** se
comprobó en producción, en dos rondas:
1. La herramienta de navegación de ChatGPT (sin conector MCP) rechaza abrir
   URLs con `?` que el propio modelo se ha inventado, con el mensaje
   `"... is not accessible via this tool"` — pero abre sin problema una URL
   sin query string. De ahí la URL limpia como formato canónico/compartido.
2. Al hacer que `?query` redirigiera (307) a la URL limpia en vez de
   renderizar directamente, la misma herramienta dejó de seguir la
   redirección y se quedó sin contenido. De ahí que `page.tsx` renderice el
   contenido en el sitio, sin redirigir — las dos URLs son accesibles
   directamente, y solo el `canonical`/los enlaces que generamos indican cuál
   es la preferida.

Si se añaden más parámetros a disponibilidad en el futuro, hacerlo como
segmentos de ruta opcionales adicionales en la URL limpia, no como query
string — y evitar introducir una redirección entre ambas variantes.

## Estado de fases

- [x] **Fase 1** — Motor de disponibilidad y precios (`lib/availability.ts`) + tests
      Vitest + placeholder de home que renderiza un ejemplo real en servidor.
- [x] **Fase 2** — Páginas: home (`app/page.tsx`), ficha (`app/alojamientos/[slug]`),
      disponibilidad con formulario GET sin JS y manejo explícito de errores
      (`.../disponibilidad`), reserva simulada (`.../disponibilidad/reserva`),
      tabla de precios a 90 días con ISR diario (`.../precios`) y API JSON con
      CORS abierto (`app/api/disponibilidad/route.ts`). Todo reutiliza
      `lib/availability.ts`, sin duplicar reglas de precio.
- [x] **Fase 3** — SEO y legibilidad para agentes: JSON-LD (`LodgingBusiness` en
      la ficha, `makesOffer` en disponibilidad), metadata/Open Graph completos
      con canonical, `app/robots.ts`
      (permite explícitamente GPTBot, ClaudeBot, PerplexityBot, etc.),
      `app/sitemap.ts` (home, ficha, precios + 8 URLs de ejemplo de
      disponibilidad, ISR diario), `app/llms.txt/route.ts` y notificación a
      IndexNow (`scripts/indexnow.mjs` + clave pública en
      `public/af0f14317438902df7cf79363563a86c.txt`; lanzar con `npm run
      indexnow` tras cada despliegue). Verificado con `curl` que precios y
      JSON-LD están en el HTML crudo (no dependen de JS cliente).
- [x] **Fase 4** — Observabilidad de bots: `proxy.ts` clasifica cada visita
      (OpenAI/Anthropic/Google/Bing/Perplexity/otro bot/humano por user-agent),
      anonimiza la IP y la registra en Upstash Redis de forma asíncrona
      (`event.waitUntil`, nunca bloquea la respuesta) vía `lib/bot-log-store.ts`.
      `/admin/visitas` (Basic Auth por `ADMIN_USER`/`ADMIN_PASSWORD`, comprobado
      en `proxy.ts` para `/admin/*` y `/api/admin/*`) muestra una tabla en vivo
      con autorefresco cada 4 s, filtro "solo bots IA" y resalta las filas de
      `/disponibilidad` y `/precios`. Sin credenciales de Upstash configuradas,
      todo sigue funcionando: simplemente no se registra ni se muestra nada
      (ver `.env.example`).
- [x] **Fase 5** — Servidor MCP remoto en `app/api/mcp/route.ts`, Streamable
      HTTP (sin SSE) vía `mcp-handler` + `@modelcontextprotocol/server`. Tres
      herramientas de solo lectura (`buscar_disponibilidad`, `cotizar`,
      `crear_enlace_reserva`) que reutilizan `lib/availability.ts`, sin
      autenticación pero con rate limiting básico (`lib/rate-limit.ts`, 30
      peticiones/min/IP sobre Upstash Redis; sin Redis configurado no se
      limita nada). Las llamadas se registran en `/admin/visitas` igual que
      cualquier petición, porque `/api/mcp` no está excluido del matcher de
      `proxy.ts`. `scripts/verify.ts` (`npm run verify`) comprueba que el
      JSON-LD de la web, `/api/disponibilidad` y el MCP coinciden.

Todas las fases (1-5) están completas. Cambios de alcance mayor sobre lo ya
construido conviene seguir pactándolos con el usuario antes de tocar el motor
de precios o las reglas de negocio, dado que así se ha trabajado hasta ahora.

## Extra: WebMCP (experimental, de cara al futuro)

`app/api/mcp/route.ts` también publica un puente WebMCP (`experimental_webMcp`
de `mcp-handler`), servido en `/api/mcp?webmcp-script` y cargado en
`app/layout.tsx` vía `next/script`. Publica las mismas 3 herramientas para que
un agente integrado en el propio navegador del visitante (si ese navegador
implementa `document.modelContext`/`navigator.modelContext`) las descubra sin
conector remoto — sin instalar nada.

**Importante:** esto es una API de navegador todavía experimental, sin soporte
extendido hoy (no lo implementa ningún navegador de forma estable). El script
comprueba si existe ese objeto y no hace nada si no — no afecta al
funcionamiento normal del sitio ni sustituye al servidor MCP remoto (Fase 5),
que sigue siendo la vía fiable mientras esto no sea estándar. No soluciona el
problema de navegación de agentes sin conector documentado más abajo (ese
"navegador" de agente corre server-side y no ejecuta el JS de la página).

**Probado y confirmado funcionando** (2026-09-30) en Chrome 153 con los flags
`chrome://flags/#enable-webmcp-testing` y
`chrome://flags/#devtools-webmcp-support` activados: el panel **Application →
WebMCP** de las DevTools lista las 3 herramientas con su descripción completa,
y una llamada real desde la consola funciona de principio a fin:

```js
const tools = await document.modelContext.getTools();
const tool = tools.find(t => t.name === 'buscar_disponibilidad');
await document.modelContext.executeTool(tool, JSON.stringify({ entrada: '2026-10-09', salida: '2026-10-11', adultos: 2 }));
```

Notas de la API real de Chrome (no documentada de forma estable, puede
cambiar): `executeTool(tool, argumentosJson)` exige el objeto `RegisteredTool`
tal cual lo devuelve `getTools()` (no vale pasar el nombre como string), y los
argumentos van como **string JSON** (`JSON.stringify(...)`), no como objeto
plano — si se pasa un objeto da `UnknownError: Failed to parse input
arguments`.

## Cierre del proyecto (2026-09-30) — hallazgos de la demo en producción

Con el sitio publicado en `https://lacasucademio.vercel.app` (Vercel, dominio
gratuito; `ALOJAMIENTO.dominio` en `lib/config.ts` se puede cambiar en una
línea si se registra `lacasucademio.es` de verdad más adelante — ver
"Despliegue en Vercel" en el README) y verificado en Google Search Console,
Bing Webmaster Tools e IndexNow, se probó a fondo con agentes reales cómo
responden sin conector MCP, dando pie a varios cambios de diseño reflejados
más arriba (URL limpia, `adultos` por defecto, sin redirección, prioridad a
`/precios`). Tabla resumen de lo comprobado:

| Agente | Con la URL dada explícitamente | Preguntando "a ciegas" (sin URL, fecha que debe calcular él mismo) |
|---|---|---|
| **ChatGPT** (sin conector) | Funciona bien, incluso encadenando preguntas sobre fechas ya publicadas en un enlace | Falla de forma consistente e intermitente — ver más abajo |
| **Claude** (sin conector) | Funciona bien; sabe leer `/precios` y razonar sobre estancia mínima sin que se le indique | No probado a fondo |
| **Gemini** | No pudo acceder al dominio en absoluto (probablemente depende de indexación previa en Google, que se acaba de solicitar) | No encuentra el sitio (normal, recién publicado) |
| **Perplexity** | No evaluado (fuera de alcance, decisión del usuario) | No evaluado |

**Conclusión sobre ChatGPT sin conector:** tras descartar metódicamente el
formato de URL, las redirecciones y un posible bloqueo de firewall de Vercel
(comprobado en el panel de Firewall: `Bot Protection: Inactive`, sin reglas
bloqueando el tráfico de `ChatGPT-User`, que sí llega al servidor), la causa
queda acotada a la propia herramienta de navegación de ChatGPT: rechaza abrir
URLs que el modelo construye por sí mismo a partir de un cálculo de fechas
(cualquier formato), pero sí abre URLs que ya ha "visto" como enlace literal
en una página o resultado de búsqueda — y ese comportamiento no es
determinista incluso dentro de la misma sesión. **No es algo que se pueda
arreglar desde el sitio.** La mitigación aplicada (reordenar `/precios` como
recurso principal en el texto para agentes) es una mejora razonable, no una
solución garantizada.

**Para la demo comercial, el argumento queda así:**
1. Navegación pura (sin instalar nada) funciona bien para contenido estable
   y para agentes que reciben el enlace — ya es un caso de venta fuerte por sí
   solo, con matices conocidos y explicables por producto.
2. El conector MCP remoto (Fase 5) es la vía **siempre fiable**, para quien lo
   configure — la respuesta cuando un cliente pregunte "¿y si el agente no
   coopera?".
3. WebMCP (ver arriba) demuestra que el sitio ya está preparado para el
   estándar futuro donde ni siquiera hará falta el conector — probado en vivo
   en Chrome con los flags experimentales.

## Comandos

```bash
npm run dev       # servidor de desarrollo, http://localhost:3000
npm run build     # build de producción
npm test          # vitest run
npm run lint      # eslint
npm run indexnow  # notifica el sitemap a IndexNow (tras cada despliegue)
npm run verify    # compara web, API y MCP para una muestra de fechas
```
