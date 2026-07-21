import type { Vertical } from './types';

/**
 * Textos y rutas que cambian según el nicho del demo.
 * Todo lo demás (BCV, admin, OG, tracking, deeplinks) es compartido.
 */
export interface VerticalConfig {
  /** Sustantivo plural para navegación y titulares: "Inmuebles" / "Vehículos" */
  nounPlural: string;
  /** Segmento de la ruta de detalle: inmueble / vehiculo */
  detailPath: string;
  /** Label de la estadística de vendidos en TrustSection */
  soldLabel: string;
  /** Descripción para OG y meta */
  ogDescription: string;
  /** Título del catálogo en la home */
  catalogTitle: string;
  /** Mensaje del estado vacío */
  emptyMessage: string;
}

export const VERTICALS: Record<Vertical, VerticalConfig> = {
  inmobiliaria: {
    nounPlural: 'Inmuebles',
    detailPath: 'inmueble',
    soldLabel: 'inmuebles vendidos',
    ogDescription: 'Vea nuestro catálogo de inmuebles disponibles con precios actualizados.',
    catalogTitle: 'Inmuebles disponibles',
    emptyMessage: 'Escríbanos por WhatsApp y le enviamos los inmuebles disponibles.',
  },
  concesionario: {
    nounPlural: 'Vehículos',
    detailPath: 'vehiculo',
    soldLabel: 'vehículos vendidos',
    ogDescription: 'Vea nuestro catálogo de vehículos disponibles con precios actualizados.',
    catalogTitle: 'Vehículos disponibles',
    emptyMessage: 'Escríbanos por WhatsApp y le enviamos los vehículos disponibles.',
  },
};

export function verticalConfig(vertical: string | null | undefined): VerticalConfig {
  return VERTICALS[(vertical as Vertical) ?? 'inmobiliaria'] ?? VERTICALS.inmobiliaria;
}
