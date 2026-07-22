import { createHash } from 'node:crypto';
import type { APIContext } from 'astro';

/**
 * Sesión sin estado: el token es un hash de las credenciales del admin.
 * Cambiar ADMIN_USER/ADMIN_PASS invalida todas las sesiones al instante.
 */
export function sessionToken(): string {
  const user = import.meta.env.ADMIN_USER ?? '';
  const pass = import.meta.env.ADMIN_PASS ?? '';
  return createHash('sha256').update(`tp-session-v1:${user}:${pass}`).digest('hex');
}

export function validCredentials(user: string, pass: string): boolean {
  return (
    !!import.meta.env.ADMIN_USER &&
    !!import.meta.env.ADMIN_PASS &&
    user === import.meta.env.ADMIN_USER &&
    pass === import.meta.env.ADMIN_PASS
  );
}

/** Autenticado por cookie de sesión o por Basic Auth (útil para scripts/curl). */
export function isAuthed(context: APIContext): boolean {
  if (context.cookies.get('tp_session')?.value === sessionToken()) return true;

  const header = context.request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const expected = 'Basic ' + Buffer.from(
      `${import.meta.env.ADMIN_USER}:${import.meta.env.ADMIN_PASS}`
    ).toString('base64');
    if (import.meta.env.ADMIN_USER && header === expected) return true;
  }
  return false;
}

export function setSessionCookies(context: APIContext, remember: boolean): void {
  const base = { path: '/', sameSite: 'lax' as const, secure: import.meta.env.PROD };
  context.cookies.set('tp_session', sessionToken(), {
    ...base,
    httpOnly: true,
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  // Marca las visitas propias para que el tracking las ignore.
  context.cookies.set('tp_admin', '1', { ...base, maxAge: 60 * 60 * 24 * 365 });
}

export function clearSessionCookies(context: APIContext): void {
  context.cookies.delete('tp_session', { path: '/' });
}
