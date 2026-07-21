/** Deeplinks de WhatsApp. Genérico entre nichos: los textos viven en quien llama. */

export function waLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}

/** Mensajes específicos del nicho inmobiliario. Al clonar a otro nicho, se reemplaza solo este bloque. */

export function visitMessage(agencyName: string, title: string, refCode: string, priceUsd: number): string {
  return (
    `Hola ${agencyName}, vi el inmueble "${title}" (Ref. ${refCode}) en su página web.\n` +
    `Precio: $${new Intl.NumberFormat('es-VE').format(priceUsd)}\n` +
    `Me interesa agendar una visita. ¿Tienen disponibilidad esta semana?`
  );
}

export function videoCallMessage(agencyName: string, title: string, refCode: string): string {
  return (
    `Hola ${agencyName}, estoy fuera del país y vi el inmueble "${title}" (Ref. ${refCode}) ` +
    `en su página web. ¿Podríamos hacer una videollamada para verlo?`
  );
}

export function genericContactMessage(agencyName: string, vertical: string = 'inmobiliaria'): string {
  const noun = vertical === 'concesionario' ? 'vehículos' : 'inmuebles';
  return `Hola ${agencyName}, vi su página web y me gustaría más información sobre sus ${noun} disponibles.`;
}

/** Mensajes específicos del nicho concesionario. */

export function testDriveMessage(agencyName: string, title: string, refCode: string, priceUsd: number, isImport: boolean): string {
  const cierre = isImport
    ? 'Me interesa. ¿Me pueden dar detalles del proceso de importación y el tiempo de entrega?'
    : 'Me interesa verlo y agendar una prueba de manejo. ¿Tienen disponibilidad esta semana?';
  return (
    `Hola ${agencyName}, vi el vehículo "${title}" (Ref. ${refCode}) en su página web.\n` +
    `Precio: $${new Intl.NumberFormat('es-VE').format(priceUsd)}\n` +
    cierre
  );
}

export function vehicleVideoCallMessage(agencyName: string, title: string, refCode: string): string {
  return (
    `Hola ${agencyName}, estoy fuera del país y vi el vehículo "${title}" (Ref. ${refCode}) ` +
    `en su página web. ¿Podríamos hacer una videollamada para verlo y coordinar la compra?`
  );
}

export function tiendapanaMessage(agencyName: string, slug: string): string {
  return `Hola, vi el demo de ${agencyName} (ref: ${slug}) y quiero información.`;
}

export function outreachMessage(agencyName: string, featuredTitle: string, link: string): string {
  return (
    `Buenas ${agencyName}, vi el ${featuredTitle} que publicaron.\n\n` +
    `Les monté algo para que lo vean: ${link}\n\n` +
    `Es su inventario dentro de una página web real. Ábranlo desde el teléfono, ` +
    `es gratis y no les pido nada. Si le dan a "Agendar visita" les llega el ` +
    `mensaje a su propio WhatsApp.`
  );
}
