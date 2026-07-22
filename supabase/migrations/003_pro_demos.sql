-- Demo Fantasma · migración 003: landings de profesionales
-- Ejecutar en el SQL Editor de Supabase después de 002_concesionarios.sql.
--
-- Tabla independiente de `demos`. No comparte columnas con inmobiliarias ni
-- concesionarios: el esqueleto persuasivo es otro y el copy vive en un JSONB.
-- El prefijo público es /p/ para no colisionar con los slugs de `demos`.

create table if not exists pro_demos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  created_at        timestamptz default now(),

  -- Identidad
  pro_name          text not null,          -- "Dra. Mariana Rojas"
  pro_title         text not null,          -- "Dermatóloga · Caracas"
  profession_key    text not null,          -- llave del profession-pack
  city              text,
  instagram_handle  text,
  followers         int,
  photo_hero_url    text,
  photo_story_url   text,
  logo_url          text,

  -- Dirección visual
  mood              text default 'clinico', -- clinico|autoridad|calido|editorial
  accent_hex        text,                   -- si existe, sobreescribe el acento del mood

  -- Conversión
  whatsapp_e164     text not null,          -- "584141234567" sin + ni espacios
  booking_url       text,

  -- Las ~40 ranuras de copy. Validado contra Zod antes de guardar.
  copy              jsonb not null,

  -- Franja de agenda. null oculta la sección entera (escasez real o nada).
  slots             jsonb,
  monthly_capacity  int,
  slots_remaining   int,

  is_active         boolean default true,
  copy_source       text,                   -- ia|manual|mixto
  notes             text
);

create index if not exists pro_demos_slug_active_idx
  on pro_demos (slug) where is_active;

-- ============================================================
-- Tabla pro_demo_visits
-- Tabla propia en vez de reusar demo_visits: aquella tiene FK a demos(id)
-- y un id de pro_demos la violaría.
-- ============================================================
create table if not exists pro_demo_visits (
  id            bigserial primary key,
  pro_demo_id   uuid references pro_demos(id) on delete cascade,
  visited_at    timestamptz default now(),
  path          text,
  referrer      text,
  user_agent    text,
  is_owner_view boolean default false
);

create index if not exists pro_demo_visits_pro_demo_id_idx
  on pro_demo_visits (pro_demo_id);

-- ============================================================
-- RLS
-- ============================================================
alter table pro_demos enable row level security;
alter table pro_demo_visits enable row level security;

-- Lectura pública solo de demos activos. Escritura solo service_role.
drop policy if exists "pro_demos_public_read" on pro_demos;
create policy "pro_demos_public_read" on pro_demos
  for select to anon, authenticated
  using (is_active = true);

-- Insert público, lectura solo service_role (sin policy de select).
drop policy if exists "pro_demo_visits_public_insert" on pro_demo_visits;
create policy "pro_demo_visits_public_insert" on pro_demo_visits
  for insert to anon, authenticated
  with check (true);
