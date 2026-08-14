-- Demo Fantasma · migración 008: landings de outreach
-- Ejecutar en el SQL Editor de Supabase después de 007.
--
-- Transforma las landings de profesionales en landings-demo de outreach.
-- El objeto `copy` cambia de forma (lo maneja Zod en la aplicación, no la BD),
-- y se agregan las columnas que el nuevo modelo necesita.

alter table pro_demos
  -- Vida del link. Al vencer, /p/<slug> muestra la página de expirado.
  add column if not exists expira date,

  -- Muro de pruebas. Cada ítem lleva su fuente pública obligatoria.
  -- [{ tipo, fuente, src, autor, texto, contexto }]
  add column if not exists muro_pruebas jsonb,

  -- Capa 2: el mensaje precargado de la barra de autoría, hacia TU WhatsApp.
  add column if not exists autoria_mensaje text,

  -- Marca del prospecto, extraída de su Instagram.
  add column if not exists bg_hex text,
  add column if not exists text_hex text;

-- Las landings del modelo anterior no tienen expiración: se dejan vivas para
-- no romper links ya enviados. Las nuevas nacen con fecha desde el panel.
