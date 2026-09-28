import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // El optimizador de imágenes de Next reenvía la petición a Unsplash desde
    // el servidor; en esta red, ese fetch falla por un certificado
    // autofirmado en la cadena (proxy corporativo interceptando TLS). Con
    // `unoptimized` el navegador carga la imagen directamente desde Unsplash,
    // sin pasar por el servidor de Next.
    unoptimized: true,
  },
};

export default nextConfig;
