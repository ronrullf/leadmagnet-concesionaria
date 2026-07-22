import type { APIRoute } from 'astro';
import { generateCopy, generateBlockOnly } from '../../lib/generate-copy';
import { resolvePack } from '../../lib/profession-packs';
import { isAuthed } from '../../lib/auth';
import { blockSchemas, type BlockKey } from '../../lib/copy-schema';
import type { ProInput } from '../../lib/pro-prompts';

export const prerender = false;

/**
 * Generación de copy. Dos modos:
 *
 * - Sin `block`: corre A→B→C→D en secuencia y devuelve el copy completo + reporte.
 * - Con `block` (A|B|C|D) y `previous`: genera solo ese bloque. Lo usa el panel
 *   para dibujar una barra de progreso real — el cliente pide A, luego B con el
 *   contexto de A, y así — y también el botón "Regenerar este bloque" del editor.
 *
 * El guardia es isAuthed, no la cookie tp_admin: esa cookie es un "1" sin firmar
 * que cualquiera puede ponerse, y quemaría la cuota diaria de OpenRouter gratis.
 */
export const POST: APIRoute = async (context) => {
  const { request } = context;

  if (!isAuthed(context)) return json({ error: 'No autenticado' }, 401);
  if (!import.meta.env.OPENROUTER_API_KEY) {
    return json({ error: 'Falta OPENROUTER_API_KEY en el servidor' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  // Profesión: llave de un pack existente o etiqueta escrita a mano. Nunca falla.
  const pack = resolvePack(str(body.profession_key) || str(body.profession_label));

  const input: ProInput = {
    pro_name: str(body.pro_name),
    pro_title: str(body.pro_title),
    city: str(body.city),
    instagram_handle: str(body.instagram_handle),
    followers: typeof body.followers === 'number' ? body.followers : null,
    instagram_bio: str(body.instagram_bio),
    captions: Array.isArray(body.captions) ? body.captions.slice(0, 3).map(str) : [],
    what_they_sell: str(body.what_they_sell),
    ideal_customer: str(body.ideal_customer),
    real_credentials: str(body.real_credentials),
  };

  if (!input.pro_name || !input.instagram_bio) {
    return json({ error: 'Faltan nombre o bio de Instagram' }, 400);
  }

  // Modo bloque suelto.
  const block = str(body.block).toUpperCase() as BlockKey;
  if (block && block in blockSchemas) {
    const previous =
      body.previous && typeof body.previous === 'object'
        ? (body.previous as Record<string, unknown>)
        : {};
    try {
      const result = await generateBlockOnly(block, input, pack, previous, {
        sharper: body.sharper === true,
      });
      return json({ block, data: result.data, attempts: result.attempts, error: result.error }, 200);
    } catch (e) {
      return json({ error: `Fallo del bloque ${block}: ${(e as Error).message}` }, 502);
    }
  }

  // Modo completo.
  try {
    const result = await generateCopy(input, pack);
    return json(result, 200);
  } catch (e) {
    return json({ error: `Fallo de generación: ${(e as Error).message}` }, 502);
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
