import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

/**
 * Recibe una imagen ya redimensionada/comprimida a WebP por el cliente
 * y la sube al bucket público demo-media con service_role.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const folder = String(form.get('folder') || 'general').replace(/[^a-z0-9-]/g, '') || 'general';

    if (!(file instanceof File)) {
      return json({ error: 'Falta el archivo.' }, 400);
    }
    if (file.size > 3 * 1024 * 1024) {
      return json({ error: 'Imagen demasiado pesada (máx 3MB tras compresión).' }, 400);
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
    const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const db = supabaseAdmin();
    const { error } = await db.storage
      .from('demo-media')
      .upload(name, await file.arrayBuffer(), { contentType: file.type, upsert: false });

    if (error) return json({ error: error.message }, 500);

    const { data } = db.storage.from('demo-media').getPublicUrl(name);
    return json({ ok: true, url: data.publicUrl });
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
