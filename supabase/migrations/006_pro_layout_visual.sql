-- Demo Fantasma · migración 006: línea de confianza y servicios
-- Ejecutar en el SQL Editor de Supabase después de 005_pro_cta_form.sql.
--
-- Hay un solo formato de landing de profesional (50% visual · 40% copy ·
-- 10% CTA). Estas dos columnas alimentan la línea de confianza y la fila de
-- servicios con iconos.

alter table pro_demos
  -- Un renglón, nunca un párrafo.
  -- "+8 años transformando sonrisas · Materiales importados · Caracas"
  add column if not exists trust_line text,

  -- [{ "label": "Carillas", "icon": "diente" }, …] máximo 4
  add column if not exists services jsonb;
