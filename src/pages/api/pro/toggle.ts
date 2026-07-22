import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

/** Activa o desactiva una landing. Un demo inactivo responde 404 neutro. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) return json({ error: 'Falta id' }, 400);

    const { error } = await supabaseAdmin()
      .from('pro_demos')
      .update({ is_active: body.is_active === true })
      .eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
