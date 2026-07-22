/**
 * Orquestador de las cuatro llamadas. Solo servidor.
 *
 * A → B → C → D en secuencia, cada una recibiendo el resultado de las
 * anteriores. Un bloque que falla no rompe los demás: se devuelve vacío, se
 * reporta, y Fernando lo escribe a mano.
 */
import {
  blockSchemas,
  emptyCopy,
  findOverflows,
  type BlockKey,
  type Overflow,
  type ProCopy,
} from './copy-schema';
import type { z } from 'zod';
import { lintCopy, type LintFinding } from './copy-lint';
import { generateJSON } from './openrouter';
import { SYSTEM_PROMPT, sharedContext, userPrompt, type ProInput } from './pro-prompts';
import type { ProfessionPack } from './pro-types';

export interface GenerationReport {
  blocks_ok: BlockKey[];
  blocks_failed: BlockKey[];
  attempts: Record<BlockKey, number>;
  errors: Partial<Record<BlockKey, string>>;
  /** Ranuras que se pasaron del límite de diseño. Se guardan; se recortan a mano. */
  overflows: Overflow[];
  /** Hallazgos del linter. Los de severidad 'error' no deberían salir a la calle. */
  lint: LintFinding[];
  duration_ms: number;
}

export interface GenerationResult {
  copy: ProCopy;
  report: GenerationReport;
}

const BLOCKS: BlockKey[] = ['A', 'B', 'C', 'D'];

/**
 * Cola de una sola generación concurrente. Los modelos gratuitos de OpenRouter
 * tienen límite por minuto: cuatro llamadas por demo lo agotan rápido si dos
 * generaciones corren a la vez.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

export function generateCopy(
  input: ProInput,
  pack: ProfessionPack,
  opts: { temperature?: number; sharper?: boolean } = {}
): Promise<GenerationResult> {
  return enqueue(() => runGeneration(input, pack, opts));
}

async function runGeneration(
  input: ProInput,
  pack: ProfessionPack,
  opts: { temperature?: number; sharper?: boolean }
): Promise<GenerationResult> {
  const started = Date.now();
  const context = sharedContext(input, pack);
  const copy = emptyCopy();

  const report: GenerationReport = {
    blocks_ok: [],
    blocks_failed: [],
    attempts: { A: 0, B: 0, C: 0, D: 0 },
    errors: {},
    overflows: [],
    lint: [],
    duration_ms: 0,
  };

  // Lo ya generado se pasa a la siguiente llamada para que la narrativa cierre.
  const previous: Record<string, unknown> = {};

  for (const block of BLOCKS) {
    const result = await generateBlock(block, context, previous, { ...opts, pack });
    report.attempts[block] = result.attempts;

    if (!result.data) {
      report.blocks_failed.push(block);
      if (result.error) report.errors[block] = result.error;
      continue;
    }

    report.blocks_ok.push(block);
    Object.assign(copy, result.data);
    Object.assign(previous, result.data);
  }

  // credentials nunca sale de la IA: se llena a mano con el input real.
  copy.proof.credentials = [];
  // El CTA del cierre repite el del hero. La consistencia del vocabulario es lo
  // que enseña al usuario a navegar, y el modelo tiende a inventarse otro.
  if (copy.hero.cta_label) copy.closing.cta_label = copy.hero.cta_label;

  report.overflows = findOverflows(copy);
  report.lint = lintCopy(copy);
  report.duration_ms = Date.now() - started;
  return { copy, report };
}

/** Un bloque suelto. Lo usa el botón "Regenerar solo este bloque" del editor. */
export function generateBlockOnly(
  block: BlockKey,
  input: ProInput,
  pack: ProfessionPack,
  previous: Record<string, unknown>,
  opts: { sharper?: boolean } = {}
) {
  return enqueue(() => generateBlock(block, sharedContext(input, pack), previous, { ...opts, pack }));
}

async function generateBlock(
  block: BlockKey,
  context: string,
  previous: Record<string, unknown>,
  opts: { temperature?: number; sharper?: boolean; pack?: ProfessionPack }
) {
  let user = userPrompt(block, context, previous, opts.pack);

  // "Regenerar con más filo": misma llamada, más temperatura y una instrucción
  // explícita de que la versión anterior quedó genérica.
  if (opts.sharper) {
    user += `\n\nLa versión anterior quedó genérica. Sé más específico y más directo.`;
  }

  // Los cuatro schemas son ZodObject distintos; el orquestador solo necesita
  // "un objeto validado", y cada bloque se ensambla con Object.assign.
  const schema = blockSchemas[block] as unknown as z.ZodType<object>;

  const call = (extra: string, temperature: number) =>
    generateJSON(
      {
        system: SYSTEM_PROMPT,
        user: user + extra,
        temperature,
        maxTokens: 2000,
      },
      schema
    );

  const baseTemp = opts.sharper ? 0.85 : (opts.temperature ?? 0.6);
  let result = await call('', baseTemp);

  /**
   * Segunda pasada guiada por el linter.
   *
   * Prohibir las frases genéricas en el prompt no alcanza: el modelo las repite
   * igual, porque son el centro de gravedad de todo el texto de testimonios que
   * existe. Lo único que las saca es mostrarle las suyas y exigirle otras. Un
   * solo reintento; si insiste, el hallazgo queda en el reporte y Fernando lo
   * reescribe en el editor.
   */
  if (result.data) {
    const bad = lintBlock(result.data);
    if (bad.length) {
      const retry = await call(
        `\n\nTu respuesta anterior contenía estas frases, que están prohibidas por genéricas o por afirmar un resultado:\n` +
          bad.map((f) => `· "${f.match}" en ${f.path}`).join('\n') +
          `\n\nEscribe el bloque de nuevo. Ninguna de esas frases puede aparecer, ni parafraseada. Sustitúyelas por detalles concretos de esta profesión.`,
        0.9
      );
      // Solo se acepta el reintento si de verdad mejoró.
      if (retry.data && lintBlock(retry.data).length < bad.length) {
        result = { ...retry, attempts: result.attempts + retry.attempts };
      } else {
        result = { ...result, attempts: result.attempts + (retry.attempts ?? 0) };
      }
    }
  }

  return result;
}

/**
 * Hallazgos graves de un bloque suelto, sin ensamblar el copy completo.
 *
 * El merge tiene que ser profundo en proof: el bloque D trae proof SIN
 * credentials (se omite a propósito), y un spread superficial dejaría
 * proof.credentials en undefined y el linter reventaría al leer su length.
 */
function lintBlock(data: object): LintFinding[] {
  const base = emptyCopy();
  const part = data as Partial<ProCopy>;
  const copy: ProCopy = {
    ...base,
    ...part,
    proof: { ...base.proof, ...(part.proof ?? {}) },
  };
  return lintCopy(copy).filter(
    (f) => f.severity === 'error' && f.rule !== 'credencial-generada'
  );
}
