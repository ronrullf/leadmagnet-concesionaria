import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const user = import.meta.env.ADMIN_USER;
    const pass = import.meta.env.ADMIN_PASS;
    const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    const got = context.request.headers.get('authorization');

    if (!user || !pass || got !== expected) {
      return new Response('Autenticación requerida', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="TiendaPana Admin"' },
      });
    }

    // Marca al navegador de Fernando para que sus visitas a los demos no cuenten.
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
