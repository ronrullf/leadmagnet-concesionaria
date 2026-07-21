import { supabaseAnon } from './supabase';
import type { Demo, Property, Vehicle } from './types';
import fallbackProperties from '../data/fallback-properties.json';

const hasSupabase = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

/** Fixture SOLO para desarrollo local sin Supabase configurado. Nunca corre en producción. */
const DEV_FIXTURE: Demo = {
  id: 'dev-fixture',
  slug: 'costa-azul',
  created_at: new Date().toISOString(),
  vertical: 'inmobiliaria',
  agency_name: 'Inmobiliaria Costa Azul',
  agency_tagline: 'Bienes raíces en Margarita desde 2011',
  agency_city: 'Porlamar, Nueva Esparta',
  agency_logo_url: null,
  accent_hex: '#0F5C4E',
  instagram_handle: 'costaazulve',
  whatsapp_e164: '584141234567',
  contact_email: 'info@costaazul.com.ve',
  office_address: 'C.C. Costa Azul, Nivel PB, Local 12, Porlamar',
  maps_query: 'Centro Comercial Costa Azul, Porlamar, Venezuela',
  years_operating: 13,
  properties_sold: 240,
  testimonial_text: 'Vendimos nuestro apartamento en Pampatar en menos de dos meses. Atención impecable de principio a fin.',
  testimonial_author: 'María G., Pampatar',
  mode: 'completo',
  is_active: true,
  notes: null,
};

/** Demo activo por slug, o null (la página responde 404 sin revelar nada). */
export async function getDemoBySlug(slug: string): Promise<Demo | null> {
  if (!hasSupabase && import.meta.env.DEV) {
    return slug === DEV_FIXTURE.slug ? DEV_FIXTURE : null;
  }
  try {
    const { data } = await supabaseAnon()
      .from('demos')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    return (data as Demo) ?? null;
  } catch {
    return null;
  }
}

/**
 * Inmuebles del demo. Única fuente: lo que se cargó manualmente en el admin.
 * Sin inventario de muestra — si el demo no tiene inmuebles, se muestra vacío.
 */
export async function getProperties(demoId: string): Promise<Property[]> {
  if (demoId === 'dev-fixture') {
    return fallbackProperties as unknown as Property[];
  }
  try {
    const { data } = await supabaseAnon()
      .from('properties')
      .select('*')
      .eq('demo_id', demoId)
      .order('sort_order', { ascending: true });
    return ((data as Property[]) ?? []).map((p) => ({ ...p, price_usd: Number(p.price_usd) }));
  } catch {
    return [];
  }
}

/** Vehículos del demo (concesionarios). Única fuente: lo cargado en el admin. */
export async function getVehicles(demoId: string): Promise<Vehicle[]> {
  try {
    const { data } = await supabaseAnon()
      .from('vehicles')
      .select('*')
      .eq('demo_id', demoId)
      .order('sort_order', { ascending: true });
    return ((data as Vehicle[]) ?? []).map((v) => ({ ...v, price_usd: Number(v.price_usd) }));
  } catch {
    return [];
  }
}

/** Destacado genérico: sirve para inmuebles y vehículos. */
export function featuredProperty<T extends { is_featured: boolean }>(items: T[]): T | undefined {
  return items.find((p) => p.is_featured) ?? items[0];
}
