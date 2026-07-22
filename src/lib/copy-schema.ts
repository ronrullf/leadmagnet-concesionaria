/**
 * Contrato del objeto `copy` de pro_demos.
 *
 * Es la frontera entre el generador de IA y el render. Nada llega a la BD sin
 * pasar por aquí. Dos reglas gobiernan el diseño de este schema:
 *
 * 1. Toda ranura acepta "" y todo arreglo acepta []. Un bloque que la IA falló
 *    se guarda vacío y Fernando lo escribe a mano; nunca se pierde el resto.
 *    Por eso el render omite secciones vacías en vez de confiar en el schema.
 *
 * 2. Los límites de caracteres son los del spec del generador. Se validan al
 *    guardar, no al renderizar: un copy legado que se pasa por 3 caracteres no
 *    puede tumbar la landing de un profesional en producción.
 */
import { z } from 'zod';

/**
 * Margen sobre el límite de diseño antes de rechazar una ranura.
 *
 * El límite de caracteres es una restricción de MAQUETA, no de corrección. Un
 * modelo pequeño se pasa por diez o quince caracteres constantemente, y
 * rechazar el bloque entero por eso cuesta doce ranuras que Fernando termina
 * escribiendo a mano. Se acepta con holgura, se marca el excedente en el
 * reporte, y él lo recorta en el editor en diez segundos.
 *
 * Truncar automáticamente sería peor: parte la frase a mitad de idea y el copy
 * queda sin cierre. Mejor un texto largo que un texto mutilado.
 */
const TOLERANCE = 1.35;

/** Texto de ranura: recorta espacios y tolera vacío. */
const slot = (max: number) => z.string().trim().max(Math.ceil(max * TOLERANCE));

export const heroSchema = z.object({
  callout: slot(70),
  headline: slot(65),
  subheadline: slot(160),
  cta_label: slot(32),
});

export const qualifySchema = z.object({
  yes: z.array(slot(85)).max(3),
  no: z.array(slot(85)).max(2),
});

export const opportunitySchema = z.object({
  name: slot(40),
  old_way: slot(180),
  new_way: slot(180),
  why_different: slot(200),
});

export const storySchema = z.object({
  backstory: slot(140),
  wall: slot(140),
  epiphany: slot(140),
  plan: slot(140),
  result: slot(140),
});

export const SECRET_TYPES = ['vehicle', 'internal', 'external'] as const;

export const secretSchema = z.object({
  type: z.enum(SECRET_TYPES),
  title: slot(60),
  body: slot(280),
  proof: slot(120),
});

export const offerItemSchema = z.object({
  title: slot(55),
  description: slot(150),
  value_label: slot(30),
});

export const offerSchema = z.object({
  program_name: slot(45),
  items: z.array(offerItemSchema).max(5),
  total_label: slot(60),
  /** null por defecto: calificar por DM antes de que el precio espante en frío. */
  price_display: z.string().trim().max(40).nullable().default(null),
});

export const testimonialSchema = z.object({
  quote: slot(200),
  author: slot(60),
  context: slot(50),
});

export const metricSchema = z.object({
  number: slot(12),
  label: slot(40),
});

export const proofSchema = z.object({
  /** Solo lo que venga en el input. Nunca generadas. Ver §5 del spec. */
  credentials: z.array(slot(120)).max(6),
  testimonials: z.array(testimonialSchema).max(2),
  metrics: z.array(metricSchema).max(3),
});

export const inactionSchema = z.object({
  headline: slot(70),
  items: z.array(slot(130)).max(3),
  close: slot(150),
});

export const guaranteeSchema = z.object({
  title: slot(50),
  body: slot(220),
});

export const faqSchema = z.object({
  q: slot(120),
  a: slot(400),
});

export const closingSchema = z.object({
  headline: slot(70),
  cta_label: slot(32),
});

/** Schema maestro. Lo que se guarda en pro_demos.copy. */
export const copySchema = z.object({
  hero: heroSchema,
  qualify: qualifySchema,
  story: storySchema,
  opportunity: opportunitySchema,
  secrets: z.array(secretSchema).max(3),
  offer: offerSchema,
  proof: proofSchema,
  inaction: inactionSchema,
  guarantee: guaranteeSchema,
  faqs: z.array(faqSchema).max(4),
  closing: closingSchema,
});

export type ProCopy = z.infer<typeof copySchema>;
export type Secret = z.infer<typeof secretSchema>;
export type OfferItem = z.infer<typeof offerItemSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Faq = z.infer<typeof faqSchema>;

/**
 * Schemas por bloque del generador. Cada llamada valida solo lo suyo, para que
 * un bloque C inválido no invalide A, B y D.
 */
export const blockSchemas = {
  A: z.object({ hero: heroSchema, qualify: qualifySchema, opportunity: opportunitySchema }),
  B: z.object({ story: storySchema, secrets: z.array(secretSchema).max(3) }),
  C: z.object({ offer: offerSchema, inaction: inactionSchema, guarantee: guaranteeSchema }),
  D: z.object({
    proof: proofSchema.omit({ credentials: true }),
    faqs: z.array(faqSchema).max(4),
    closing: closingSchema,
  }),
} as const;

export type BlockKey = keyof typeof blockSchemas;

/** Copy vacío. Base para ensamblar bloques y para el editor manual. */
export function emptyCopy(): ProCopy {
  return {
    hero: { callout: '', headline: '', subheadline: '', cta_label: '' },
    qualify: { yes: [], no: [] },
    story: { backstory: '', wall: '', epiphany: '', plan: '', result: '' },
    opportunity: { name: '', old_way: '', new_way: '', why_different: '' },
    secrets: [],
    offer: { program_name: '', items: [], total_label: '', price_display: null },
    proof: { credentials: [], testimonials: [], metrics: [] },
    inaction: { headline: '', items: [], close: '' },
    guarantee: { title: '', body: '' },
    faqs: [],
    closing: { headline: '', cta_label: '' },
  };
}

/**
 * Límites de diseño por ranura. Son los del spec del generador: lo que cabe en
 * la maqueta. Zod acepta hasta TOLERANCE por encima; esto es lo que el contador
 * del editor pinta en rojo y lo que reporta findOverflows.
 */
export const SLOT_LIMITS = {
  'hero.callout': 70,
  'hero.headline': 65,
  'hero.subheadline': 160,
  'hero.cta_label': 32,
  'qualify.yes[]': 85,
  'qualify.no[]': 85,
  'story.backstory': 140,
  'story.wall': 140,
  'story.epiphany': 140,
  'story.plan': 140,
  'story.result': 140,
  'opportunity.name': 40,
  'opportunity.old_way': 180,
  'opportunity.new_way': 180,
  'opportunity.why_different': 200,
  'secrets[].title': 60,
  'secrets[].body': 280,
  'secrets[].proof': 120,
  'offer.program_name': 45,
  'offer.items[].title': 55,
  'offer.items[].description': 150,
  'offer.items[].value_label': 30,
  'offer.total_label': 60,
  'proof.testimonials[].quote': 200,
  'proof.testimonials[].context': 50,
  'inaction.headline': 70,
  'inaction.items[]': 130,
  'inaction.close': 150,
  'guarantee.title': 50,
  'guarantee.body': 220,
  'closing.headline': 70,
  'closing.cta_label': 32,
} as const;

export interface Overflow {
  path: string;
  limit: number;
  length: number;
}

/**
 * Ranuras que pasaron el límite de diseño. No son errores: el copy se guarda
 * igual. El editor las marca para que Fernando las recorte.
 */
export function findOverflows(copy: ProCopy): Overflow[] {
  const out: Overflow[] = [];

  const check = (path: string, value: string, key = path) => {
    const limit = SLOT_LIMITS[key as keyof typeof SLOT_LIMITS];
    if (limit && value.length > limit) out.push({ path, limit, length: value.length });
  };

  check('hero.callout', copy.hero.callout);
  check('hero.headline', copy.hero.headline);
  check('hero.subheadline', copy.hero.subheadline);
  check('hero.cta_label', copy.hero.cta_label);

  copy.qualify.yes.forEach((v, i) => check(`qualify.yes[${i}]`, v, 'qualify.yes[]'));
  copy.qualify.no.forEach((v, i) => check(`qualify.no[${i}]`, v, 'qualify.no[]'));

  (['backstory', 'wall', 'epiphany', 'plan', 'result'] as const).forEach((k) =>
    check(`story.${k}`, copy.story[k])
  );
  (['name', 'old_way', 'new_way', 'why_different'] as const).forEach((k) =>
    check(`opportunity.${k}`, copy.opportunity[k])
  );

  copy.secrets.forEach((s, i) => {
    check(`secrets[${i}].title`, s.title, 'secrets[].title');
    check(`secrets[${i}].body`, s.body, 'secrets[].body');
    check(`secrets[${i}].proof`, s.proof, 'secrets[].proof');
  });

  check('offer.program_name', copy.offer.program_name);
  check('offer.total_label', copy.offer.total_label);
  copy.offer.items.forEach((it, i) => {
    check(`offer.items[${i}].title`, it.title, 'offer.items[].title');
    check(`offer.items[${i}].description`, it.description, 'offer.items[].description');
    check(`offer.items[${i}].value_label`, it.value_label, 'offer.items[].value_label');
  });

  copy.proof.testimonials.forEach((t, i) => {
    check(`proof.testimonials[${i}].quote`, t.quote, 'proof.testimonials[].quote');
    check(`proof.testimonials[${i}].context`, t.context, 'proof.testimonials[].context');
  });

  check('inaction.headline', copy.inaction.headline);
  check('inaction.close', copy.inaction.close);
  copy.inaction.items.forEach((v, i) => check(`inaction.items[${i}]`, v, 'inaction.items[]'));

  check('guarantee.title', copy.guarantee.title);
  check('guarantee.body', copy.guarantee.body);
  check('closing.headline', copy.closing.headline);
  check('closing.cta_label', copy.closing.cta_label);

  return out;
}

/**
 * Normaliza copy que ya vive en BD. Nunca lanza: rellena lo que falte con
 * vacíos y descarta lo que no encaje. El render decide qué omitir.
 */
export function coerceCopy(raw: unknown): ProCopy {
  const base = emptyCopy();
  if (!raw || typeof raw !== 'object') return base;

  const parsed = copySchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Recuperación por bloque: rescatar lo que sí valide.
  const src = raw as Record<string, unknown>;
  const pairs: [keyof ProCopy, z.ZodTypeAny][] = [
    ['hero', heroSchema],
    ['qualify', qualifySchema],
    ['story', storySchema],
    ['opportunity', opportunitySchema],
    ['secrets', z.array(secretSchema).max(3)],
    ['offer', offerSchema],
    ['proof', proofSchema],
    ['inaction', inactionSchema],
    ['guarantee', guaranteeSchema],
    ['faqs', z.array(faqSchema).max(4)],
    ['closing', closingSchema],
  ];

  for (const [key, schema] of pairs) {
    const result = schema.safeParse(src[key]);
    if (result.success) (base as Record<string, unknown>)[key] = result.data;
  }
  return base;
}
