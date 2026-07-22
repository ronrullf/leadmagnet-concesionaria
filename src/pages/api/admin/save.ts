import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { outreachMessage } from '../../../lib/whatsapp';
import { siteBase } from '../../../lib/site';

const DEMO_FIELDS = [
  'slug', 'vertical', 'agency_name', 'agency_tagline', 'agency_city', 'agency_logo_url',
  'accent_hex', 'instagram_handle', 'whatsapp_e164', 'contact_email',
  'office_address', 'maps_query', 'years_operating', 'properties_sold',
  'testimonial_text', 'testimonial_author', 'mode', 'is_active', 'notes',
] as const;

const PROPERTY_FIELDS = [
  'sort_order', 'ref_code', 'title', 'operation', 'property_type', 'price_usd',
  'location', 'bedrooms', 'bathrooms', 'parking', 'area_m2', 'description',
  'features', 'image_urls', 'maps_query', 'is_featured',
] as const;

const VEHICLE_FIELDS = [
  'sort_order', 'ref_code', 'title', 'brand', 'model', 'year', 'condition',
  'vehicle_type', 'price_usd', 'mileage_km', 'transmission', 'fuel', 'color',
  'is_import', 'import_wait', 'description', 'features', 'image_urls', 'is_featured',
] as const;

function pick(obj: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k] === '' ? null : obj[k];
  }
  return out;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const demoInput = pick(body.demo ?? {}, DEMO_FIELDS);
    // Compatibilidad: el cliente actual envía "items"; versiones previas, "properties".
    const itemsInput: Record<string, unknown>[] = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.properties) ? body.properties : [];
    const id: string | null = body.id ?? null;

    const vertical = demoInput.vertical === 'concesionario' ? 'concesionario' : 'inmobiliaria';
    demoInput.vertical = vertical;
    const isVehicles = vertical === 'concesionario';

    // Validaciones mínimas del servidor
    const slug = String(demoInput.slug ?? '');
    const wa = String(demoInput.whatsapp_e164 ?? '');
    if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
      return json({ error: 'Slug inválido. Solo minúsculas, números y guiones.' }, 400);
    }
    if (!/^58\d{10}$/.test(wa)) {
      return json({ error: 'WhatsApp inválido. Debe ser 12 dígitos empezando por 58.' }, 400);
    }
    if (!demoInput.agency_name || !demoInput.agency_city) {
      return json({ error: 'Nombre de agencia y ciudad son obligatorios.' }, 400);
    }

    const db = supabaseAdmin();

    let demoId = id;
    if (demoId) {
      const { error } = await db.from('demos').update(demoInput).eq('id', demoId);
      if (error) return json({ error: error.message }, 400);
    } else {
      const { data, error } = await db.from('demos').insert(demoInput).select('id').single();
      if (error) {
        const msg = error.code === '23505' ? `El slug "${slug}" ya existe.` : error.message;
        return json({ error: msg }, 400);
      }
      demoId = data.id;
    }

    const fields = isVehicles ? VEHICLE_FIELDS : PROPERTY_FIELDS;
    const table = isVehicles ? 'vehicles' : 'properties';
    const noun = isVehicles ? 'Vehículo' : 'Inmueble';
    const rows = itemsInput.map((p, i) => ({ ...pick(p, fields), sort_order: i, demo_id: demoId }));

    // Nada se descarta en silencio: un ítem incompleto bloquea el guardado.
    const invalidIdx = rows.findIndex((p) => {
      const base = p.ref_code && p.title && p.price_usd && Array.isArray(p.image_urls) && (p.image_urls as string[]).length > 0;
      return isVehicles ? !base : !(base && p.location);
    });
    if (invalidIdx !== -1) {
      const req = isVehicles ? 'ref, título, precio y al menos una foto' : 'ref, título, precio, ubicación y al menos una foto';
      return json({ error: `${noun} ${invalidIdx + 1} incompleto: ${req} son obligatorios.` }, 400);
    }

    // Reemplazo completo del inventario: simple y suficiente para 3–6 ítems.
    await db.from(table).delete().eq('demo_id', demoId);

    if (rows.length > 0) {
      const { error } = await db.from(table).insert(rows);
      if (error) return json({ error: `${noun}s: ${error.message}` }, 400);
    }

    const siteUrl = siteBase(new URL(request.url).origin);
    const link = `${siteUrl}/${slug}`;
    const featured = rows.find((r) => r.is_featured) ?? rows[0];
    const featuredTitle = featured ? String(featured.title) : 'inventario';
    const outreach = outreachMessage(String(demoInput.agency_name), featuredTitle, link);

    return json({ ok: true, id: demoId, slug, link, outreach });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
