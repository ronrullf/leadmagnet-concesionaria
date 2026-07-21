/**
 * 404 neutro con status real. No revela que existen otros demos
 * ni depende del manejo de 404 del adapter.
 */
export function notFoundResponse(): Response {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Página no encontrada</title>
<meta name="robots" content="noindex, nofollow">
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #FBFAF8; color: #12161A; font-family: system-ui, sans-serif; }
  div { text-align: center; padding: 24px; }
  h1 { font-size: 31px; margin: 0; }
  p { color: #4A5560; font-size: 14px; margin: 8px 0 0; }
</style>
</head>
<body><div><h1>404</h1><p>Esta página no existe.</p></div></body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
