export type Vertical = 'inmobiliaria' | 'concesionario';

export interface Demo {
  id: string;
  slug: string;
  created_at: string;
  vertical: Vertical;

  agency_name: string;
  agency_tagline: string | null;
  agency_city: string;
  agency_logo_url: string | null;
  accent_hex: string;
  instagram_handle: string | null;

  whatsapp_e164: string;
  contact_email: string | null;
  office_address: string | null;
  maps_query: string | null;

  years_operating: number | null;
  properties_sold: number | null;
  testimonial_text: string | null;
  testimonial_author: string | null;

  mode: 'rapido' | 'completo';
  is_active: boolean;
  notes: string | null;
}

export interface Property {
  id: string;
  demo_id: string;
  sort_order: number;

  ref_code: string;
  title: string;
  operation: 'venta' | 'alquiler';
  property_type: 'apartamento' | 'casa' | 'terreno' | 'local' | 'quinta';

  price_usd: number;
  location: string;

  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  area_m2: number | null;

  description: string | null;
  features: string[] | null;
  image_urls: string[];
  maps_query: string | null;
  is_featured: boolean;
}

export interface Vehicle {
  id: string;
  demo_id: string;
  sort_order: number;

  ref_code: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  condition: 'nuevo' | 'usado';
  vehicle_type: string | null;

  price_usd: number;
  mileage_km: number | null;
  transmission: string | null;
  fuel: string | null;
  color: string | null;

  is_import: boolean;
  import_wait: string | null;

  description: string | null;
  features: string[] | null;
  image_urls: string[];
  is_featured: boolean;
}

export interface BcvRate {
  rate: number;
  fetched_at: string | null;
}
