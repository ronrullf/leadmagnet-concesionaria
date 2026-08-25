import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { id?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400 });
  }

  if (!body.id || typeof body.is_active !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Falta id o is_active' }), { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from('product_demos')
      .update({ is_active: body.is_active })
      .eq('id', body.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
};
