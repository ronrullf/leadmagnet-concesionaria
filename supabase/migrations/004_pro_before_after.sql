-- Demo Fantasma · migración 004: galería de antes/después para profesionales
-- Ejecutar en el SQL Editor de Supabase después de 003_pro_demos.sql.
--
-- Prueba visual real que el profesional aporta (un odontólogo, un dermatólogo,
-- un fotógrafo). No la genera la IA: son imágenes verdaderas de su trabajo.
-- Si no hay pares, la sección se omite entera.

alter table pro_demos
  add column if not exists before_after jsonb;

-- Estructura: [ { "before": "url", "after": "url", "label": "texto opcional" } ]
