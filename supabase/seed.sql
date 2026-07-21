-- Demo de prueba: agencia ficticia de Margarita con datos realistas.
-- Ejecutar después de 001_init.sql.

insert into demos (
  slug, agency_name, agency_tagline, agency_city, accent_hex, instagram_handle,
  whatsapp_e164, contact_email, office_address, maps_query,
  years_operating, properties_sold, testimonial_text, testimonial_author,
  mode, is_active, notes
) values (
  'costa-azul',
  'Inmobiliaria Costa Azul',
  'Bienes raíces en Margarita desde 2011',
  'Porlamar, Nueva Esparta',
  '#0F5C4E',
  'costaazulve',
  '584141234567',
  'info@costaazul.com.ve',
  'C.C. Costa Azul, Nivel PB, Local 12, Av. Jóvito Villalba, Porlamar',
  'Centro Comercial Costa Azul, Porlamar, Nueva Esparta, Venezuela',
  13,
  240,
  'Vendimos nuestro apartamento en Pampatar en menos de dos meses. Atención impecable de principio a fin.',
  'María G., Pampatar',
  'completo',
  true,
  'Demo de prueba interno. No enviar.'
);

insert into properties (
  demo_id, sort_order, ref_code, title, operation, property_type,
  price_usd, location, bedrooms, bathrooms, parking, area_m2,
  description, features, image_urls, maps_query, is_featured
)
select d.id, v.sort_order, v.ref_code, v.title, v.operation, v.property_type,
       v.price_usd, v.location, v.bedrooms, v.bathrooms, v.parking, v.area_m2,
       v.description, v.features, v.image_urls, v.maps_query, v.is_featured
from demos d,
(values
  (0, 'A-102', 'Apartamento con vista al mar en Pampatar', 'venta', 'apartamento',
   89000::numeric, 'Pampatar, Nueva Esparta', 3, 2, 1, 120,
   'Amplio apartamento en conjunto residencial con vigilancia 24 horas, a cinco minutos de la playa. Cocina remodelada, piso de porcelanato y balcón con vista directa a la bahía de Pampatar.',
   array['Vista al mar', 'Piscina', 'Vigilancia 24h', 'Planta eléctrica', 'Balcón'],
   array['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80'],
   'Pampatar, Nueva Esparta, Venezuela', true),
  (1, 'C-207', 'Casa con piscina en La Asunción', 'venta', 'casa',
   145000::numeric, 'La Asunción, Nueva Esparta', 4, 3, 2, 260,
   'Casa de dos plantas en urbanización cerrada. Piscina propia, churuasquera y jardín consolidado. Ideal para familia que busca tranquilidad cerca del casco histórico.',
   array['Piscina', 'Churuasquera', 'Urbanización cerrada', 'Tanque de agua'],
   array['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80'],
   'La Asunción, Nueva Esparta, Venezuela', false),
  (2, 'A-311', 'Apartamento amoblado en Costa Azul', 'alquiler', 'apartamento',
   650::numeric, 'Costa Azul, Porlamar', 2, 2, 1, 85,
   'Totalmente amoblado y equipado, listo para mudarse. A una cuadra del centro comercial. Incluye aire acondicionado en ambas habitaciones e internet de fibra.',
   array['Amoblado', 'Aire acondicionado', 'Internet fibra', 'Pet friendly'],
   array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=80'],
   'Costa Azul, Porlamar, Venezuela', false),
  (3, 'T-045', 'Terreno de 1.200 m² en Playa El Agua', 'venta', 'terreno',
   58000::numeric, 'Playa El Agua, Nueva Esparta', null, null, null, 1200,
   'Terreno plano a 400 metros de la playa, con documentos al día y servicios en la zona. Zonificación turístico-residencial.',
   array['Documentos al día', 'Servicios en la zona', 'Zonificación turística'],
   array['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80'],
   'Playa El Agua, Nueva Esparta, Venezuela', false),
  (4, 'Q-018', 'Quinta en Maneiro con anexo independiente', 'venta', 'quinta',
   198000::numeric, 'Maneiro, Nueva Esparta', 5, 4, 3, 340,
   'Quinta amplia con anexo independiente ideal para renta. Cocina empotrada de granito, tanque subterráneo de 20.000 litros y portón eléctrico.',
   array['Anexo independiente', 'Tanque 20.000 L', 'Portón eléctrico', 'Cocina de granito'],
   array['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80'],
   'Maneiro, Nueva Esparta, Venezuela', false),
  (5, 'L-090', 'Local comercial en Av. 4 de Mayo', 'alquiler', 'local',
   900::numeric, 'Porlamar, Nueva Esparta', null, 1, null, 65,
   'Local a pie de calle en plena Avenida 4 de Mayo, con vitrina amplia, santamaría y baño. Alto tráfico peatonal y comercial.',
   array['Pie de calle', 'Vitrina amplia', 'Santamaría', 'Alto tráfico'],
   array['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80'],
   'Avenida 4 de Mayo, Porlamar, Venezuela', false)
) as v(sort_order, ref_code, title, operation, property_type, price_usd, location,
       bedrooms, bathrooms, parking, area_m2, description, features, image_urls,
       maps_query, is_featured)
where d.slug = 'costa-azul';
