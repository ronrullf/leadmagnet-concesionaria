import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Fire-and-forget: siempre 204, pase lo que pase.
  try {
    // Visitas del propio Fernando no cuentan.
    if (cookies.get('tp_admin')?.value === '1') {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug.slice(0, 100) : null;
    if (!slug) return new Response(null, { status: 204 });

    const db = supabaseAdmin();
    const { data: demo } = await db.from('demos').select('id').eq('slug', slug).maybeSingle();
    if (!demo) return new Response(null, { status: 204 });

    await db.from('demo_visits').insert({
      demo_id: demo.id,
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
