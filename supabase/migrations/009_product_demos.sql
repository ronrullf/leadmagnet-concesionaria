-- Demo Fantasma · migración 009: landings de productos y servicios
-- Ejecutar en el SQL Editor de Supabase después de 008_outreach_landings.sql.
--
-- Tabla independiente `product_demos` para promocionar productos físicos y servicios
-- de alto valor en Venezuela (generadores, plantas eléctricas, inversores de voltaje,
-- paneles solares, repuestos marinos, equipos industriales, etc.).
-- Prefijo público: /producto/<slug>

create table if not exists product_demos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  created_at        timestamptz default now(),

  -- Identidad del producto y empresa
  product_name      text not null,          -- "Planta Eléctrica Generac Dual Fuel 12kW"
  business_name     text not null,          -- "ElectroSol Venezuela"
  niche_key         text not null,          -- plantas-electricas | paneles-solares | inversores-baterias | repuestos-marinos | generico
  city              text,
  instagram_handle  text,
  followers         int,

  -- Multimedia & Identidad visual
  photo_hero_url    text,
  photo_story_url   text,
  logo_url          text,
  gallery           jsonb,                  -- array de URLs de imágenes del producto

  -- Datos de oferta & Ficha técnica
  price_usd         numeric(10,2),          -- precio de lista o referencial
  guarantee_info    text,                   -- "1 año de garantía escrita + servicio técnico"
  specs             jsonb,                  -- array de [{ title, value, icon, description }]

  -- Marca visual
  mood              text default 'industrial', -- industrial|solar|electric|marino|premium|minimal
  accent_hex        text,                   -- sobreescribe color de botón CTA
  bg_hex            text,                   -- sobreescribe fondo
  text_hex          text,                   -- sobreescribe texto

  -- Conversión
  whatsapp_e164     text not null,          -- "584141234567" sin + ni espacios
  booking_url       text,
  cta_mode          text default 'directo', -- directo|formulario
  cta_form_title    text,

  -- Copywriting estructurado (Zod validated JSONB)
  copy              jsonb not null,

  -- Vida del link y autoría
  expira            date,                   -- fecha de vencimiento (máx 14 días)
  muro_pruebas      jsonb,                  -- testimonios / fotos de clientes / instalaciones (opcional)
  autoria_mensaje   text,                   -- mensaje hacia el WhatsApp de TiendaPana (opcional)

  is_active         boolean default true,
  copy_source       text default 'ia',       -- ia|manual|mixto
  notes             text
);

create index if not exists product_demos_slug_active_idx
  on product_demos (slug) where is_active;

-- ============================================================
-- Tabla product_demo_visits
-- ============================================================
create table if not exists product_demo_visits (
  id                bigserial primary key,
  product_demo_id   uuid references product_demos(id) on delete cascade,
  visited_at        timestamptz default now(),
  path              text,
  referrer          text,
  user_agent        text,
  is_owner_view     boolean default false
);

create index if not exists product_demo_visits_product_demo_id_idx
  on product_demo_visits (product_demo_id);

-- ============================================================
-- RLS
-- ============================================================
alter table product_demos enable row level security;
alter table product_demo_visits enable row level security;

drop policy if exists "product_demos_public_read" on product_demos;
create policy "product_demos_public_read" on product_demos
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "product_demo_visits_public_insert" on product_demo_visits;
create policy "product_demo_visits_public_insert" on product_demo_visits
  for insert to anon, authenticated
  with check (true);
