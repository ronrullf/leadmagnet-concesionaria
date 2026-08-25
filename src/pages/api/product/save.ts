import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { coerceOutreachCopy, coercePruebas } from '../../../lib/outreach-schema';
import { validateProductOutreach } from '../../../lib/product-schema';
import { PRODUCT_MOODS } from '../../../lib/product-types';
import { normalizeHex } from '../../../lib/color';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const productName = str(body.product_name) || str(body.title);
  const businessName = str(body.business_name);
  const slug = slugify(str(body.slug) || productName);
  if (!slug || !productName) return json({ error: 'Falta slug o nombre de producto' }, 400);

  const whatsapp = digits(str(body.whatsapp_e164));
  if (!whatsapp) {
    return json({ error: 'Falta WhatsApp' }, 400);
  }

  const mood = PRODUCT_MOODS.includes(body.mood as never) ? (body.mood as string) : 'industrial';
  const outreachCopy = coerceOutreachCopy(body.copy);
  const pruebas = coercePruebas(body.muro_pruebas);

  const forzar = body.forzar === true || body.is_active === false;
  const problemas = validateProductOutreach({
    copy: outreachCopy,
    pruebas,
    whatsapp,
    nombreProducto: productName,
    nombreEmpresa: businessName,
    expira: str(body.expira) || null,
    autoriaMensaje: str(body.autoria_mensaje),
  });

  if (problemas.length && !forzar) {
    return json({ error: 'La landing no cumple el estándar.', problemas }, 400);
  }

  const record = {
    slug,
    product_name: productName,
    business_name: businessName,
    niche_key: str(body.niche_key) || 'generico',
    city: str(body.city) || null,
    instagram_handle: str(body.instagram_handle).replace(/^@/, '') || null,
    followers: int(body.followers),
    photo_hero_url: str(body.photo_hero_url) || null,
    photo_story_url: str(body.photo_story_url) || null,
    logo_url: str(body.logo_url) || null,
    gallery: normalizeGallery(body.gallery),
    price_usd: num(body.price_usd),
    guarantee_info: str(body.guarantee_info) || null,
    specs: normalizeSpecs(body.specs),
    mood,
    accent_hex: normalizeHex(str(body.accent_hex)) || null,
    bg_hex: normalizeHex(str(body.bg_hex)) || null,
    text_hex: normalizeHex(str(body.text_hex)) || null,
    whatsapp_e164: whatsapp,
    booking_url: str(body.booking_url) || null,
    cta_mode: body.cta_mode === 'formulario' ? 'formulario' : 'directo',
    cta_form_title: str(body.cta_form_title) || null,
    copy: outreachCopy,
    expira: str(body.expira) || null,
    muro_pruebas: pruebas,
    autoria_mensaje: str(body.autoria_mensaje) || null,
    is_active: body.is_active !== false,
    copy_source: ['ia', 'manual', 'mixto'].includes(str(body.copy_source))
      ? str(body.copy_source)
      : 'mixto',
    notes: str(body.notes) || null,
  };

  try {
    const db = supabaseAdmin();
    let { data, error } = await db
      .from('product_demos')
      .upsert(record, { onConflict: 'slug' })
      .select('slug')
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, slug: data?.slug ?? slug, problemas }, 200);
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
function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(str(v));
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

function normalizeGallery(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()));
  return items.length ? items : null;
}

function normalizeSpecs(raw: unknown): unknown[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        title: str(o.title),
        value: str(o.value),
        icon: str(o.icon) || 'rayo',
        description: str(o.description),
      };
    })
    .filter((s) => s.title);
  return items.length ? items : null;
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
