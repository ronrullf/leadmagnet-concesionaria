/**
 * Base URL pública para armar links absolutos (OG, canónico, links que copia el
 * admin).
 *
 * Prefiere SITE_URL si es un dominio público real: así los links de contacto en
 * frío apuntan siempre al dominio estable, aunque el admin esté navegando en un
 * preview de Vercel. Si SITE_URL falta o quedó en localhost (un descuido común
 * al copiar el .env local a producción), cae al origen real de la petición —
 * nunca a localhost en un sitio desplegado.
 */
export function siteBase(requestOrigin: string): string {
  const configured = (import.meta.env.SITE_URL ?? '').trim().replace(/\/$/, '');
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(configured);
  if (configured && !isLocal) return configured;
  return requestOrigin.replace(/\/$/, '');
}
