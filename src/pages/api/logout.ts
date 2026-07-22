import type { APIRoute } from 'astro';
import { clearSessionCookies } from '../../lib/auth';

export const POST: APIRoute = async (context) => {
  clearSessionCookies(context);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
