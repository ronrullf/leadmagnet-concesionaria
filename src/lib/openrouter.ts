/**
 * Cliente de OpenRouter. Solo servidor.
 *
 * La clave se lee de import.meta.env dentro de funciones que únicamente corren
 * en endpoints de API. Si este módulo aparece en un componente con directiva
 * client:, la clave termina en el bundle. Verificar con búsqueda en dist/.
 */
import type { z } from 'zod';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface GenerateOpts {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult<T> {
  data: T | null;
  attempts: number;
  /** Último motivo de fallo, para el reporte del panel. */
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Repara la salida típica de un modelo pequeño y la parsea.
 * Devuelve null ante cualquier duda: null dispara reintento.
 */
export function repairAndParse<T>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();

  // 1. Quitar bloques de código de markdown.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

  // 2. Recortar todo lo anterior al primer { y posterior al último }.
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  s = s.slice(start, end + 1);

  // 3. Normalizar comillas tipográficas a rectas.
  //    Solo las dobles: los apóstrofos curvos son legítimos dentro del copy en
  //    español y romperlos cambiaría el texto del profesional.
  s = s.replace(/[“”„‟]/g, '"');

  // 4. Eliminar comas colgantes antes de } o ].
  s = s.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * Una llamada con reintentos. Valida contra el schema del bloque: JSON que
 * parsea pero no cumple el contrato cuenta como fallo y se reintenta.
 *
 * `reasoning: { enabled: false }` no es cosmético. El modelo por defecto gasta
 * cientos de tokens razonando ANTES de escribir, y esos tokens salen del mismo
 * max_tokens: con razonamiento activo el JSON se corta a la mitad y el bloque
 * se pierde. Nota: `exclude: true` no sirve, solo esconde el razonamiento del
 * response sin dejar de generarlo (y de cobrarlo).
 */
export async function generateJSON<T>(
  opts: GenerateOpts,
  schema: z.ZodType<T>,
  attempt = 1
): Promise<GenerateResult<T>> {
  const maxAttempts = 3;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': import.meta.env.OPENROUTER_REFERER ?? '',
        'X-Title': import.meta.env.OPENROUTER_TITLE ?? '',
      },
      body: JSON.stringify({
        model: import.meta.env.OPENROUTER_MODEL,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 2000,
        stream: false,
        reasoning: { enabled: false },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      }),
      // Un bloque tarda entre 30 y 90 segundos con el modelo gratuito.
      signal: AbortSignal.timeout(180_000),
    });
  } catch (e) {
    const msg = (e as Error).message;
    // "terminated" y los timeouts son transitorios: el proveedor gratuito corta
    // conexiones bajo carga. Sin reintento aquí se pierde el bloque entero por
    // un corte de red de un segundo.
    if (attempt < maxAttempts) {
      await sleep(2000 * attempt);
      return generateJSON(opts, schema, attempt + 1);
    }
    return { data: null, attempts: attempt, error: `Red: ${msg}` };
  }

  if (!res.ok) {
    const body = await res.text();
    // Rate limit y errores transitorios del proveedor: backoff y reintento.
    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      await sleep(2000 * attempt);
      return generateJSON(opts, schema, attempt + 1);
    }
    return {
      data: null,
      attempts: attempt,
      error: `OpenRouter ${res.status}: ${body.slice(0, 300)}`,
    };
  }

  const payload = await res.json();
  const choice = payload.choices?.[0];
  const raw = choice?.message?.content ?? '';

  // El presupuesto de tokens se agotó a mitad del JSON. Reintentar no ayuda
  // sin más espacio, así que se sube el techo en el siguiente intento.
  const truncated = choice?.finish_reason === 'length';

  const parsed = repairAndParse<unknown>(raw);
  const validated = parsed ? schema.safeParse(parsed) : null;

  if (validated?.success) {
    return { data: validated.data, attempts: attempt };
  }

  if (attempt < maxAttempts) {
    const why = !parsed
      ? 'RESPONDISTE CON JSON INVÁLIDO.'
      : `EL JSON NO CUMPLE EL CONTRATO: ${validated?.error.issues
          .slice(0, 4)
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')}.`;

    return generateJSON(
      {
        ...opts,
        maxTokens: truncated ? (opts.maxTokens ?? 2000) * 2 : opts.maxTokens,
        user: `${opts.user}\n\n${why} Devuelve SOLO el JSON, empezando con { y terminando con }, respetando las claves y los límites de caracteres.`,
      },
      schema,
      attempt + 1
    );
  }

  const detail = !parsed
    ? `JSON inválido${truncated ? ' (respuesta truncada)' : ''}`
    : `No cumple el schema: ${validated?.error.issues[0]?.message ?? 'desconocido'}`;
  return { data: null, attempts: attempt, error: detail };
}
