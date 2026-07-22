import { supabaseAnon, supabaseAdmin } from './supabase';
import { coerceCopy, emptyCopy } from './copy-schema';
import type { ProDemo, Slot } from './pro-types';
import proFixture from '../data/pro-fixture.json';

const hasSupabase = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

/** Fixture SOLO para desarrollo local sin Supabase configurado. Nunca corre en producción. */
const DEV_FIXTURE = proFixture as unknown as ProDemo;

/** Normaliza el registro crudo de Supabase: el copy nunca llega sin pasar por Zod. */
function hydrate(row: Record<string, unknown>): ProDemo {
  return {
    ...(row as unknown as ProDemo),
    copy: coerceCopy(row.copy),
    slots: normalizeSlots(row.slots),
  };
}

function normalizeSlots(raw: unknown): Slot[] | null {
  if (!Array.isArray(raw)) return null;
  const slots = raw.filter(
    (s): s is Slot =>
      Boolean(s) &&
      typeof s === 'object' &&
      typeof (s as Slot).day === 'string' &&
      typeof (s as Slot).time === 'string' &&
      ((s as Slot).status === 'open' || (s as Slot).status === 'taken')
  );
  return slots.length ? slots : null;
}

/**
 * El fixture solo existe en desarrollo. En producción, un slug sin registro en
 * BD es un 404 y punto: nunca se sirve contenido inventado bajo el nombre de un
 * profesional real.
 */
function devFixture(slug: string): ProDemo | null {
  if (!import.meta.env.DEV) return null;

  if (slug === DEV_FIXTURE.slug) {
    return hydrate(DEV_FIXTURE as unknown as Record<string, unknown>);
  }

  // Mismo profesional, copy vacío y sin cupos. Sirve para comprobar que toda
  // sección sin contenido se omite entera, sin huecos ni márgenes fantasma.
  if (slug === `${DEV_FIXTURE.slug}-vacio`) {
    return {
      ...hydrate(DEV_FIXTURE as unknown as Record<string, unknown>),
      slug,
      copy: emptyCopy(),
      slots: null,
      monthly_capacity: null,
      slots_remaining: null,
    };
  }

  return null;
}

/**
 * Demo por slug, o null (la página responde 404 sin revelar nada).
 *
 * Por defecto solo trae demos activos: el público nunca ve un borrador. Con
 * `includeInactive` (solo cuando el visitante es un admin autenticado) trae
 * también los inactivos, para que el preview del editor y el botón "Abrir"
 * funcionen antes de activar la página. Sin este flag, un demo recién generado
 * daría 404 y parecería que "no funcionó".
 */
export async function getProBySlug(
  slug: string,
  includeInactive = false
): Promise<ProDemo | null> {
  if (!hasSupabase) return devFixture(slug);
  try {
    // El cliente anon respeta RLS (solo activos). Para ver un borrador hace
    // falta el cliente de servicio, que solo se invoca en la rama de admin.
    const client = includeInactive ? supabaseAdmin() : supabaseAnon();
    let query = client.from('pro_demos').select('*').eq('slug', slug);
    if (!includeInactive) query = query.eq('is_active', true);
    const { data } = await query.maybeSingle();
    if (data) return hydrate(data as Record<string, unknown>);
  } catch {
    // cae al fixture en dev; en producción devuelve null más abajo
  }
  // En dev, sirve el fixture aunque la migración 003 todavía no se haya corrido.
  return devFixture(slug);
}

/**
 * Cupos abiertos. La franja de agenda se oculta entera si no hay ninguno:
 * sin escasez real no hay sección.
 */
export function openSlots(slots: Slot[] | null): Slot[] {
  return (slots ?? []).filter((s) => s.status === 'open');
}

/** ¿Vale la pena renderizar la franja? Requiere al menos un cupo abierto real. */
export function hasAgenda(pro: ProDemo): boolean {
  return openSlots(pro.slots).length > 0;
}
