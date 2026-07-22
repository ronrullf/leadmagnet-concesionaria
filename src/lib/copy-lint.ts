/**
 * Linter de strings sobre el copy generado.
 *
 * No bloquea el guardado: marca. Fernando decide. Un linter que rechaza le
 * cuesta veinte minutos de reintentos; un linter que avisa le cuesta diez
 * segundos de lectura y atrapa lo único que de verdad no puede salir a la
 * calle: una afirmación de resultado atribuida a un profesional real.
 */
import type { ProCopy } from './copy-schema';

export type LintSeverity = 'error' | 'warn';

export interface LintFinding {
  severity: LintSeverity;
  path: string;
  rule: string;
  match: string;
  message: string;
}

/**
 * Afirmaciones de resultado clínico, legal o financiero. En un testimonio
 * atribuido a un profesional colegiado son una afirmación regulada, y el
 * problema se lo causa el primer contacto en frío. Esto es error, no aviso.
 */
const RESULT_CLAIMS: RegExp[] = [
  /\bme cur[óo]\b/i,
  /\bme san[óo]\b/i,
  /\bsan[ée]\b/i,
  /\bgan[óo] mi caso\b/i,
  /\bgan(?:amos|é) el caso\b/i,
  /\bme aprobaron\b/i,
  /\baprobaron mi\b/i,
  /\bme elimin[óo]\b/i,
  /\bme quit[óo]\b/i,
  /\bresolvi[óo] mi\b/i,
  /\bbaj[ée]\s+\d+/i,
  /\b\d+\s*kilos?\b/i,
  /\ben\s+\d+\s*(?:d[íi]as?|semanas?|meses?)\b/i,
  /\bme dieron la (?:visa|residencia)\b/i,
];

/** Patrones que delatan texto generado. Del bloque PROHIBIDO del system prompt. */
const GENERIC_PHRASES: RegExp[] = [
  /\ben el mundo actual\b/i,
  /\bhoy en d[íi]a\b/i,
  /\ben la era digital\b/i,
  /\bdescubre el poder de\b/i,
  /\beleva tu\b/i,
  /\btransforma tu\b/i,
  /\bal siguiente nivel\b/i,
  /\bsoluciones integrales\b/i,
  /\bexperiencia [úu]nica\b/i,
  /\batenci[óo]n personalizada\b/i,
  /\bimagina por un momento\b/i,
];

/**
 * Testimonio genérico: el que serviría igual para un dermatólogo, un abogado y
 * un fotógrafo de bodas. Es el modo de fallo más común del modelo, porque estas
 * frases son el centro de gravedad de todo el texto de testimonios que existe.
 *
 * Un testimonio así no prueba nada y delata plantilla justo en la sección cuyo
 * único trabajo es dar credibilidad. Se trata como error para que dispare el
 * reintento guiado del generador.
 */
const GENERIC_TESTIMONIAL: RegExp[] = [
  /sal[íi] sabiendo (?:exactamente )?qu[ée] ten[íi]a/i,
  /nadie me lo hab[íi]a explicado/i,
  /me explic[óo] cada (?:paso|detalle)/i,
  /nunca me sent[íi] perdid[ao]/i,
  /por primera vez tuve un plan/i,
  /me sent[íi] escuchad[ao]/i,
  /me sent[íi] acompañad[ao]/i,
  /me escuch[óo] de verdad/i,
  /con (?:mucha )?(?:calma y )?paciencia/i,
  /desde (?:el primer momento|la primera (?:cita|sesi[óo]n|consulta))/i,
  /atenci[óo]n de primera/i,
  /100%\s*recomendad/i,
];

interface Field {
  path: string;
  value: string;
  /** Los testimonios son el único sitio donde una afirmación de resultado es grave. */
  isTestimonial?: boolean;
}

function collect(copy: ProCopy): Field[] {
  const f: Field[] = [];
  const add = (path: string, value: string, isTestimonial = false) => {
    if (value) f.push({ path, value, isTestimonial });
  };

  add('hero.callout', copy.hero.callout);
  add('hero.headline', copy.hero.headline);
  add('hero.subheadline', copy.hero.subheadline);
  add('hero.cta_label', copy.hero.cta_label);
  copy.qualify.yes.forEach((v, i) => add(`qualify.yes[${i}]`, v));
  copy.qualify.no.forEach((v, i) => add(`qualify.no[${i}]`, v));
  (['backstory', 'wall', 'epiphany', 'plan', 'result'] as const).forEach((k) =>
    add(`story.${k}`, copy.story[k])
  );
  (['name', 'old_way', 'new_way', 'why_different'] as const).forEach((k) =>
    add(`opportunity.${k}`, copy.opportunity[k])
  );
  copy.secrets.forEach((s, i) => {
    add(`secrets[${i}].title`, s.title);
    add(`secrets[${i}].body`, s.body);
    add(`secrets[${i}].proof`, s.proof);
  });
  add('offer.program_name', copy.offer.program_name);
  add('offer.total_label', copy.offer.total_label);
  copy.offer.items.forEach((it, i) => {
    add(`offer.items[${i}].title`, it.title);
    add(`offer.items[${i}].description`, it.description);
    add(`offer.items[${i}].value_label`, it.value_label);
  });
  copy.proof.testimonials.forEach((t, i) => {
    add(`proof.testimonials[${i}].quote`, t.quote, true);
    add(`proof.testimonials[${i}].author`, t.author);
  });
  add('inaction.headline', copy.inaction.headline);
  copy.inaction.items.forEach((v, i) => add(`inaction.items[${i}]`, v));
  add('inaction.close', copy.inaction.close);
  add('guarantee.title', copy.guarantee.title);
  add('guarantee.body', copy.guarantee.body);
  copy.faqs.forEach((q, i) => {
    add(`faqs[${i}].q`, q.q);
    add(`faqs[${i}].a`, q.a);
  });
  add('closing.headline', copy.closing.headline);
  add('closing.cta_label', copy.closing.cta_label);
  return f;
}

export function lintCopy(copy: ProCopy): LintFinding[] {
  const findings: LintFinding[] = [];

  for (const field of collect(copy)) {
    for (const re of RESULT_CLAIMS) {
      const m = field.value.match(re);
      if (!m) continue;
      findings.push({
        severity: field.isTestimonial ? 'error' : 'warn',
        path: field.path,
        rule: 'afirmacion-de-resultado',
        match: m[0],
        message: field.isTestimonial
          ? 'Testimonio que afirma un resultado. No puede salir así: es una afirmación regulada sobre un profesional real.'
          : 'Afirmación de resultado. Revisa que no comprometa al profesional.',
      });
    }

    // Solo se persigue dentro de los testimonios: en un FAQ o en la garantía,
    // "le explico cada paso" es una promesa legítima del profesional.
    if (field.isTestimonial) {
      for (const re of GENERIC_TESTIMONIAL) {
        const m = field.value.match(re);
        if (m) {
          findings.push({
            severity: 'error',
            path: field.path,
            rule: 'testimonio-generico',
            match: m[0],
            message:
              'Testimonio que serviría igual para cualquier profesional. No prueba nada y delata plantilla.',
          });
        }
      }
    }

    for (const re of GENERIC_PHRASES) {
      const m = field.value.match(re);
      if (m) {
        findings.push({
          severity: 'warn',
          path: field.path,
          rule: 'frase-generica',
          match: m[0],
          message: 'Muletilla de la lista de prohibidos. Delata texto generado.',
        });
      }
    }
  }

  // Dos testimonios con el mismo autor delatan plantilla.
  const authors = copy.proof.testimonials.map((t) => t.author.toLowerCase().trim()).filter(Boolean);
  if (authors.length === 2 && authors[0] === authors[1]) {
    findings.push({
      severity: 'warn',
      path: 'proof.testimonials',
      rule: 'autor-repetido',
      match: authors[0],
      message: 'Los dos testimonios llevan el mismo nombre.',
    });
  }

  // La IA nunca llena credentials: son afirmaciones verificables sobre alguien real.
  if (copy.proof.credentials.length > 0) {
    findings.push({
      severity: 'error',
      path: 'proof.credentials',
      rule: 'credencial-generada',
      match: copy.proof.credentials[0],
      message: 'Las credenciales solo se llenan a mano con el input real.',
    });
  }

  // El CTA tiene que ser idéntico en toda la página.
  if (
    copy.hero.cta_label &&
    copy.closing.cta_label &&
    copy.hero.cta_label !== copy.closing.cta_label
  ) {
    findings.push({
      severity: 'warn',
      path: 'closing.cta_label',
      rule: 'cta-inconsistente',
      match: copy.closing.cta_label,
      message: `El CTA del cierre no coincide con el del hero ("${copy.hero.cta_label}").`,
    });
  }

  return findings;
}
