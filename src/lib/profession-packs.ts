/**
 * Carga de profession-packs.
 *
 * Los packs se descubren solos desde /src/data/profession-packs/*.json.
 * Agregar una profesión es soltar un JSON en esa carpeta: cero código, cero
 * registro manual, cero import nuevo.
 */
import type { ProfessionPack } from './pro-types';

const modules = import.meta.glob<ProfessionPack>('../data/profession-packs/*.json', {
  eager: true,
  import: 'default',
});

const PACKS: Record<string, ProfessionPack> = Object.fromEntries(
  Object.values(modules).map((pack) => [pack.key, pack])
);

export function getPack(key: string): ProfessionPack | null {
  return PACKS[key] ?? null;
}

/** Para el selector del panel, ordenado alfabéticamente por etiqueta. */
export function listPacks(): ProfessionPack[] {
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

/**
 * Pack genérico armado a partir de una etiqueta escrita a mano. Permite generar
 * copy para una profesión que todavía no tiene su JSON: la calidad es menor
 * porque el contexto del rubro es neutro, pero no bloquea el flujo. Cuando esa
 * profesión valga la pena, se le crea su pack y mejora sin tocar nada más.
 */
function fallbackPack(label: string): ProfessionPack {
  return {
    key: slugifyKey(label) || 'generico',
    label: label.trim(),
    default_mood: 'clinico',
    failing_behaviors: [
      'buscar la solución por su cuenta en redes sociales y grupos',
      'pedir recomendaciones a conocidos que pasaron por algo parecido',
      'posponer la decisión hasta que el problema se agrava',
    ],
    typical_objections: [
      'no sé si de verdad necesito ayuda profesional para esto',
      'ya intenté antes y no me funcionó',
      'no estoy seguro de que valga lo que cuesta',
    ],
    urgency_lever:
      'cada mes que pasa el problema se vuelve más difícil y más caro de resolver',
    main_pain: 'cargar con un problema que no sabe cómo resolver bien',
    dream_outcome: 'resolver el problema con alguien que de verdad sabe y quedar tranquilo',
    vocabulary: ['consulta', 'proceso', 'plan', 'seguimiento', 'resultado'],
  };
}

/**
 * Resuelve una profesión desde una llave conocida o una etiqueta escrita a mano.
 * Nunca devuelve null: si no hay pack, arma uno genérico con la etiqueta.
 */
export function resolvePack(keyOrLabel: string): ProfessionPack {
  const raw = keyOrLabel.trim();
  if (!raw) return fallbackPack('Profesional');

  // ¿Coincide con una llave o etiqueta de un pack existente?
  const bySlug = PACKS[slugifyKey(raw)];
  if (bySlug) return bySlug;
  const byLabel = Object.values(PACKS).find(
    (p) => p.label.toLowerCase() === raw.toLowerCase()
  );
  if (byLabel) return byLabel;

  return fallbackPack(raw);
}
