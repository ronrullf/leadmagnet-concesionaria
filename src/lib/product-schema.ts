import { z } from 'zod';
import {
  outreachSchema,
  pruebaSchema,
  coerceOutreachCopy,
  coercePruebas,
  type OutreachCopy,
  type Prueba,
  palabras,
  defaultExpiry,
  isExpired,
} from './outreach-schema';

export const productSpecSchema = z.object({
  title: z.string().trim().max(60).default(''),
  value: z.string().trim().max(60).default(''),
  icon: z.string().trim().default('rayo'),
  description: z.string().trim().max(160).default(''),
});

export interface ProductInput {
  copy: OutreachCopy;
  pruebas: Prueba[];
  whatsapp: string;
  nombreProducto: string;
  nombreEmpresa: string;
  expira: string | null;
  autoriaMensaje: string;
}

/**
 * Valida los requisitos de publicación de una landing de producto.
 * Testimonios (muro_pruebas) y autoriaMensaje son 100% OPCIONALES.
 */
export function validateProductOutreach(input: ProductInput): string[] {
  const { copy: c, pruebas, whatsapp, nombreProducto, expira } = input;
  const errors: string[] = [];

  if (!whatsapp) {
    errors.push('Falta el número de WhatsApp para recibir los pedidos.');
  }

  if (!nombreProducto.trim()) {
    errors.push('Falta el nombre del producto.');
  }

  if (c.hero.headline && palabras(c.hero.headline) > 14) {
    errors.push(`El headline tiene ${palabras(c.hero.headline)} palabras. El máximo recomendado son 14.`);
  }

  if (c.comoFunciona.pasos.length > 4) {
    errors.push(`"Cómo funciona" tiene ${c.comoFunciona.pasos.length} pasos. El máximo son 4.`);
  }

  // Si hay testimonios, verificar que tengan contenido/fuente válidos
  if (pruebas.length > 0) {
    const sinFuente = pruebas.findIndex((p) => !p.fuente || (!p.texto && !p.src));
    if (sinFuente !== -1) {
      errors.push(
        `La prueba ${sinFuente + 1} no tiene fuente ni contenido.`
      );
    }
  }

  if (!expira) {
    errors.push('Falta la fecha de expiración del link.');
  } else {
    const dias = Math.ceil((new Date(expira).getTime() - Date.now()) / 86_400_000);
    if (Number.isNaN(dias)) errors.push('La fecha de expiración no es válida.');
    else if (dias > 14) {
      errors.push(`La expiración está a ${dias} días. El máximo son 14.`);
    }
  }

  return errors;
}

export { coerceOutreachCopy, coercePruebas, defaultExpiry, isExpired };
