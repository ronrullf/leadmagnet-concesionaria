/**
 * Utilidades de color para inyectar el acento del profesional.
 *
 * accent_hex de la BD sobreescribe el acento del mood, así que el color del
 * texto encima no se puede fijar a mano: hay que calcularlo, o un acento claro
 * deja el CTA en blanco sobre amarillo y la landing pierde su único botón.
 */

/** #abc o #aabbcc → [r,g,b] 0-255. null si no es un hex válido. */
export function parseHex(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const s = hex.trim().replace(/^#/, '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Luminancia relativa WCAG. */
export function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores, de 1 a 21. */
export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [18, 22, 26];

/**
 * Color de texto legible sobre el acento. Elige el que dé más contraste, no el
 * que "se vea bien": un acento amarillo necesita tinta oscura y uno azul marino
 * necesita blanca, y esa decisión no puede quedar en manos de quien carga el
 * demo a las once de la noche.
 */
export function inkOn(hex: string | null | undefined): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#FFFFFF';
  return contrast(rgb, WHITE) >= contrast(rgb, NEAR_BLACK) ? '#FFFFFF' : '#12161A';
}

/** Normaliza a #RRGGBB en mayúsculas, o null si el hex no sirve. */
export function normalizeHex(hex: string | null | undefined): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Mezcla con blanco, para fondos teñidos muy suaves. amount 0-1. */
export function tint(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#FFFFFF';
  const mixed = rgb.map((v) => Math.round(v + (255 - v) * amount)) as [number, number, number];
  return '#' + mixed.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
