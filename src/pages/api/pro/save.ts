import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { coerceCopy } from '../../../lib/copy-schema';
import { MOODS } from '../../../lib/pro-types';
import { normalizeHex } from '../../../lib/color';

export const prerender = false;

/**
 * Alta y edición de una landing de profesional. Protegido por el middleware
 * (/api/admin) — pero esta ruta es /api/pro, así que declara su guardia arriba
 * en middleware.ts. Aquí se confía en que el middleware ya filtró.
 *
 * El copy pasa por coerceCopy: nunca lanza, rellena lo que falte y descarta lo
 * que no encaje. Un demo se guarda aunque un bloque de la IA haya fallado.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const slug = slugify(str(body.slug) || str(body.pro_name));
  if (!slug) return json({ error: 'Falta slug o nombre' }, 400);

  const whatsapp = digits(str(body.whatsapp_e164));
  if (!str(body.pro_name) || !whatsapp) {
    return json({ error: 'Faltan nombre o WhatsApp' }, 400);
  }

  const mood = MOODS.includes(body.mood as never) ? (body.mood as string) : 'clinico';

  const record = {
    slug,
    pro_name: str(body.pro_name),
    pro_title: str(body.pro_title),
    profession_key: str(body.profession_key),
    city: str(body.city) || null,
    instagram_handle: str(body.instagram_handle).replace(/^@/, '') || null,
    followers: int(body.followers),
    photo_hero_url: str(body.photo_hero_url) || null,
    photo_story_url: str(body.photo_story_url) || null,
    logo_url: str(body.logo_url) || null,
    mood,
    accent_hex: normalizeHex(str(body.accent_hex)) || null,
    whatsapp_e164: whatsapp,
    booking_url: str(body.booking_url) || null,
    copy: coerceCopy(body.copy),
    slots: normalizeSlots(body.slots),
    monthly_capacity: int(body.monthly_capacity),
    slots_remaining: int(body.slots_remaining),
    is_active: body.is_active !== false,
    copy_source: ['ia', 'manual', 'mixto'].includes(str(body.copy_source))
      ? str(body.copy_source)
      : 'mixto',
    notes: str(body.notes) || null,
  };

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('pro_demos')
      .upsert(record, { onConflict: 'slug' })
      .select('slug')
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, slug: data.slug }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function int(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(str(v), 10);
  return Number.isFinite(n) ? n : null;
}
function digits(v: string): string {
  return v.replace(/\D/g, '');
}
function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Solo cupos bien formados. Los abiertos exigen 'remaining' numérico. */
function normalizeSlots(raw: unknown): unknown[] | null {
  if (!Array.isArray(raw)) return null;
  const clean = raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const o = s as Record<string, unknown>;
      const status = o.status === 'open' ? 'open' : 'taken';
      const slot: Record<string, unknown> = {
        day: str(o.day),
        time: str(o.time),
        status,
      };
      if (status === 'open') slot.remaining = int(o.remaining) ?? 1;
      return slot;
    })
    .filter((s) => s.day && s.time);
  return clean.length ? clean : null;
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
