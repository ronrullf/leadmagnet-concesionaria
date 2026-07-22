/**
 * Los cuatro moods.
 *
 * No son el mismo diseño recoloreado: cambian la familia de display, el peso, el
 * papel y el acento. Un abogado y un fotógrafo de bodas no pueden verse igual, y
 * el profesional lo nota en dos segundos.
 *
 * Prohibido el combo crema #F4F1EA + serif de alto contraste + terracota
 * #D97757: es el aspecto por defecto de toda página generada por IA.
 */
import type { Mood } from './pro-types';

export interface MoodTokens {
  /** Familia de display, ya con fallbacks. */
  display: string;
  displayWeight: number;
  /** Ajuste óptico del titular. Una grotesca y una serif no respiran igual. */
  displayTracking: string;
  body: string;
  paper: string;
  paperAlt: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  /** Familias que hay que pedirle a Google Fonts para este mood. */
  fontQuery: string;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const MONO_QUERY = 'family=JetBrains+Mono:wght@400;500';

export const MOOD_TOKENS: Record<Mood, MoodTokens> = {
  // Médicos, odontólogos, nutricionistas. Limpio, aire, nada de dramatismo.
  clinico: {
    display: '"Instrument Sans", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 600,
    displayTracking: '-0.02em',
    body: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
    paper: '#FCFDFD',
    paperAlt: '#F1F6F7',
    ink: '#101619',
    inkSoft: '#5A676D',
    line: '#DDE6E8',
    accent: '#0E6B7A',
    fontQuery: `family=Instrument+Sans:wght@400;500;600&family=Inter+Tight:wght@400;500;600&${MONO_QUERY}`,
  },

  // Abogados, contadores, asesores. Serif de peso, azul institucional.
  autoridad: {
    display: '"Newsreader", ui-serif, Georgia, serif',
    displayWeight: 600,
    displayTracking: '-0.01em',
    body: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
    paper: '#FAF9F7',
    paperAlt: '#EFEEEA',
    ink: '#14181F',
    inkSoft: '#565E6B',
    line: '#DCDAD4',
    accent: '#1B2A4A',
    fontQuery: `family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Inter+Tight:wght@400;500;600&${MONO_QUERY}`,
  },

  // Coaches, psicólogos, terapeutas. Serif suave, papel tibio, acento tierra.
  calido: {
    display: '"Fraunces", ui-serif, Georgia, serif',
    displayWeight: 600,
    displayTracking: '-0.015em',
    body: '"Karla", ui-sans-serif, system-ui, sans-serif',
    paper: '#FAF7F2',
    paperAlt: '#F0EAE0',
    ink: '#1A1611',
    inkSoft: '#6B6154',
    line: '#E0D8CA',
    accent: '#7A6A4F',
    fontQuery: `family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Karla:wght@400;500;600&${MONO_QUERY}`,
  },

  // Fotógrafos, arquitectos, diseñadores. Blanco puro, contraste duro, sin color.
  editorial: {
    display: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: '-0.035em',
    body: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
    paper: '#FFFFFF',
    paperAlt: '#F4F4F4',
    ink: '#0A0A0A',
    inkSoft: '#5C5C5C',
    line: '#E2E2E2',
    accent: '#141414',
    fontQuery: `family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&family=Inter+Tight:wght@400;500;600&${MONO_QUERY}`,
  },
};

export function moodTokens(mood: string | null | undefined): MoodTokens {
  return MOOD_TOKENS[(mood as Mood) ?? 'clinico'] ?? MOOD_TOKENS.clinico;
}

/** URL de Google Fonts con solo las familias del mood activo. */
export function fontHref(mood: string | null | undefined): string {
  return `https://fonts.googleapis.com/css2?${moodTokens(mood).fontQuery}&display=swap`;
}

export { MONO };
