import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { slug?: string; path?: string; referrer?: string | null; owner?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!body.slug) return new Response(null, { status: 400 });

  try {
    const db = supabaseAdmin();
    const { data: demo } = await db
      .from('product_demos')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle();

    if (demo) {
      await db.from('product_demo_visits').insert({
        product_demo_id: demo.id,
        path: body.path || '/',
        referrer: body.referrer || null,
        user_agent: request.headers.get('user-agent') || null,
        is_owner_view: body.owner === true,
      });
    }
  } catch {
    // tracking fire-and-forget
  }

  return new Response(null, { status: 204 });
};
