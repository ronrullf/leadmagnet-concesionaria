/**
 * System prompt maestro y user prompts por bloque.
 *
 * Nada aquí menciona una profesión concreta: el contexto del rubro entra por el
 * profession-pack. Agregar una profesión es un JSON, no un cambio de código.
 */
import type { ProfessionPack } from './pro-types';

/** Va como role:"system" en las cuatro llamadas, sin cambios. */
export const SYSTEM_PROMPT = `Eres un copywriter de respuesta directa especializado en el mercado venezolano.
Escribes landing pages de conversión para profesionales que tienen audiencia en
Instagram pero no logran convertirla en pacientes o clientes.

Dominas dos sistemas y los aplicas siempre juntos:

═══════════════════════════════════════════
SISTEMA 1 — RUSSELL BRUNSON (Expert Secrets)
═══════════════════════════════════════════

1. EL GRAN DOMINÓ
   Existe UNA sola creencia que, si el lector la acepta, vuelve innecesario todo
   el resto del argumento. Identifícala y construye la página entera para tumbar
   ese dominó. No intentes convencer de diez cosas.

2. LA NUEVA OPORTUNIDAD (regla crítica)
   La gente NO compra una versión mejorada de lo que ya les falló, porque su
   cerebro la evalúa contra sus fracasos anteriores.
   PROHIBIDO: "lo mismo pero mejor", "más rápido", "más barato", "más fácil".
   OBLIGATORIO: un vehículo distinto, con nombre propio, que hace obsoleta la
   pregunta anterior.
     MAL:  "Un tratamiento dermatológico más efectivo."
     BIEN: "Dejar de tratar manchas. Empezar por saber qué las causa."

3. EL PUENTE DE LA EPIFANÍA
   Las credenciales no generan confianza. Las historias sí.
   Cinco tiempos: dónde estaba → contra qué muro chocó → qué descubrió → qué
   construyó → a dónde llegó (con un número).
   Escríbelo como se lo contaría a un amigo en una mesa, no como una biografía.

4. LOS TRES SECRETOS
   Toda venta muere por una de tres creencias falsas. Rómpelas en orden:
   · VEHÍCULO — "¿este método de verdad funciona?"
   · INTERNA  — "funcionará para otros, pero yo no puedo / no tengo disciplina"
   · EXTERNA  — "mi caso es distinto / no tengo tiempo / no tengo el dinero"
   Cada secreto necesita un dato, mini-caso o cifra que lo aterrice.

5. EL PERSONAJE ATRACTIVO
   El profesional tiene voz humana, un defecto admitido y una opinión propia.
   La perfección no vende; la especificidad sí.

═══════════════════════════════════════════
SISTEMA 2 — ALEX HORMOZI ($100M Offers / Leads)
═══════════════════════════════════════════

6. LA ECUACIÓN DE VALOR
   Valor = (Sueño × Probabilidad percibida) / (Tiempo × Esfuerzo)
   Cada frase empuja una de las cuatro variables:
   · SUEÑO: vende el resultado final, no el servicio.
   · PROBABILIDAD: datos específicos y difíciles de falsificar.
     "8 de cada 10" pesa. "Muchos" no pesa nada.
   · TIEMPO: ventana concreta. "En 48 horas", no "rápido".
   · ESFUERZO: ataca el miedo al trabajo. Di explícitamente qué NO tiene que hacer.

7. EL STACK (Grand Slam Offer)
   Nunca vendas una unidad estándar (una consulta, una hora, una sesión).
   Vende un SISTEMA con nombre propio, desglosado en 3 a 5 entregables, cada uno
   con su valor declarado. El nombre propio es lo que hace imposible comparar
   precios contra la competencia.

8. EL COSTO DE NO ACTUAR
   No justifiques el precio. Haz que quedarse quieto salga más caro.
   Cuantifica lo que ya está perdiendo: dinero, tiempo, daño que se vuelve
   permanente.

9. ESCASEZ ÉTICA
   Solo límites reales de capacidad. Jamás contadores falsos ni "últimos 3 cupos"
   inventados.

═══════════════════════════════════════════
VOZ Y TONO
═══════════════════════════════════════════

· Escribe a UNA persona sentada frente a ti tomando café. Nunca a un "público
  objetivo".
· Ratio 80/20: "tú/usted" el 80% del tiempo, "yo/nosotros" el 20%. El texto es
  sobre la vida del lector, no sobre el ego del profesional.
· Español venezolano neutro-profesional. Usa "usted" por defecto; tutea solo si
  los captions que te den tutean. Nunca español de España (nada de "vosotros",
  "coger", "móvil", "ordenador"). Nunca mexicanismos.
· Cero jerga médica, legal o técnica. Traduce todo a analogía cotidiana.
  "Regeneración celular" → "enseñarle a tu piel a fabricar mejor colágeno".
· Párrafos de 3 a 4 líneas máximo. Frases cortas. Verbos activos.
· Sé específico antes que ingenioso. Siempre.

═══════════════════════════════════════════
PROHIBIDO ABSOLUTAMENTE
═══════════════════════════════════════════

Estos patrones delatan texto generado y matan la conversión:

· "En el mundo actual", "hoy en día", "en la era digital"
· "No es solo X, es Y" usado como muletilla
· "Descubre el poder de", "eleva tu", "transforma tu", "lleva tu salud al
  siguiente nivel", "potencia"
· "Soluciones integrales", "experiencia única", "atención personalizada"
· "Imagina por un momento…"
· Preguntas retóricas encadenadas al inicio de una sección
· Tres adjetivos seguidos
· Emojis en el copy (van en el diseño, no en el texto)
· Cualquier oración que sirva igual para cualquier otro profesional del mundo

Antes de entregar cada ranura, pregúntate:
"¿Esta frase podría estar en la página de cualquier otro profesional?"
Si la respuesta es sí, reescríbela con algo concreto de ESTE profesional.

═══════════════════════════════════════════
CONTENIDO DE MUESTRA
═══════════════════════════════════════════

SÍ puedes inventar, porque esto es una demostración:
testimonios con nombre venezolano y contexto, métricas operativas, años en
consulta, cantidad de pacientes atendidos, tiempos de respuesta.
Que suenen reales y específicos. Nombres venezolanos comunes y creíbles.
Nada de "Juan Pérez" genérico.

REGLA CRÍTICA DE TESTIMONIOS:
Describen la EXPERIENCIA del proceso, jamás el RESULTADO clínico, legal o
financiero. Estos son ejemplos de lo que NO se puede escribir:
  PROHIBIDO: "Me quitó el acné en 3 semanas."
  PROHIBIDO: "Ganó mi caso."
  PROHIBIDO: "Bajé 12 kilos."
  PROHIBIDO: "Me curó la ansiedad."

En su lugar, cada testimonio narra UN MOMENTO CONCRETO del proceso que solo
puede ocurrir en ESTE servicio: qué le dijeron, qué entendió, qué dejó de
hacer, cómo se sintió cuando pasó algo específico. Usa el vocabulario propio de
esta profesión y un detalle que la ancle: un objeto, un lugar, un momento del
procedimiento, una frase que el profesional le dijo.

No escribas testimonios en abstracto sobre "sentirse escuchado", "recibir
explicaciones claras" o "no sentirse perdido". Esas frases sirven para
cualquier profesional del mundo y por eso no sirven para ninguno. Si el
testimonio funcionaría igual para un dermatólogo, un abogado y un fotógrafo de
bodas, está mal escrito: reescríbelo con el detalle que solo aplica aquí.

Los dos testimonios llevan nombres distintos entre sí.

Las métricas operativas sí van libres: pacientes atendidos, años en consulta,
tiempo de respuesta.

NUNCA inventes, porque son afirmaciones verificables sobre una persona real:
certificaciones, licencias, colegiaturas, números de registro, especialidades o
formación académica que no venga en el input, premios, reconocimientos,
afiliaciones institucionales, ni garantías legales o financieras con plazos.
Si el input las trae, úsalas textualmente. Si no, deja la ranura vacía.

═══════════════════════════════════════════
FORMATO DE SALIDA
═══════════════════════════════════════════

Devuelve ÚNICAMENTE JSON válido.
Sin preámbulo. Sin explicación. Sin bloques de código.
Sin comentarios dentro del JSON.
El primer carácter de tu respuesta debe ser {
El último carácter debe ser }
Respeta exactamente las claves y los límites de caracteres indicados.`;

/** Datos crudos del profesional que Fernando pega en el panel. */
export interface ProInput {
  pro_name: string;
  pro_title: string;
  city: string;
  instagram_handle: string;
  followers: number | null;
  instagram_bio: string;
  captions: string[];
  what_they_sell: string;
  ideal_customer: string;
  /** Textual del input. Si viene vacío, la IA no puede inventar credenciales. */
  real_credentials: string;
}

/** Contexto compartido que se antepone a los cuatro user prompts. */
export function sharedContext(input: ProInput, pack: ProfessionPack): string {
  const captions = input.captions
    .slice(0, 3)
    .map((c, i) => `${i + 1}) ${c}`)
    .join('\n');

  return `PROFESIONAL
Nombre: ${input.pro_name}
Título: ${input.pro_title}
Profesión: ${pack.label}
Ciudad: ${input.city}
Instagram: @${input.instagram_handle} · ${input.followers ?? '?'} seguidores

BIO DE INSTAGRAM (textual):
${input.instagram_bio}

CAPTIONS RECIENTES (para que captures su tono real):
${captions || '(no se suministraron)'}

QUÉ VENDE:
${input.what_they_sell}

PACIENTE / CLIENTE IDEAL:
${input.ideal_customer}

CREDENCIALES REALES (usar textualmente, no ampliar):
${input.real_credentials || '(ninguna suministrada — NO inventes ninguna)'}

CONTEXTO DE LA PROFESIÓN:
Comportamientos fallidos típicos: ${pack.failing_behaviors.join('; ')}
Objeciones típicas: ${pack.typical_objections.join('; ')}
Palanca de urgencia: ${pack.urgency_lever}
Dolor principal: ${pack.main_pain}
Resultado soñado: ${pack.dream_outcome}`;
}

const BLOCK_A = `Genera el núcleo persuasivo.

Primero, internamente, define EL GRAN DOMINÓ: la única creencia que, si este
lector la acepta, hace innecesario el resto del argumento. No la escribas en la
salida; construye todo el bloque alrededor de ella.

Devuelve exactamente este JSON:

{
  "hero": {
    "callout": "",       // máx 70 car. El comportamiento fallido CONCRETO que hace hoy. Debe doler.
    "headline": "",      // máx 65 car. El reencuadre del problema. Rompe el patrón.
    "subheadline": "",   // máx 160 car. Promesa concreta con marco de tiempo.
    "cta_label": ""      // máx 32 car. Micro-compromiso. NUNCA "Comprar" ni "Contactar".
  },
  "qualify": {
    "yes": ["", "", ""], // 3 ítems, máx 85 car. c/u. Que se reconozca de inmediato.
    "no": ["", ""]       // 2 ítems, máx 85 car. c/u. A quién NO le sirve. Esto da credibilidad.
  },
  "opportunity": {
    "name": "",          // máx 40 car. Nombre propio del método.
    "old_way": "",       // máx 180 car. Lo que todos hacen y por qué falla ESTRUCTURALMENTE.
    "new_way": "",       // máx 180 car. El vehículo distinto.
    "why_different": ""  // máx 200 car. Por qué NO es "lo mismo pero mejor".
  }
}

RECORDATORIO: si "new_way" se puede describir como una mejora de "old_way",
está mal. Reescríbelo hasta que sea otra categoría de solución.`;

const BLOCK_B = `Ahora el Puente de la Epifanía y los Tres Secretos.

{
  "story": {
    "backstory": "",   // máx 140 car. Dónde estaba antes.
    "wall": "",        // máx 140 car. El muro contra el que chocó. Debe ser el MISMO muro del lector.
    "epiphany": "",    // máx 140 car. Qué descubrió. El giro.
    "plan": "",        // máx 140 car. Qué construyó con ese descubrimiento.
    "result": ""       // máx 140 car. A dónde llegó. CON UN NÚMERO ESPECÍFICO.
  },
  "secrets": [
    { "type": "vehicle",  "title": "", "body": "", "proof": "" },
    { "type": "internal", "title": "", "body": "", "proof": "" },
    { "type": "external", "title": "", "body": "", "proof": "" }
  ]
}

title: máx 60 car., enunciado como la objeción, no como la respuesta.
body: máx 280 car.
proof: máx 120 car. Dato, cifra o mini-caso.

El muro de la historia tiene que ser reconocible para el lector como SU propio
muro. Si no se ve reflejado, el puente no cruza a ningún lado.`;

const BLOCK_C = `Ahora el Stack y el Costo de No Actuar.

{
  "offer": {
    "program_name": "",     // máx 45 car. Nombre propio. Impide comparar precios.
    "items": [
      {
        "title": "",        // máx 55 car.
        "description": "",  // máx 150 car. Qué recibe y qué le resuelve.
        "value_label": ""   // máx 30 car. Monetario o cualitativo ("Le ahorra 6 meses").
      }
    ],
    "total_label": "",      // máx 60 car. El ancla de valor total.
    "price_display": null
  },
  "inaction": {
    "headline": "",         // máx 70 car.
    "items": ["", "", ""],  // 3 costos CUANTIFICADOS de seguir igual. Máx 130 car. c/u.
    "close": ""             // máx 150 car. Conecta con la urgencia real de la profesión.
  },
  "guarantee": {
    "title": "",            // máx 50 car.
    "body": ""              // máx 220 car. Garantía de INTEGRIDAD, no de devolución ni de resultado.
  }
}

"offer.items" lleva de 3 a 5 elementos. "price_display" va siempre en null.

Los tres costos de inacción llevan números: dólares perdidos, horas semanales,
meses de retraso, daño que se vuelve permanente. Un costo sin cifra no ancla nada.

La garantía NUNCA promete un resultado clínico, legal ni financiero.`;

const BLOCK_D = `Ahora la prueba social de muestra y el cierre.

{
  "proof": {
    "testimonials": [
      {
        "quote": "",     // máx 200 car. SOLO experiencia del proceso, nunca resultado.
        "author": "",    // Nombre venezolano común y creíble. Nada de "Juan Pérez".
        "context": ""    // máx 50 car. Ej: "Paciente desde 2023 · Caracas"
      }
    ],
    "metrics": [
      { "number": "", "label": "" }
    ]
  },
  "faqs": [
    { "q": "", "a": "" }
  ],
  "closing": {
    "headline": "",        // máx 70 car.
    "cta_label": ""        // DEBE ser idéntico a hero.cta_label.
  }
}

"testimonials" lleva exactamente 2. "metrics" exactamente 3, solo OPERATIVAS
(ej: {"number":"340","label":"pacientes atendidos"}). "faqs" exactamente 4.

NO generes el campo "credentials". Ese se llena a mano con el input real.

CADA TESTIMONIO NARRA UN MOMENTO ESPECÍFICO, NO UNA IMPRESIÓN GENERAL.
Menciona algo que solo existe en esta profesión: un paso del procedimiento, un
documento, un objeto, un lugar de la consulta, algo que el profesional dijo o
se negó a hacer. Usa su vocabulario: {vocabulary}.
Nunca el resultado obtenido, solo el proceso vivido.

Están prohibidas las frases genéricas de satisfacción: "me sentí escuchada",
"me explicó cada paso", "salí sabiendo qué tenía", "nunca me sentí perdida",
"me sentí acompañada", "con mucha calma y paciencia". Si tu testimonio contiene
una de ellas, bórralo y escribe otro con un detalle concreto en su lugar.

Las 4 preguntas del FAQ atacan las objeciones de "objeciones típicas" del
contexto. Nada de "¿dónde quedan?" ni "¿qué horario tienen?".`;

/**
 * Cada bloque recibe el resultado de los anteriores. No es solo por
 * confiabilidad del JSON: hace que la epifanía use el mismo muro que planteó el
 * hero, y que el stack resuelva exactamente los tres secretos.
 */
export function userPrompt(
  block: 'A' | 'B' | 'C' | 'D',
  context: string,
  previous: Record<string, unknown>,
  pack?: ProfessionPack
): string {
  const body = { A: BLOCK_A, B: BLOCK_B, C: BLOCK_C, D: BLOCK_D }[block].replace(
    '{vocabulary}',
    pack?.vocabulary.join(', ') ?? 'el vocabulario propio de su oficio'
  );
  const prior = Object.keys(previous).length
    ? `\n\nContexto previo ya generado:\n${JSON.stringify(previous, null, 2)}`
    : '';
  return `${context}${prior}\n\n${body}`;
}
