import { supabaseAdmin } from './supabase';
import type { BcvRate } from './types';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Último recurso si la tabla está vacía y el fetch externo falla.
 * Cuando se usa este valor, `fetched_at` es null y la UI oculta la línea de Bs.
 */
const HARDCODED_FALLBACK = 737;

/** Busca el precio BCV en la respuesta: soporta ve.dolarapi.com y pydolarve (v1/v2). */
function extractRate(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, any>;

  const candidates = [
    obj?.promedio, // ve.dolarapi.com
    obj?.monitors?.bcv?.price,
    obj?.monitors?.usd?.price,
    obj?.bcv?.price,
    obj?.usd?.price,
    obj?.price,
  ];
  for (const c of candidates) {
    const n = typeof c === 'string' ? parseFloat(c.replace(',', '.')) : c;
    if (typeof n === 'number' && isFinite(n) && n > 0) return n;
  }
  return null;
}

async function fetchExternalRate(): Promise<number | null> {
  const url = import.meta.env.BCV_API_URL || 'https://ve.dolarapi.com/v1/dolares/oficial';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return extractRate(await res.json());
  } catch {
    return null;
  }
}

/**
 * Devuelve la tasa BCV cacheada, refrescándola si tiene más de 6 horas.
 * Nunca lanza: en el peor caso devuelve el fallback con fetched_at null.
 */
export async function getBcvRate(): Promise<BcvRate> {
  let cached: { rate: number; fetched_at: string } | null = null;

  try {
    const db = supabaseAdmin();
    const { data } = await db.from('bcv_rate').select('rate, fetched_at').eq('id', 1).maybeSingle();
    if (data) cached = { rate: Number(data.rate), fetched_at: data.fetched_at };

    const isFresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < SIX_HOURS_MS;
    if (isFresh && cached) return cached;

    const fresh = await fetchExternalRate();
    if (fresh) {
      const now = new Date().toISOString();
      await db.from('bcv_rate').upsert({ id: 1, rate: fresh, fetched_at: now });
      return { rate: fresh, fetched_at: now };
    }
  } catch {
    // Sin BD (o falló): intentar al menos la tasa externa en vivo.
    const fresh = await fetchExternalRate();
    if (fresh) return { rate: fresh, fetched_at: new Date().toISOString() };
  }

  if (cached) return cached;
  return { rate: HARDCODED_FALLBACK, fetched_at: null };
}
