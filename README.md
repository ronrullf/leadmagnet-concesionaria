# Demo Fantasma — Inmobiliarias

Un solo sitio en Astro (SSR) que renderiza una web inmobiliaria completa para cualquier agencia a partir de un slug en la URL. Se despliega una vez; cada agencia nueva es un registro en base de datos.

```
demo.tiendapana.com/costa-azul  →  web completa de "Inmobiliaria Costa Azul"
```

Spec completo: [DEMO-FANTASMA-INMOBILIARIAS.md](./DEMO-FANTASMA-INMOBILIARIAS.md)

## Stack

Astro 7 (SSR) · Vercel · Tailwind CSS v4 · Supabase (Postgres + Storage) · satori/resvg para OG dinámico.

## Puesta en marcha

### 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecutar [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) (tablas + RLS + bucket `demo-media`).
3. Opcional: ejecutar [supabase/seed.sql](supabase/seed.sql) para sembrar el demo de prueba `costa-azul`.

### 2. Variables de entorno

Copiar `.env.example` a `.env` y llenar:

| Variable | Dónde se consigue |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role, **secreto**) |
| `ADMIN_USER` / `ADMIN_PASS` | Credenciales que quieras para `/admin` |
| `TIENDAPANA_WHATSAPP` | Número de Fernando, formato `584XXXXXXXXX` |
| `BCV_API_URL` | Ya viene con el default de pydolarve |
| `SITE_URL` | `https://demo.tiendapana.com` |

### 3. Desarrollo local

```bash
npm install
npm run dev
```

- `http://localhost:4321/costa-azul` → demo sembrado
- `http://localhost:4321/admin` → panel (Basic Auth)

### 4. Deploy a Vercel

```bash
npx vercel
```

1. Cargar las mismas variables de entorno en Vercel → Project → Settings → Environment Variables.
2. Conectar el dominio `demo.tiendapana.com`.
3. Listo: agregar una agencia desde `/admin` no requiere redeploy.

## Flujo de uso

1. Entrar a `/admin/nuevo`, llenar el formulario (40 segundos: nombre, WhatsApp, fotos desde Instagram).
2. Guardar → botones **Copiar link** y **Copiar mensaje de WhatsApp**.
3. Enviar por WhatsApp en frío.
4. Ver en `/admin` quién abrió su demo (ordenado por última visita).

## Notas de arquitectura

- **Todo dato de cliente vive en la BD.** Cero hardcoding; agregar agencia = un INSERT.
- Las piezas agnósticas al nicho (BCV, deeplinks WhatsApp, formato, tracking) viven en `src/lib/` para poder clonar el sistema a concesionarios/turismo/tiendas cambiando solo el esquema de `properties` y los componentes de tarjeta/detalle.
- La tasa BCV se cachea 6 horas en la tabla `bcv_rate`; si la API externa falla, nunca rompe la página.
- Todo el sitio responde `noindex` (meta + header `X-Robots-Tag`).
- Las visitas con la cookie `tp_admin` (se setea al entrar a `/admin`) no se registran.
