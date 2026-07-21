-- Demo Fantasma — Inmobiliarias · migración inicial
-- Ejecutar en el SQL Editor de Supabase (o via supabase db push).

-- ============================================================
-- Tabla demos
-- ============================================================
create table if not exists demos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  created_at        timestamptz default now(),

  -- Identidad de la agencia
  agency_name       text not null,
  agency_tagline    text,
  agency_city       text not null,
  agency_logo_url   text,
  accent_hex        text default '#0F5C4E',
  instagram_handle  text,

  -- Contacto
  whatsapp_e164     text not null,
  contact_email     text,
  office_address    text,
  maps_query        text,

  -- Prueba social
  years_operating   int,
  properties_sold   int,
  testimonial_text  text,
  testimonial_author text,

  -- Control
  mode              text default 'rapido',
  is_active         boolean default true,
  notes             text
);

-- ============================================================
-- Tabla properties
-- ============================================================
create table if not exists properties (
  id            uuid primary key default gen_random_uuid(),
  demo_id       uuid references demos(id) on delete cascade,
  sort_order    int default 0,

  ref_code      text not null,
  title         text not null,
  operation     text not null,
  property_type text not null,

  price_usd     numeric not null,
  location      text not null,

  bedrooms      int,
  bathrooms     int,
  parking       int,
  area_m2       int,

  description   text,
  features      text[],
  image_urls    text[] not null,
  maps_query    text,
  is_featured   boolean default false
);

create index if not exists properties_demo_id_idx on properties (demo_id);

-- ============================================================
-- Tabla demo_visits
-- ============================================================
create table if not exists demo_visits (
  id            bigserial primary key,
  demo_id       uuid references demos(id) on delete cascade,
  visited_at    timestamptz default now(),
  path          text,
  referrer      text,
  user_agent    text,
  is_owner_view boolean default false
);

create index if not exists demo_visits_demo_id_idx on demo_visits (demo_id);

-- ============================================================
-- Tabla bcv_rate (cache de un solo registro)
-- ============================================================
create table if not exists bcv_rate (
  id          int primary key default 1,
  rate        numeric not null,
  fetched_at  timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table demos enable row level security;
alter table properties enable row level security;
alter table demo_visits enable row level security;
alter table bcv_rate enable row level security;

-- demos: lectura pública solo de demos activos. Escritura solo service_role.
create policy "demos_public_read" on demos
  for select to anon, authenticated
  using (is_active = true);

-- properties: lectura pública solo si su demo está activo.
create policy "properties_public_read" on properties
  for select to anon, authenticated
  using (exists (
    select 1 from demos d where d.id = properties.demo_id and d.is_active = true
  ));

-- demo_visits: insert público, lectura solo service_role (sin policy de select).
create policy "demo_visits_public_insert" on demo_visits
  for insert to anon, authenticated
  with check (true);

-- bcv_rate: lectura pública, escritura solo service_role.
create policy "bcv_rate_public_read" on bcv_rate
  for select to anon, authenticated
  using (true);

-- ============================================================
-- Storage: bucket público demo-media
-- ============================================================
insert into storage.buckets (id, name, public)
values ('demo-media', 'demo-media', true)
on conflict (id) do nothing;

-- Lectura pública de objetos del bucket. La escritura queda para service_role
-- (el uploader del admin sube a través del servidor).
create policy "demo_media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'demo-media');
