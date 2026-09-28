import { NextResponse } from "next/server";
import { obtenerVisitas } from "@/lib/bot-log-store";

// El acceso ya está protegido por Basic Auth en proxy.ts (para /api/admin/*).
export async function GET() {
  const { visitas, persistenciaConfigurada } = await obtenerVisitas(200);
  return NextResponse.json({ visitas, persistenciaConfigurada });
}
