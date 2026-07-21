-- Demo Fantasma · migración 002: soporte para concesionarios
-- Ejecutar en el SQL Editor de Supabase después de 001_init.sql.

-- ============================================================
-- demos: vertical del negocio
-- ============================================================
alter table demos
  add column if not exists vertical text not null default 'inmobiliaria';
-- valores: 'inmobiliaria' | 'concesionario'

-- ============================================================
-- Tabla vehicles
-- ============================================================
create table if not exists vehicles (
  id            uuid primary key default gen_random_uuid(),
  demo_id       uuid references demos(id) on delete cascade,
  sort_order    int default 0,

  ref_code      text not null,          -- "C-001"
  title         text not null,          -- "Toyota Corolla SE 2022"
  brand         text,                   -- "Toyota"
  model         text,                   -- "Corolla SE"
  year          int,                    -- 2022
  condition     text not null default 'usado',  -- 'nuevo' | 'usado'
  vehicle_type  text,                   -- 'sedan'|'suv'|'pickup'|'hatchback'|'camioneta'|'moto'|'camion'

  price_usd     numeric not null,
  mileage_km    int,                    -- 0 para nuevos
  transmission  text,                   -- 'automatica' | 'sincronica'
  fuel          text,                   -- 'gasolina'|'diesel'|'hibrido'|'electrico'
  color         text,

  -- Importación
  is_import     boolean default false,
  import_wait   text,                   -- "45-60 días" (tiempo de espera estimado)

  description   text,
  features      text[],                 -- ['Cámara de reversa', 'Asientos de cuero']
  image_urls    text[] not null,
  is_featured   boolean default false
);

create index if not exists vehicles_demo_id_idx on vehicles (demo_id);

-- ============================================================
-- RLS (mismo patrón que properties)
-- ============================================================
alter table vehicles enable row level security;

create policy "vehicles_public_read" on vehicles
  for select to anon, authenticated
  using (exists (
    select 1 from demos d where d.id = vehicles.demo_id and d.is_active = true
  ));
