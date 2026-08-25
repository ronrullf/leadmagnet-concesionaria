import type { APIRoute } from 'astro';
import { generateProductBlockOnly } from '../../../lib/generate-product-copy';
import type { BlockKey } from '../../../lib/outreach-schema';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const block = body.block as BlockKey;
  if (!['A', 'B'].includes(block)) {
    return json({ error: 'Bloque no válido' }, 400);
  }

  const input = {
    product_name: str(body.product_name),
    business_name: str(body.business_name),
    niche_key: str(body.niche_key) || str(body.niche_label) || 'generico',
    niche_label: str(body.niche_label),
    city: str(body.city),
    instagram_handle: str(body.instagram_handle),
    followers: typeof body.followers === 'number' ? body.followers : null,
    instagram_bio: str(body.instagram_bio),
    what_they_sell: str(body.what_they_sell),
    ideal_customer: str(body.ideal_customer),
    real_credentials: str(body.real_credentials),
    price_usd: typeof body.price_usd === 'number' ? body.price_usd : null,
    guarantee_info: str(body.guarantee_info),
  };

  const previous = (body.previous && typeof body.previous === 'object' ? body.previous : {}) as Record<string, unknown>;

  try {
    const res = await generateProductBlockOnly(block, input, previous);
    return json({ data: res.data, attempts: res.attempts, error: res.error }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
