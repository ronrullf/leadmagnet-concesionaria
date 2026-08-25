import { supabaseAnon, supabaseAdmin } from './supabase';
import { coerceOutreachCopy, emptyOutreachCopy, coercePruebas } from './outreach-schema';
import type { ProductDemo, ProductSpec } from './product-types';
import productFixture from '../data/product-fixture.json';

const hasSupabase = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

const DEV_FIXTURE = productFixture as unknown as ProductDemo;

function hydrate(row: Record<string, unknown>): ProductDemo {
  return {
    ...(row as unknown as ProductDemo),
    copy: coerceOutreachCopy(row.copy),
    expira: typeof row.expira === 'string' ? row.expira : null,
    muro_pruebas: coercePruebas(row.muro_pruebas),
    autoria_mensaje: str(row.autoria_mensaje),
    bg_hex: str(row.bg_hex),
    text_hex: str(row.text_hex),
    accent_hex: str(row.accent_hex),
    cta_mode: row.cta_mode === 'formulario' ? 'formulario' : 'directo',
    cta_form_title: str(row.cta_form_title),
    price_usd: typeof row.price_usd === 'number' ? row.price_usd : null,
    guarantee_info: str(row.guarantee_info),
    specs: normalizeSpecs(row.specs),
    gallery: normalizeGallery(row.gallery),
  };
}

function normalizeGallery(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()));
  return items.length ? items : null;
}

function normalizeSpecs(raw: unknown): ProductSpec[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((s): s is ProductSpec => Boolean(s) && typeof s === 'object')
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title.trim() : '',
      value: typeof s.value === 'string' ? s.value.trim() : undefined,
      icon: typeof s.icon === 'string' && s.icon ? (s.icon as any) : 'rayo',
      description: typeof s.description === 'string' ? s.description.trim() : undefined,
    }))
    .filter((s) => s.title);
  return items.length ? items : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function devFixture(slug: string): ProductDemo | null {
  if (!import.meta.env.DEV) return null;

  if (slug === DEV_FIXTURE.slug || slug === 'generac-12kw' || slug === 'planta-generac-12kw') {
    return hydrate(DEV_FIXTURE as unknown as Record<string, unknown>);
  }

  return null;
}

export async function getProductBySlug(
  slug: string,
  includeInactive = false
): Promise<ProductDemo | null> {
  if (!hasSupabase) return devFixture(slug);
  try {
    const client = includeInactive ? supabaseAdmin() : supabaseAnon();
    let query = client.from('product_demos').select('*').eq('slug', slug);
    if (!includeInactive) query = query.eq('is_active', true);
    const { data } = await query.maybeSingle();
    if (data) return hydrate(data as Record<string, unknown>);
  } catch {
    // fallback fixture en dev
  }
  return devFixture(slug);
}
