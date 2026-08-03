-- Demo Fantasma · migración 005: CTA con formulario + ubicación del profesional
-- Ejecutar en el SQL Editor de Supabase después de 004_pro_before_after.sql.

alter table pro_demos
  -- 'directo'    → el CTA abre WhatsApp de una vez (comportamiento previo)
  -- 'formulario' → el CTA abre un formulario (nombre + qué desea saber) que
  --                arma el mensaje y luego abre WhatsApp ya redactado
  add column if not exists cta_mode text default 'directo',
  add column if not exists cta_form_title text,
  add column if not exists cta_question_label text,

  -- Ubicación (opcional). Sin dirección ni maps_query, la sección no existe.
  add column if not exists address text,
  add column if not exists maps_query text;
