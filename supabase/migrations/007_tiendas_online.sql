-- Demo Fantasma · migración 007: tiendas online de Instagram
-- Ejecutar en el SQL Editor de Supabase después de 006.
--
-- Tercera vertical del sistema de `demos`. Misma mecánica que vehicles:
-- una tabla propia de ítems, el resto (identidad, contacto, BCV, tracking,
-- OG, admin) se comparte con inmobiliarias y concesionarios.

-- La columna `vertical` ya existe desde la 002. Ahora admite 'tienda'.

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  demo_id       uuid references demos(id) on delete cascade,
  sort_order    int default 0,

  ref_code      text not null,          -- "P-001" · sirve de SKU y de URL
  title         text not null,          -- "Blusa de lino manga corta"
  category      text,                   -- "Blusas" · agrupa y filtra
  price_usd     numeric not null,
  compare_at_usd numeric,               -- precio tachado, para ofertas

  description   text,
  variants      text[],                 -- ['S', 'M', 'L'] o ['Negro', 'Beige']
  image_urls    text[] not null,
  in_stock      boolean default true,
  is_featured   boolean default false
);

create index if not exists products_demo_id_idx on products (demo_id);

alter table products enable row level security;

create policy "products_public_read" on products
  for select to anon, authenticated
  using (exists (
    select 1 from demos d where d.id = products.demo_id and d.is_active = true
  ));
