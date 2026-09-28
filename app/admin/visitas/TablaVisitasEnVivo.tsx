"use client";

import { useEffect, useState } from "react";
import { NOMBRES_CATEGORIA, type VisitaRegistrada } from "@/lib/bot-log";

const INTERVALO_REFRESCO_MS = 4000;

function esRutaDestacada(ruta: string): boolean {
  return ruta.includes("/disponibilidad") || ruta.includes("/precios");
}

export function TablaVisitasEnVivo() {
  const [visitas, setVisitas] = useState<VisitaRegistrada[]>([]);
  const [persistenciaConfigurada, setPersistenciaConfigurada] = useState(true);
  const [soloBots, setSoloBots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const respuesta = await fetch("/api/admin/visitas", { cache: "no-store" });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        if (cancelado) return;
        setVisitas(datos.visitas ?? []);
        setPersistenciaConfigurada(datos.persistenciaConfigurada ?? false);
        setError(null);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al cargar visitas.");
        }
      }
    }

    cargar();
    const id = setInterval(cargar, INTERVALO_REFRESCO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  const filtradas = soloBots
    ? visitas.filter((v) => v.categoria !== "humano")
    : visitas;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soloBots}
            onChange={(e) => setSoloBots(e.target.checked)}
          />
          Solo bots IA
        </label>
        <p className="text-xs text-zinc-500">
          Se actualiza cada {INTERVALO_REFRESCO_MS / 1000} s · {filtradas.length} visitas
        </p>
      </div>

      {!persistenciaConfigurada && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          No hay credenciales de Upstash Redis configuradas
          (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN), así que no se está
          guardando ninguna visita todavía.
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="py-2 pr-4">Hora</th>
              <th className="py-2 pr-4">Ruta</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">User-Agent</th>
              <th className="py-2">IP (anonimizada)</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((v, i) => (
              <tr
                key={`${v.timestamp}-${i}`}
                className={
                  "border-b border-zinc-100 dark:border-zinc-900" +
                  (esRutaDestacada(v.ruta)
                    ? " bg-amber-50 dark:bg-amber-950/40"
                    : "")
                }
              >
                <td className="py-1.5 pr-4 font-mono text-xs">
                  {new Date(v.timestamp).toLocaleTimeString("es-ES")}
                </td>
                <td className="py-1.5 pr-4 font-mono text-xs">{v.ruta}</td>
                <td className="py-1.5 pr-4">{NOMBRES_CATEGORIA[v.categoria]}</td>
                <td className="max-w-xs truncate py-1.5 pr-4 text-xs text-zinc-500" title={v.userAgent}>
                  {v.userAgent || "—"}
                </td>
                <td className="py-1.5 font-mono text-xs">{v.ipAnonimizada}</td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-500">
                  Sin visitas registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
