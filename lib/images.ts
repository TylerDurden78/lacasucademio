/**
 * URLs de fotos de stock (Unsplash, uso libre sin atribución obligatoria:
 * https://unsplash.com/license) centralizadas aquí para poder sustituirlas
 * fácilmente. Se hotlinkean directamente desde images.unsplash.com.
 */

function unsplash(id: string, ancho = 1600): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${ancho}&q=80`;
}

export const IMAGENES = {
  portada: unsplash("photo-1502784444187-359ac186c5bb"),
  fachada: unsplash("photo-1449158743715-0a90ebb6d2d8"),
  valle: unsplash("photo-1506905925346-21bda4d32df4"),
  habitacion: {
    doble: unsplash("photo-1522771739844-6a9f6d5f14af"),
    "doble-superior": unsplash("photo-1590490360182-c33d57733427"),
    "suite-chimenea": unsplash("photo-1611892440504-42a792e24d32"),
    "casa-completa": unsplash("photo-1560448204-e02f11c3d0e2"),
  },
} as const;
