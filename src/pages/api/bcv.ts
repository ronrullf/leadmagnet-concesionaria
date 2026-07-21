import type { APIRoute } from 'astro';
import { getBcvRate } from '../../lib/bcv';

export const GET: APIRoute = async () => {
  const bcv = await getBcvRate();
  return new Response(JSON.stringify(bcv), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
