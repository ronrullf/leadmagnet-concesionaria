import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, is_active } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: 'Falta id' }), { status: 400 });

    const { error } = await supabaseAdmin().from('demos').update({ is_active: !!is_active }).eq('id', id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error inesperado' }), { status: 500 });
  }
};
