import { defineMiddleware } from 'astro:middleware';
import { isAuthed } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // /api/pro cubre el guardado y el toggle de las landings de profesionales.
  // /api/generate-copy trae su propio isAuthed, pero cubrirlo aquí también no
  // estorba y cierra el hueco si alguien lo olvida en el endpoint.
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/pro') ||
    pathname.startsWith('/api/generate-copy')
  ) {
    if (!isAuthed(context)) {
      // APIs responden 401; páginas redirigen al login de la portada.
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/');
    }

    // Marca al navegador del admin para que sus visitas a los demos no cuenten.
    context.cookies.set('tp_admin', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const response = await next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
