import type { Metadata } from "next";
import { TablaVisitasEnVivo } from "./TablaVisitasEnVivo";

export const metadata: Metadata = {
  title: "Visitas",
  robots: { index: false, follow: false },
};

export default function VisitasAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Visitas en directo</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Últimas peticiones al sitio, clasificadas por tipo de visitante. Las
          filas resaltadas corresponden a `/disponibilidad` o `/precios`.
        </p>
      </div>
      <TablaVisitasEnVivo />
    </main>
  );
}
