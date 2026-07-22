import type { APIRoute } from 'astro';
import { validCredentials, setSessionCookies } from '../../lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const { user, pass, remember } = await context.request.json();

    if (!validCredentials(String(user ?? ''), String(pass ?? ''))) {
      // Pausa mínima para desalentar fuerza bruta
      await new Promise((r) => setTimeout(r, 600));
      return new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    setSessionCookies(context, remember === true);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
