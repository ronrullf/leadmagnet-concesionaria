import type { ProductPack } from './product-types';

const modules = import.meta.glob<ProductPack>('../data/product-packs/*.json', {
  eager: true,
  import: 'default',
});

const PACKS: Record<string, ProductPack> = Object.fromEntries(
  Object.values(modules).map((pack) => [pack.key, pack])
);

export function getProductPack(key: string): ProductPack | null {
  return PACKS[key] ?? null;
}

export function listProductPacks(): ProductPack[] {
  return Object.values(PACKS).sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function slugifyKey(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fallbackProductPack(label: string): ProductPack {
  return {
    key: slugifyKey(label) || 'generico',
    label: label.trim(),
    default_mood: 'industrial',
    main_pain: 'no contar con el producto o equipo adecuado en el momento que más se necesita',
    dream_outcome: 'adquirir un producto o servicio de alta calidad con garantía y respaldo en Venezuela',
    urgency_lever: 'las ofertas y la disponibilidad de stock de importación son limitadas',
    failing_behaviors: [
      'comprar alternativas económicas de mala calidad que se dañan rápido',
      'esperar semanas por entregas sin soporte post-venta en el país',
      'arriesgar la inversión comprando sin garantía escrita'
    ],
    typical_objections: [
      'no estoy seguro de si este modelo o repuesto se adapta a mi necesidad',
      'me preocupa el tiempo de envío y la instalación',
      'quiero confirmar si incluye garantía y repuestos en el futuro'
    ],
    vocabulary: ['producto', 'modelo', 'garantía', 'especificaciones', 'envío', 'respaldo'],
    default_specs: [
      { title: 'Garantía Escrita', value: '1 Año Directo', icon: 'escudo', description: 'Respaldo total en repuestos y servicio técnico' },
      { title: 'Despacho Nacional', value: 'Envíos Rápidos', icon: 'camion', description: 'Entregas aseguradas a nivel nacional' },
      { title: 'Asesoría Técnica', value: 'Incluida', icon: 'llave', description: 'Orientación para la correcta elección e instalación' }
    ],
  };
}

export function resolveProductPack(keyOrLabel: string): ProductPack {
  const raw = keyOrLabel.trim();
  if (!raw) return fallbackProductPack('Producto');

  const bySlug = PACKS[slugifyKey(raw)];
  if (bySlug) return bySlug;

  const byLabel = Object.values(PACKS).find(
    (p) => p.label.toLowerCase() === raw.toLowerCase()
  );
  if (byLabel) return byLabel;

  return fallbackProductPack(raw);
}
