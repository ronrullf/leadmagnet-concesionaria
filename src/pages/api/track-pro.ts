import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

/**
 * Tracking de visitas a landings de profesionales. Gemelo de /api/track pero
 * contra pro_demos / pro_demo_visits, porque aquel resuelve el slug en `demos`
 * y un slug de profesional no existe ahí.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Visitas del propio Fernando no cuentan.
    if (cookies.get('tp_admin')?.value === '1') {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug.slice(0, 100) : null;
    if (!slug) return new Response(null, { status: 204 });

    const db = supabaseAdmin();
    const { data: pro } = await db.from('pro_demos').select('id').eq('slug', slug).maybeSingle();
    if (!pro) return new Response(null, { status: 204 });

    await db.from('pro_demo_visits').insert({
      pro_demo_id: pro.id,
      path: typeof body.path === 'string' ? body.path.slice(0, 200) : null,
      referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null,
      user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      is_owner_view: body.owner === true,
    });
  } catch {
    // nunca romper por tracking
  }
  return new Response(null, { status: 204 });
};
