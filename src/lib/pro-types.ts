import type { ProCopy } from './copy-schema';

export type Mood = 'clinico' | 'autoridad' | 'calido' | 'editorial';

export const MOODS: Mood[] = ['clinico', 'autoridad', 'calido', 'editorial'];

/**
 * Un cupo de la franja de agenda. Los cupos son reales o la sección no existe:
 * la escasez falsa es la forma más rápida de que un profesional serio descarte
 * la propuesta.
 */
export interface Slot {
  day: string;               // "JUE 24"
  time: string;              // "9:00 AM"
  status: 'open' | 'taken';
  remaining?: number;        // solo cuando status === 'open'
}

export interface ProDemo {
  id: string;
  slug: string;
  created_at: string;

  pro_name: string;
  pro_title: string;
  profession_key: string;
  city: string | null;
  instagram_handle: string | null;
  followers: number | null;
  photo_hero_url: string | null;
  photo_story_url: string | null;
  logo_url: string | null;

  mood: Mood;
  accent_hex: string | null;

  whatsapp_e164: string;
  booking_url: string | null;

  copy: ProCopy;

  slots: Slot[] | null;
  monthly_capacity: number | null;
  slots_remaining: number | null;

  is_active: boolean;
  copy_source: 'ia' | 'manual' | 'mixto' | null;
  notes: string | null;
}

/**
 * Contexto de una profesión. Un JSON por profesión en
 * /src/data/profession-packs/. Agregar una profesión no toca código.
 */
export interface ProfessionPack {
  key: string;
  label: string;
  default_mood: Mood;
  failing_behaviors: string[];
  typical_objections: string[];
  urgency_lever: string;
  main_pain: string;
  dream_outcome: string;
  vocabulary: string[];
}
