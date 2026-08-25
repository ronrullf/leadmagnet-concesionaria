import type { ProductPack } from './product-types';

export interface ProductInputPrompt {
  product_name: string;
  business_name: string;
  niche_key: string;
  niche_label?: string;
  city?: string;
  instagram_handle?: string;
  followers?: number | null;
  instagram_bio?: string;
  captions?: string[];
  what_they_sell?: string;
  ideal_customer?: string;
  real_credentials?: string;
  price_usd?: number | null;
  guarantee_info?: string;
}

export const PRODUCT_SYSTEM_PROMPT = `Eres un copywriter estrella de respuesta directa especializado en venta de productos físicos, generadores eléctricos, paneles solares, repuestos y servicios técnicos en el mercado venezolano.
Escribes landing pages de alta conversión para ofertas de alto valor ($100M Offers de Alex Hormozi + Russell Brunson).

Dominas los dolores del contexto venezolano actual:
1. INESTABILIDAD ELÉCTRICA Y APAGONES: El dolor #1. Plantas eléctricas, inversores y paneles solares venden tranquilidad, continuidad de vida/negocio, cero pérdida de comida ni electrodomésticos quemados.
2. DISPONIBILIDAD Y GARANTÍA REAL: El comprador teme gastar en equipos sin repuestos ni garantía local. La página transmite respaldo directo, servicio técnico y repuestos inmediatos.
3. ECUACIÓN DE VALOR DE ALEX HORMOZI:
   Valor = (Sueño x Certeza percibida) / (Tiempo x Esfuerzo)
   - SUEÑO: Vende la independencia energética y la tranquilidad, no solo el motor o el inversor.
   - CERTEZA: Especificaciones exactas (kW, kVA, horas de respaldo, amperaje) y respaldo por escrito.
   - TIEMPO: Entregas rápidas en 24h/48h o despacho inmediato.
   - ESFUERZO: Asesoría de cálculo de carga sin costo e instalación asistida.

VOZ Y TONO:
- Español latinoamericano/venezolano profesional, directo, persuasivo y confiable.
- Cero jerga de relleno corporativo. Habla con claridad técnica aterrizada a beneficios humanos reales.
`;

export function productSharedContext(input: ProductInputPrompt, pack: ProductPack): string {
  const lineas: string[] = [
    `PRODUCTO: ${input.product_name}`,
    `EMPRESA / MARCA: ${input.business_name}`,
    `CATEGORÍA / NICHO: ${pack.label}`,
    input.city ? `CIUDAD / COBERURA: ${input.city}` : '',
    input.price_usd ? `PRECIO REFERENCIAL: $${input.price_usd}` : '',
    input.guarantee_info ? `GARANTÍA: ${input.guarantee_info}` : '',
    input.instagram_handle ? `INSTAGRAM: @${input.instagram_handle}` : '',
    input.instagram_bio ? `BIO DE INSTAGRAM: "${input.instagram_bio}"` : '',
    input.what_they_sell ? `LO QUE VENDEN: "${input.what_they_sell}"` : '',
    input.ideal_customer ? `CLIENTE IDEAL: "${input.ideal_customer}"` : '',
    input.real_credentials ? `RESPALDO REAL: "${input.real_credentials}"` : '',
    pack.main_pain ? `DOLOR PRINCIPAL DEL MERCADO: "${pack.main_pain}"` : '',
    pack.dream_outcome ? `RESULTADO DESEADO: "${pack.dream_outcome}"` : '',
  ];
  return lineas.filter(Boolean).join('\n');
}

export function productUserPrompt(
  block: 'A' | 'B',
  context: string,
  previous: Record<string, unknown>,
  pack: ProductPack
): string {
  if (block === 'A') {
    return `${context}

Genera el BLOQUE A (Hero, Franja de Prueba y Problema) en JSON estricto.

Reglas:
- Hero.headline: Máximo 12 palabras. Debe prometer el resultado deslumbrante que obtiene el comprador (autonomía sin apagones, cero pérdidas, tranquilidad).
- Hero.subheadline: Máximo 25 palabras. Explicación clara de cómo el producto resuelve el dolor.
- Hero.cta.texto: Texto en primera persona ("Consultar Disponibilidad", "Quiero mi Planta Eléctrica", "Cotizar Sistema Solar").
- Hero.badges: Exactamente 3 promesas clave (ej: "Garantía Escrita 1 Año", "Envíos a Nivel Nacional", "Soporte Técnico Especializado").
- FranjaPrueba.etiqueta: Cifra o logro real alcanzable (ej: "+350 equipos instalados en Venezuela").
- Problema.headline: Titular directo al dolor del cliente en Venezuela.
- Problema.parrafo: Párrafo empático que cuantifica el costo de no tener el equipo.`;
  }

  return `${context}

LO YA GENERADO EN BLOQUE A:
${JSON.stringify(previous, null, 2)}

Genera el BLOQUE B (Cómo Funciona, Qué Incluye, Riesgo Cero, Quién Vende, FAQ y Cierre) en JSON estricto.

Reglas:
- comoFunciona.headline: Titular del proceso de compra/instalación.
- comoFunciona.pasos: De 3 a 4 pasos simples (Asesoría/Cálculo → Entrega → Disfrute/Autonomía).
- incluye.items: De 4 a 6 entregables u homologaciones (equipo, garantía, conectores, pruebas, etc.).
- riesgo.headline y riesgo.texto: Garantía de respaldo y cero riesgo.
- profesional.bio: Reseña de la empresa o distribuidor.
- faq: De 3 a 5 preguntas frecuentes reales sobre voltaje, capacidad, envíos y garantía.
- cierre.headline: Mensaje final de urgencia o decisión.`;
}
