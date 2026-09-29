import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ALOJAMIENTO } from "@/lib/config";
import { IMAGENES } from "@/lib/images";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(ALOJAMIENTO.dominio),
  title: { default: ALOJAMIENTO.nombre, template: `%s · ${ALOJAMIENTO.nombre}` },
  description: `${ALOJAMIENTO.descripcionCorta} ${ALOJAMIENTO.avisoDemo}`,
  openGraph: {
    siteName: ALOJAMIENTO.nombre,
    type: "website",
    locale: "es_ES",
    title: ALOJAMIENTO.nombre,
    description: ALOJAMIENTO.descripcionCorta,
    images: [{ url: IMAGENES.portada }],
  },
  verification: {
    google: "F1Wz33feL5cOgW-6p-2H-NtO5F_y3aj9mCRfT7SxZQw",
  },
};

const rutaFicha = `/alojamientos/${ALOJAMIENTO.slug}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              {ALOJAMIENTO.nombre}
            </Link>
            <div className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href={rutaFicha}>El alojamiento</Link>
              <Link href={`${rutaFicha}/precios`}>Precios</Link>
              <Link href={`${rutaFicha}/disponibilidad`}>Disponibilidad</Link>
            </div>
          </nav>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="border-t border-zinc-200 px-6 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          {ALOJAMIENTO.avisoDemo}
        </footer>
      </body>
    </html>
  );
}
