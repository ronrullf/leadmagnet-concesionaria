/**
 * Contrato del objeto `copy` de una landing de outreach.
 *
 * Reemplaza al esqueleto persuasivo de 11 secciones. La diferencia de fondo no
 * es de forma, es de audiencia (LEY 0 del spec):
 *
 *   La página le habla a los PACIENTES del prospecto.
 *   Quien la lee es el PROSPECTO.
 *
 * De ahí salen las dos reglas que este schema hace cumplir:
 *
 * 1. Nada se afirma sin fuente pública. Cada prueba del muro exige `fuente` y
 *    (`texto` o `src`). Un testimonio sin origen no es un dato débil: es un
 *    testimonio inventado atribuido a un consultorio real, y eso cuesta el
 *    prospecto y la reputación.
 *
 * 2. Los límites duros del §8 se validan al GUARDAR, no al renderizar. Una
 *    landing ya publicada nunca se cae por una validación nueva.
 */
import { z } from 'zod';

const txt = (max: number) => z.string().trim().max(max);

/** El visual del hero: su reel o su mejor foto de resultado. Nunca stock. */
export const visualSchema = z.object({
  tipo: z.enum(['imagen', 'video']).default('imagen'),
  src: z.string().trim().default(''),
  alt: txt(160).default(''),
  poster: z.string().trim().default(''),
});

export const ctaSchema = z.object({
  /** Primera persona y con el resultado: "Quiero mi evaluación gratis". */
  texto: txt(40).default(''),
  /** Mensaje precargado del deeplink al WhatsApp DE ÉL. */
  mensaje: txt(200).default(''),
});

export const heroSchema = z.object({
  headline: txt(120).default(''),
  /** Caption suyo del que salió el headline. Es la trazabilidad de §3.1. */
  headlineOrigen: txt(400).default(''),
  subheadline: txt(200).default(''),
  visual: visualSchema.default(() => visualSchema.parse({})),
  cta: ctaSchema.default(() => ctaSchema.parse({})),
  /** Exactamente 3 y solo lo que él ya promete en público. */
  badges: z.array(txt(48)).max(3).default([]),
});

export const franjaPruebaSchema = z.object({
  estrellas: z.number().min(0).max(5).nullable().default(null),
  resenas: z.number().int().min(0).nullable().default(null),
  /** "8 años en Valencia" · "+3.400 seguidores publicando desde 2019" */
  etiqueta: txt(80).default(''),
});

export const PRUEBA_TIPOS = ['comentario', 'resena', 'foto'] as const;
export const PRUEBA_FUENTES = ['instagram', 'google', 'doctoralia', 'otra'] as const;

/**
 * Una prueba del muro. `fuente` es obligatoria por diseño: es la barrera
 * contra el testimonio inventado.
 */
export const pruebaSchema = z.object({
  tipo: z.enum(PRUEBA_TIPOS),
  fuente: z.enum(PRUEBA_FUENTES),
  src: z.string().trim().default(''),
  autor: txt(60).default(''),
  texto: txt(400).default(''),
  /** Una línea: quién, qué problema, qué pasó. */
  contexto: txt(120).default(''),
});

export const problemaSchema = z.object({
  headline: txt(120).default(''),
  parrafo: txt(400).default(''),
});

export const pasoSchema = z.object({
  titulo: txt(60).default(''),
  texto: txt(180).default(''),
});

export const comoFuncionaSchema = z.object({
  headline: txt(120).default(''),
  /** Jamás 5 o más: cada paso extra sube el esfuerzo percibido. */
  pasos: z.array(pasoSchema).max(4).default([]),
});

export const incluyeSchema = z.object({
  headline: txt(120).default(''),
  items: z.array(txt(120)).max(8).default([]),
});

export const riesgoSchema = z.object({
  headline: txt(120).default(''),
  texto: txt(400).default(''),
  /** Si él no lo ofrece públicamente, la sección no existe. */
  esPublico: z.boolean().default(false),
});

export const profesionalSchema = z.object({
  bio: txt(400).default(''),
});

export const faqSchema = z.object({
  pregunta: txt(160).default(''),
  respuesta: txt(600).default(''),
  /** Comentario real del que salió la pregunta. Trazabilidad de §4. */
  origenComentario: txt(300).default(''),
});

export const cierreSchema = z.object({
  headline: txt(120).default(''),
  cta: ctaSchema.default(() => ctaSchema.parse({})),
});

/** Schema maestro de `pro_demos.copy`. */
export const outreachSchema = z.object({
  hero: heroSchema.default(() => heroSchema.parse({})),
  franjaPrueba: franjaPruebaSchema.default(() => franjaPruebaSchema.parse({})),
  problema: problemaSchema.default(() => problemaSchema.parse({})),
  comoFunciona: comoFuncionaSchema.default(() => comoFuncionaSchema.parse({})),
  incluye: incluyeSchema.default(() => incluyeSchema.parse({})),
  riesgo: riesgoSchema.default(() => riesgoSchema.parse({})),
  profesional: profesionalSchema.default(() => profesionalSchema.parse({})),
  faq: z.array(faqSchema).max(6).default([]),
  cierre: cierreSchema.default(() => cierreSchema.parse({})),
  /** Máximo 3: más rótulos y la página se lee incompleta, no personalizada. */
  placeholders: z.array(txt(80)).max(3).default([]),
});

/**
 * Schemas por bloque del generador. Dos llamadas en vez de cuatro: el copy de
 * outreach es la mitad que el esqueleto persuasivo, y cada llamada de más a un
 * modelo gratuito es otra oportunidad de que falle.
 */
export const blockSchemas = {
  A: z.object({
    hero: heroSchema,
    franjaPrueba: franjaPruebaSchema,
    problema: problemaSchema,
  }),
  B: z.object({
    comoFunciona: comoFuncionaSchema,
    incluye: incluyeSchema,
    riesgo: riesgoSchema,
    profesional: profesionalSchema,
    faq: z.array(faqSchema).max(6),
    cierre: cierreSchema,
  }),
} as const;

export type BlockKey = keyof typeof blockSchemas;

export type OutreachCopy = z.infer<typeof outreachSchema>;
export type Prueba = z.infer<typeof pruebaSchema>;
export type Paso = z.infer<typeof pasoSchema>;
export type Faq = z.infer<typeof faqSchema>;

export function emptyOutreachCopy(): OutreachCopy {
  return outreachSchema.parse({});
}

/** Nunca lanza: rellena lo que falte y descarta lo que no encaje. */
export function coerceOutreachCopy(raw: unknown): OutreachCopy {
  const parsed = outreachSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;

  // Recuperación por bloque: rescatar lo que sí valide.
  const base = emptyOutreachCopy();
  const src = (raw ?? {}) as Record<string, unknown>;
  const pairs: [keyof OutreachCopy, z.ZodTypeAny][] = [
    ['hero', heroSchema],
    ['franjaPrueba', franjaPruebaSchema],
    ['problema', problemaSchema],
    ['comoFunciona', comoFuncionaSchema],
    ['incluye', incluyeSchema],
    ['riesgo', riesgoSchema],
    ['profesional', profesionalSchema],
    ['faq', z.array(faqSchema).max(6)],
    ['cierre', cierreSchema],
    ['placeholders', z.array(txt(80)).max(3)],
  ];
  for (const [key, schema] of pairs) {
    const r = schema.safeParse(src[key]);
    if (r.success) (base as Record<string, unknown>)[key] = r.data;
  }
  // Segunda pasada: un bloque que no validó por un exceso (5 pasos, 4 badges)
  // se recorta en vez de perderse entero.
  const bruto = src as Record<string, any>;
  if (Array.isArray(bruto?.comoFunciona?.pasos) && !base.comoFunciona.pasos.length) {
    const r = comoFuncionaSchema.safeParse({
      ...bruto.comoFunciona,
      pasos: bruto.comoFunciona.pasos.slice(0, 4),
    });
    if (r.success) base.comoFunciona = r.data;
  }
  if (Array.isArray(bruto?.hero?.badges) && !base.hero.headline) {
    const r = heroSchema.safeParse({ ...bruto.hero, badges: bruto.hero.badges.slice(0, 3) });
    if (r.success) base.hero = r.data;
  }
  return base;
}

/** Solo pruebas con fuente y con algo que mostrar. */
export function coercePruebas(raw: unknown): Prueba[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => pruebaSchema.safeParse(p))
    .filter((r): r is { success: true; data: Prueba } => r.success)
    .map((r) => r.data)
    .filter((p) => p.texto || p.src);
}

// ============================================================
// Validaciones duras del §8. Bloquean el guardado, no el render.
// ============================================================

export interface OutreachInput {
  copy: OutreachCopy;
  pruebas: Prueba[];
  whatsapp: string;
  nombreNegocio: string;
  expira: string | null;
  autoriaMensaje: string;
}

const MAX_DIAS_EXPIRACION = 14;

export function palabras(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Devuelve la lista de incumplimientos. Vacía = se puede guardar.
 * Cada mensaje dice qué corregir, no solo qué está mal.
 */
export function validateOutreach(input: OutreachInput): string[] {
  const { copy: c, pruebas, whatsapp, nombreNegocio, expira, autoriaMensaje } = input;
  const errors: string[] = [];

  if (!whatsapp) {
    errors.push('Falta el WhatsApp del prospecto: sin él la página no funciona y no hay demo.');
  }

  if (c.hero.headline && palabras(c.hero.headline) > 12) {
    errors.push(`El headline tiene ${palabras(c.hero.headline)} palabras. El máximo son 12.`);
  }
  if (
    nombreNegocio &&
    c.hero.headline.toLowerCase().includes(nombreNegocio.toLowerCase().trim())
  ) {
    errors.push(
      'El headline no puede ser el nombre del negocio: debe prometer el resultado que quieren sus pacientes.'
    );
  }
  if (c.hero.badges.length !== 3) {
    errors.push(`Los badges deben ser exactamente 3 (hay ${c.hero.badges.length}).`);
  }

  if (c.comoFunciona.pasos.length > 4) {
    errors.push(`"Cómo funciona" tiene ${c.comoFunciona.pasos.length} pasos. El máximo son 4.`);
  }

  if (pruebas.length < 4) {
    errors.push(`El muro de pruebas necesita al menos 4 (hay ${pruebas.length}).`);
  }
  const sinFuente = pruebas.findIndex((p) => !p.fuente || (!p.texto && !p.src));
  if (sinFuente !== -1) {
    errors.push(
      `La prueba ${sinFuente + 1} no tiene fuente ni contenido. Sin origen público no entra: sería un testimonio inventado.`
    );
  }

  if (!expira) {
    errors.push('Falta la fecha de expiración del link.');
  } else {
    const dias = Math.ceil((new Date(expira).getTime() - Date.now()) / 86_400_000);
    if (Number.isNaN(dias)) errors.push('La fecha de expiración no es válida.');
    else if (dias > MAX_DIAS_EXPIRACION) {
      errors.push(`La expiración está a ${dias} días. El máximo son ${MAX_DIAS_EXPIRACION}.`);
    }
  }

  if (!autoriaMensaje.trim()) {
    errors.push('Falta el mensaje de la barra de autoría: es lo que convierte al prospecto.');
  }

  return errors;
}

/** Fecha por defecto: 7 días, que es la vida del link según §7.3. */
export function defaultExpiry(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isExpired(expira: string | null): boolean {
  if (!expira) return false;
  // Compara por día: el link vive todo su último día.
  return new Date(`${expira}T23:59:59`).getTime() < Date.now();
}
