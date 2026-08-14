/**
 * Linter de strings sobre el copy generado.
 *
 * No bloquea el guardado: marca. Fernando decide. Un linter que rechaza le
 * cuesta veinte minutos de reintentos; un linter que avisa le cuesta diez
 * segundos de lectura y atrapa lo único que de verdad no puede salir a la
 * calle: una afirmación de resultado atribuida a un profesional real.
 */
import type { OutreachCopy } from './outreach-schema';

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

/**
 * Recorre todas las ranuras de texto del copy de outreach.
 *
 * En este modelo NO hay testimonios generados: el muro se llena a mano con
 * pruebas de fuente pública. Por eso `isTestimonial` no se marca en ningún
 * campo — la IA nunca escribe una cita atribuida a un paciente.
 */
function collect(copy: OutreachCopy): Field[] {
  const f: Field[] = [];
  const add = (path: string, value: string) => {
    if (value) f.push({ path, value });
  };

  add('hero.headline', copy.hero.headline);
  add('hero.subheadline', copy.hero.subheadline);
  add('hero.cta.texto', copy.hero.cta.texto);
  copy.hero.badges.forEach((v, i) => add(`hero.badges[${i}]`, v));
  add('franjaPrueba.etiqueta', copy.franjaPrueba.etiqueta);
  add('problema.headline', copy.problema.headline);
  add('problema.parrafo', copy.problema.parrafo);
  add('comoFunciona.headline', copy.comoFunciona.headline);
  copy.comoFunciona.pasos.forEach((p, i) => {
    add(`comoFunciona.pasos[${i}].titulo`, p.titulo);
    add(`comoFunciona.pasos[${i}].texto`, p.texto);
  });
  add('incluye.headline', copy.incluye.headline);
  copy.incluye.items.forEach((v, i) => add(`incluye.items[${i}]`, v));
  add('riesgo.headline', copy.riesgo.headline);
  add('riesgo.texto', copy.riesgo.texto);
  add('profesional.bio', copy.profesional.bio);
  copy.faq.forEach((q, i) => {
    add(`faq[${i}].pregunta`, q.pregunta);
    add(`faq[${i}].respuesta`, q.respuesta);
  });
  add('cierre.headline', copy.cierre.headline);
  add('cierre.cta.texto', copy.cierre.cta.texto);
  return f;
}

export function lintCopy(copy: OutreachCopy): LintFinding[] {
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

  // El headline no puede pasar de 12 palabras: es validación dura al guardar,
  // y detectarlo aquí ahorra un viaje al servidor.
  const palabrasHeadline = copy.hero.headline.trim().split(/\s+/).filter(Boolean).length;
  if (palabrasHeadline > 12) {
    findings.push({
      severity: 'error',
      path: 'hero.headline',
      rule: 'headline-largo',
      match: copy.hero.headline,
      message: `El headline tiene ${palabrasHeadline} palabras; el máximo son 12.`,
    });
  }

  // Exactamente 3 badges, y solo lo que él ya promete en público.
  if (copy.hero.badges.length && copy.hero.badges.length !== 3) {
    findings.push({
      severity: 'error',
      path: 'hero.badges',
      rule: 'badges-incompletos',
      match: String(copy.hero.badges.length),
      message: `Hay ${copy.hero.badges.length} badges; deben ser exactamente 3.`,
    });
  }

  // Más de 4 pasos sube el esfuerzo percibido y rompe la sección.
  if (copy.comoFunciona.pasos.length > 4) {
    findings.push({
      severity: 'error',
      path: 'comoFunciona.pasos',
      rule: 'pasos-de-mas',
      match: String(copy.comoFunciona.pasos.length),
      message: `Hay ${copy.comoFunciona.pasos.length} pasos; el máximo son 4.`,
    });
  }

  // El cierre repite el headline del hero palabra por palabra.
  if (
    copy.hero.headline &&
    copy.cierre.headline &&
    copy.hero.headline.trim() !== copy.cierre.headline.trim()
  ) {
    findings.push({
      severity: 'warn',
      path: 'cierre.headline',
      rule: 'cierre-distinto',
      match: copy.cierre.headline,
      message: `El cierre debería repetir el headline del hero ("${copy.hero.headline}").`,
    });
  }

  // El CTA tiene que ser idéntico en toda la página.
  if (
    copy.hero.cta.texto &&
    copy.cierre.cta.texto &&
    copy.hero.cta.texto !== copy.cierre.cta.texto
  ) {
    findings.push({
      severity: 'warn',
      path: 'cierre.cta.texto',
      rule: 'cta-inconsistente',
      match: copy.cierre.cta.texto,
      message: `El CTA del cierre no coincide con el del hero ("${copy.hero.cta.texto}").`,
    });
  }

  return findings;
}
