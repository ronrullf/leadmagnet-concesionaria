import type { OutreachCopy, Prueba } from './outreach-schema';

export const PRODUCT_MOODS = ['industrial', 'solar', 'electric', 'marino', 'premium', 'minimal'] as const;
export type ProductMood = (typeof PRODUCT_MOODS)[number];

export const PRODUCT_SPEC_ICONS = [
  'rayo',
  'sol',
  'bateria',
  'motor',
  'escudo',
  'camion',
  'llave',
  'estrella',
  'medida',
  'ruido',
] as const;
export type ProductSpecIcon = (typeof PRODUCT_SPEC_ICONS)[number];

export interface ProductSpec {
  title: string;
  value?: string;
  icon?: ProductSpecIcon;
  description?: string;
}

export interface ProductDemo {
  id?: string;
  slug: string;
  created_at?: string;

  // Identidad
  product_name: string;
  business_name: string;
  niche_key: string;
  city?: string | null;
  instagram_handle?: string | null;
  followers?: number | null;

  // Multimedia
  photo_hero_url?: string | null;
  photo_story_url?: string | null;
  logo_url?: string | null;
  gallery?: string[] | null;

  // Ficha técnica & Oferta
  price_usd?: number | null;
  guarantee_info?: string | null;
  specs?: ProductSpec[] | null;

  // Marca visual
  mood?: ProductMood;
  accent_hex?: string | null;
  bg_hex?: string | null;
  text_hex?: string | null;

  // Conversión
  whatsapp_e164: string;
  booking_url?: string | null;
  cta_mode?: 'directo' | 'formulario';
  cta_form_title?: string | null;

  // Copy Zod
  copy: OutreachCopy;

  // Vida del link y autoría
  expira?: string | null;
  muro_pruebas?: Prueba[] | null;
  autoria_mensaje?: string | null;

  is_active?: boolean;
  copy_source?: 'ia' | 'manual' | 'mixto';
  notes?: string | null;
}

export interface ProductPack {
  key: string;
  label: string;
  default_mood: ProductMood;
  main_pain: string;
  dream_outcome: string;
  urgency_lever: string;
  failing_behaviors: string[];
  typical_objections: string[];
  vocabulary: string[];
  default_specs: ProductSpec[];
}
