# Demo Fantasma — Inmobiliarias
### Spec de construcción para Claude Code · TiendaPana · v1

---

## 0. Resumen en una línea

Un solo sitio en Astro, desplegado una vez, que renderiza una web inmobiliaria completa y funcional para **cualquier** agencia a partir de un slug en la URL. Se construye una vez y se reutiliza indefinidamente cambiando solo un registro en base de datos.

```
demo.tiendapana.com/costa-azul  →  web completa de "Inmobiliaria Costa Azul"
```

---

## 1. Contexto de negocio (leer antes de codear)

**Qué es esto.** Un lead magnet para cold outreach por WhatsApp. No es un portafolio, no es una landing de TiendaPana, no es un generador público. Es una herramienta interna de ventas que produce artefactos personalizados a costo marginal casi cero.

**Cómo se usa.**
1. Fernando identifica una inmobiliaria venezolana que vende por Instagram.
2. Entra al panel `/admin`, llena un formulario con los datos de esa agencia (nombre, teléfono, 3–6 inmuebles con fotos tomadas de su propio Instagram).
3. El sistema genera un slug único y un link.
4. Fernando manda ese link por WhatsApp en frío.
5. La agencia abre el link y ve **su propio negocio** dentro de una web real y navegable.
6. Al tocar "Agendar visita", le llega un WhatsApp bien formateado **a su propio teléfono**.
7. Fernando ve en el panel quién abrió el link y a quién escalar.

**El objetivo emocional.** No informar. Provocar la sensación física de *"así se vería mi negocio si fuera serio"* y *"ese mensaje que me acaba de llegar es lo que quiero recibir todos los días"*.

**Regla de oro del proyecto:** todo lo que se pueda mover a base de datos, va a base de datos. Cero hardcoding de datos de clientes. Si para agregar una agencia nueva hay que tocar código o hacer un redeploy, el diseño está mal.

---

## 2. Stack

| Capa | Tecnología | Nota |
|---|---|---|
| Framework | Astro 5 | `output: 'server'` (SSR obligatorio) |
| Adapter | `@astrojs/vercel` | |
| Estilos | Tailwind CSS v4 | vía `@tailwindcss/vite` |
| Base de datos | Supabase (Postgres) | `@supabase/supabase-js` |
| Almacenamiento de imágenes | Supabase Storage | bucket público `demo-media` |
| OG images | `@vercel/og` o `satori` | generación dinámica |
| Hosting | Vercel | dominio `demo.tiendapana.com` |
| Interactividad | Astro Islands + vanilla JS | **no** meter React salvo que sea estrictamente necesario |

**Por qué SSR y no SSG:** con generación estática habría que hacer un redeploy por cada agencia nueva. Eso rompe el requisito central. SSR permite agregar una agencia con un `INSERT` y que el link funcione al instante.

---

## 3. Modelo de datos

### Tabla `demos`

```sql
create table demos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,          -- "costa-azul"
  created_at        timestamptz default now(),

  -- Identidad de la agencia
  agency_name       text not null,                 -- "Inmobiliaria Costa Azul"
  agency_tagline    text,                          -- "Bienes raíces en Margarita desde 2011"
  agency_city       text not null,                 -- "Porlamar, Nueva Esparta"
  agency_logo_url   text,                          -- opcional; si es null se usa monograma
  accent_hex        text default '#0F5C4E',        -- color de acento de la agencia
  instagram_handle  text,                          -- "costaazulve" (sin @)

  -- Contacto
  whatsapp_e164     text not null,                 -- "584141234567" sin + ni espacios
  contact_email     text,
  office_address    text,
  maps_query        text,                          -- texto para el embed de Google Maps

  -- Prueba social (opcional, se oculta si está vacío)
  years_operating   int,
  properties_sold   int,
  testimonial_text  text,
  testimonial_author text,

  -- Control
  mode              text default 'rapido',         -- 'rapido' | 'completo'
  is_active         boolean default true,
  notes             text                           -- notas internas de Fernando
);
```

### Tabla `properties`

```sql
create table properties (
  id            uuid primary key default gen_random_uuid(),
  demo_id       uuid references demos(id) on delete cascade,
  sort_order    int default 0,

  ref_code      text not null,          -- "A-102"
  title         text not null,          -- "Apartamento con vista al mar en Pampatar"
  operation     text not null,          -- 'venta' | 'alquiler'
  property_type text not null,          -- 'apartamento' | 'casa' | 'terreno' | 'local' | 'quinta'

  price_usd     numeric not null,
  location      text not null,          -- "Pampatar, Nueva Esparta"

  bedrooms      int,
  bathrooms     int,
  parking       int,
  area_m2       int,

  description   text,
  features      text[],                 -- ['Piscina', 'Vigilancia 24h', 'Amoblado']
  image_urls    text[] not null,        -- 1 a 6 URLs de Supabase Storage
  maps_query    text,                   -- ubicación específica del inmueble
  is_featured   boolean default false
);
```

### Tabla `demo_visits`

```sql
create table demo_visits (
  id          bigserial primary key,
  demo_id     uuid references demos(id) on delete cascade,
  visited_at  timestamptz default now(),
  path        text,                    -- qué página vio
  referrer    text,
  user_agent  text,
  is_owner_view boolean default false  -- true si vino con ?v=1 (link enviado a la agencia)
);
```

### Tabla `bcv_rate` (cache)

```sql
create table bcv_rate (
  id          int primary key default 1,
  rate        numeric not null,
  fetched_at  timestamptz default now()
);
```

### RLS

- `demos` y `properties`: lectura pública (anon) solo donde `is_active = true`. Escritura únicamente con `service_role`.
- `demo_visits`: insert público, lectura solo `service_role`.
- `bcv_rate`: lectura pública, escritura `service_role`.

---

## 4. Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Página neutra. **No** es marketing de TiendaPana. Texto mínimo: "Demos de TiendaPana." + link a tiendapana.com. `noindex`. |
| `/[slug]` | La web de la agencia. Home con hero, buscador, grid de inmuebles, confianza, footer. |
| `/[slug]/inmueble/[ref]` | Ficha de detalle del inmueble. |
| `/[slug]/contacto` | Página de contacto con formulario + mapa + WhatsApp. |
| `/admin` | Panel privado. Protegido por Basic Auth vía middleware. |
| `/admin/nuevo` | Formulario de creación de demo. |
| `/admin/[slug]/editar` | Edición. |
| `/api/og/[slug]` | Imagen OG dinámica. |
| `/api/bcv` | Endpoint interno que devuelve la tasa cacheada. |
| `/api/track` | Registra una visita (POST, fire-and-forget). |

**Slug no encontrado o `is_active = false`** → 404 con página neutra. Nunca revelar que existen otros demos.

---

## 5. Dirección de diseño

### Principio rector

El demo **no debe parecerse a TiendaPana**. Debe parecerse a una inmobiliaria seria y cara. El naranja de TiendaPana no aparece en ninguna parte del demo salvo en la barra de cierre del punto 5.6. Si el dueño de la agencia siente que está viendo una plantilla genérica de agencia de marketing, el lead magnet murió.

### 5.1 Paleta

Base fija, acento inyectado por agencia como CSS custom property.

```css
:root {
  --ink:        #12161A;   /* texto principal, casi negro con tinte azul */
  --ink-soft:   #4A5560;   /* texto secundario */
  --paper:      #FBFAF8;   /* fondo principal, blanco cálido */
  --paper-alt:  #F1EFEA;   /* fondo de secciones alternas */
  --line:       #DDD9D2;   /* bordes hairline */
  --accent:     #0F5C4E;   /* SE SOBREESCRIBE por agencia desde la BD */
  --accent-ink: #FFFFFF;   /* texto sobre acento */
}
```

El acento se inyecta en el `<html>` con `style={`--accent: ${demo.accent_hex}`}`. Calcular `--accent-ink` según luminancia del acento (blanco si es oscuro, `--ink` si es claro).

**Prohibido:** fondo crema `#F4F1EA` con serif de alto contraste y acento terracota tipo `#D97757`. Es el look por defecto de todo sitio generado por IA en 2026 y se nota.

### 5.2 Tipografía

Tres roles, deliberadamente distintos:

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** (variable, Google Fonts) | Titulares, nombre de agencia. Peso 600–800, `letter-spacing: -0.03em` en tamaños grandes. |
| Cuerpo | **Inter Tight** | Párrafos, labels, navegación. |
| Datos | **JetBrains Mono** | **Todos los precios, la tasa BCV, m², referencias, y el timestamp de actualización.** |

**La decisión de los números en monoespaciada es intencional y no es negociable.** Es lo que hace que los precios se lean como datos financieros en vivo y no como texto de marketing. Es el ancla emocional de toda la pieza.

Escala tipográfica (ratio 1.25, base 16px):
`12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61`

### 5.3 Layout

Grid de 12 columnas, `max-width: 1200px`, gutter 24px. Mobile-first: **el 90% de los dueños de agencia van a abrir esto desde el teléfono en WhatsApp.** Diseñar el móvil primero y verificarlo en 390px de ancho antes de tocar el desktop.

Radios: `4px` en botones y campos, `8px` en tarjetas. Nada de `border-radius` grandes tipo 24px — lee a "app", no a "inmobiliaria seria".

Sombras: casi ninguna. Separación por hairlines de `1px solid var(--line)`. Una sola sombra suave permitida, en el hover de las tarjetas de inmueble.

### 5.4 Elemento firma: el conversor BCV en vivo

Este es el único punto donde se gasta la audacia del diseño. Todo lo demás se mantiene callado.

En cada precio aparece:

```
$ 89.000
Bs 32.451.300  ·  BCV 364,62  ·  actualizado hace 12 min
```

Comportamiento:
- El monto en Bs **cuenta hacia arriba** con una animación de ~700ms al entrar en viewport (usar `IntersectionObserver`, respetar `prefers-reduced-motion`).
- Un punto verde de 6px pulsa junto al texto "actualizado hace X min".
- Al tocar el precio, se hace toggle entre USD y Bs como valor principal.
- Todo en JetBrains Mono con `font-variant-numeric: tabular-nums` para que los dígitos no bailen.

**Por qué esto y no otra cosa:** convertir precios a mano con la tasa del día es exactamente el trabajo manual que este avatar hace todos los días. Ver esa tarea resuelta sola, en su propia web, con sus propios inmuebles, es el argumento de venta más fuerte disponible. No hay que explicarlo. Se ve.

### 5.5 Movimiento

Contenido y disciplinado:
- Secuencia de carga del hero: fade + subida de 12px, escalonada 60ms entre elementos.
- Grid de inmuebles: reveal al hacer scroll, `stagger` de 40ms.
- Hover de tarjeta: la imagen escala a 1.03 en 400ms `cubic-bezier(0.2, 0, 0, 1)`.
- El contador BCV descrito arriba.

Nada más. Sin parallax, sin partículas, sin gradientes animados.

### 5.6 Barra de cierre TiendaPana

**Único** elemento de marca TiendaPana en toda la experiencia. Barra fija al fondo de la pantalla, altura 56px, fondo `--ink`, que aparece solo después de que el usuario ha scrolleado el 60% de la home:

> **Esta página es real y está en línea.** Le pertenece a [Nombre de Agencia] si la quiere.
> `[ Hablar con TiendaPana ]`

El botón abre WhatsApp hacia el número de Fernando con mensaje pre-llenado:
`Hola, vi el demo de [agency_name] (ref: [slug]) y quiero información.`

Es discreta, honesta, y no interrumpe la experiencia antes de que el valor haya aterrizado.

---

## 6. Componentes, uno por uno

### 6.1 `Header`
Sticky. Logo de la agencia a la izquierda (imagen si `agency_logo_url`, si no un monograma con las iniciales sobre `--accent`). Navegación: Inicio · Inmuebles · Contacto. A la derecha, botón sólido "WhatsApp" con el icono.

En móvil: logo + botón de WhatsApp. Menú hamburguesa para el resto.

### 6.2 `Hero`
No usar imagen de stock genérica. Composición:
- Columna izquierda: `agency_name` en Display 49–61px, `agency_tagline` debajo en 20px `--ink-soft`, y una línea de datos en mono: `[years_operating] años · [properties_sold] inmuebles vendidos · [agency_city]` (omitir los campos que sean null).
- Columna derecha: la foto del inmueble marcado `is_featured` en formato 4:5, con una etiqueta flotante mostrando su precio con el conversor BCV activo.

En `mode = 'rapido'` sin inmuebles cargados: usar un set de 6 inmuebles genéricos precargados en `/src/data/fallback-properties.json` con fotos libres de derechos, y un aviso discreto en el footer: "Inmuebles de muestra."

### 6.3 `SearchBar`
Barra de filtros bajo el hero. Funciona 100% del lado del cliente sobre los inmuebles ya cargados (no hay backend de búsqueda).

Campos: Operación (venta/alquiler) · Tipo · Ubicación · Rango de precio USD · Habitaciones.

**Debe filtrar de verdad.** Si el dueño toca un filtro y no pasa nada, se rompe la ilusión de que es un sitio real, que es lo único que este producto tiene que lograr.

### 6.4 `PropertyCard`
- Imagen 4:3 con `loading="lazy"`, esquinas 8px.
- Badge superior izquierdo: `VENTA` o `ALQUILER`, mono 12px, uppercase, tracking amplio.
- Badge superior derecho: `ref_code`.
- Título en Display 20px, 2 líneas máximo con ellipsis.
- Ubicación con icono de pin, 14px, `--ink-soft`.
- Fila de specs con iconos: `3 hab · 2 baños · 1 pto · 120 m²`, mono 14px.
- Bloque de precio con el conversor BCV.
- Toda la tarjeta es clickeable hacia el detalle.

### 6.5 `PropertyDetail`
- Galería: imagen principal grande + tira de miniaturas. Lightbox al tocar. Swipe en móvil.
- Título, ubicación, `ref_code`.
- Bloque de precio grande con conversor BCV.
- Grid de specs (habitaciones, baños, puestos, m², tipo, operación).
- Descripción.
- Lista de `features` con checks.
- Embed de Google Maps: `<iframe src="https://www.google.com/maps?q={encodeURIComponent(maps_query)}&output=embed">` con `loading="lazy"`.
- **Bloque de acción** (ver 6.6).
- Sección "Otros inmuebles" con 3 tarjetas.

### 6.6 `ActionBlock` — el corazón del lead magnet

Dos botones, uno junto al otro:

**`[ Agendar visita por WhatsApp ]`** (sólido, `--accent`)

```
https://wa.me/{whatsapp_e164}?text={mensaje}
```

Mensaje pre-llenado, URL-encoded:

```
Hola {agency_name}, vi el inmueble "{title}" (Ref. {ref_code}) en su página web.
Precio: ${price_usd}
Me interesa agendar una visita. ¿Tienen disponibilidad esta semana?
```

**`[ Coordinar videollamada ]`** (outline)

```
Hola {agency_name}, estoy fuera del país y vi el inmueble "{title}" (Ref. {ref_code})
en su página web. ¿Podríamos hacer una videollamada para verlo?
```

> **Crítico:** estos botones apuntan al número **real** de la agencia, tomado de `whatsapp_e164`. No al de TiendaPana. Cuando el dueño abre su demo y toca el botón, recibe ese mensaje en su propio teléfono. Ese es el momento que vende la oferta completa. No lo cambies, no lo mockees, no lo redirijas.

El segundo botón existe porque apunta directo al comprador de la diáspora, que es el argumento central del pitch a inmobiliarias.

### 6.7 `TrustSection`
Solo se renderiza si hay datos. Tres columnas: `years_operating` años operando · `properties_sold` inmuebles vendidos · atención en `agency_city`. Números en Display grande, labels en mono 12px uppercase.

Si hay `testimonial_text`, debajo va como una cita en Display 25px con el autor en 14px.

### 6.8 `Footer`
Nombre de la agencia, dirección de oficina, email, link a Instagram (`https://instagram.com/{instagram_handle}`), botón de WhatsApp.

Línea inferior en 12px `--ink-soft`:
`{agency_name} · {agency_city} · Todos los derechos reservados`

### 6.9 `WhatsAppFloat`
Botón flotante circular, esquina inferior derecha, 56px. En móvil se posiciona 72px arriba del borde para no chocar con la barra de cierre de TiendaPana.

---

## 7. Lógica de la tasa BCV

**Fuente:** `https://pydolarve.org/api/v2/tipo-cambio` (o equivalente vigente). Verificar el endpoint activo al momento de construir.

**Estrategia de cache:**
1. Endpoint `/api/bcv` lee de la tabla `bcv_rate`.
2. Si `fetched_at` tiene más de 6 horas, hace fetch a la API externa, actualiza la fila y devuelve el nuevo valor.
3. Si el fetch externo falla, devuelve el último valor cacheado con la marca de tiempo real. **Nunca romper la página por esto.**
4. Si la tabla está vacía y el fetch falla, usar un fallback hardcodeado y mostrar el precio solo en USD, ocultando la línea de Bs.

La tasa se resuelve **en el servidor** durante el render de la página y se pasa a los componentes como prop. Nada de fetch desde el cliente en el primer render.

---

## 8. Imagen OG dinámica

Cuando Fernando pegue el link en WhatsApp, tiene que aparecer una tarjeta de vista previa con el nombre de la agencia. Sin esto el link parece spam y nadie lo abre. **Esta pieza no es opcional.**

`/api/og/[slug]` genera un PNG de 1200×630:
- Fondo `--paper`.
- Nombre de la agencia en Bricolage Grotesque 72px.
- `agency_city` debajo en 32px.
- Barra inferior de 8px con el color `accent_hex` de la agencia.
- Si existe la foto del inmueble destacado, ocupa el 40% derecho.

Meta tags en `/[slug]`:
```html
<meta property="og:title" content="{agency_name} — Inmuebles en {agency_city}">
<meta property="og:description" content="Vea nuestro catálogo de inmuebles disponibles con precios actualizados.">
<meta property="og:image" content="https://demo.tiendapana.com/api/og/{slug}">
<meta property="og:url" content="https://demo.tiendapana.com/{slug}">
<meta name="robots" content="noindex, nofollow">
```

`noindex` en todo el sitio, sin excepción. Estos demos no deben aparecer en Google ni competir con nada.

---

## 9. Panel `/admin`

Protegido con Basic Auth vía middleware de Astro contra `ADMIN_USER` y `ADMIN_PASS` en variables de entorno. Sin login social, sin sesiones, sin complicaciones.

### `/admin` — listado
Tabla con: agencia · slug · creado · **visitas** · última visita · estado · acciones.

Ordenada por última visita descendente, para que lo primero que Fernando vea sea quién acaba de abrir su demo. Ese es el disparador de escalamiento comercial y es el dato más importante de todo el panel.

### `/admin/nuevo` — formulario
Un solo formulario, todos los campos de `demos`, más un repetidor para hasta 6 inmuebles.

Debe incluir:
- **Autogeneración de slug** desde `agency_name` (slugify), editable.
- **Uploader de imágenes** a Supabase Storage con drag & drop y preview. Redimensionar del lado del cliente a máximo 1600px de ancho y comprimir a WebP calidad 80 antes de subir, para que las fotos de Instagram no pesen 4MB.
- **Selector de color** para `accent_hex` con muestras predefinidas.
- Validación de `whatsapp_e164`: solo dígitos, empieza con 58, longitud 12.
- Al guardar: mostrar el link generado con un botón **"Copiar link"** y otro **"Copiar mensaje de WhatsApp"** que copie el mensaje de outreach completo con el link ya insertado.

Ese último botón es el que convierte el proceso en una operación de 40 segundos. Priorízalo.

### Plantilla del mensaje de outreach a copiar

```
Buenas {agency_name}, vi el {título del inmueble destacado} que publicaron.

Les monté algo para que lo vean: {link}

Es su inventario dentro de una página web real. Ábranlo desde el teléfono,
es gratis y no les pido nada. Si le dan a "Agendar visita" les llega el
mensaje a su propio WhatsApp.
```

---

## 10. Analítica de visitas

En el layout de `/[slug]`, un script mínimo que hace `POST` a `/api/track` con `{ slug, path }` al cargar. Fire-and-forget, sin bloquear el render.

`/api/track` inserta en `demo_visits` capturando `user_agent` y `referrer` del request.

Filtrar visitas propias: si el request trae la cookie `tp_admin=1` (que se setea al pasar por `/admin`), no registrar.

---

## 11. Variables de entorno

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_USER=
ADMIN_PASS=
TIENDAPANA_WHATSAPP=584XXXXXXXXX
BCV_API_URL=https://pydolarve.org/api/v2/tipo-cambio
SITE_URL=https://demo.tiendapana.com
```

---

## 12. Criterios de aceptación

La v1 está terminada cuando todas estas son verdaderas:

1. Agregar una agencia nueva desde `/admin` toma **menos de 3 minutos** con 4 inmuebles y sus fotos.
2. El link funciona **al instante**, sin redeploy.
3. Abierto en un teléfono de 390px, el hero se lee completo sin scroll horizontal y sin texto cortado.
4. Los precios muestran USD y Bs con la tasa BCV real del día.
5. El botón "Agendar visita" abre WhatsApp con el mensaje completo y correcto hacia el número de la agencia.
6. Pegar el link en WhatsApp muestra una tarjeta de preview con el nombre de la agencia.
7. Los filtros del buscador filtran realmente el grid.
8. La página carga en menos de 2 segundos en 4G.
9. Un slug inexistente devuelve 404 limpio.
10. El panel muestra cuántas veces se abrió cada demo y cuándo fue la última.
11. `Lighthouse` móvil: Performance ≥ 85, Accessibility ≥ 95.
12. Todo el sitio responde `noindex`.

---

## 13. Fuera de alcance en v1

No construir, aunque sea tentador:
- Login de agencias o cualquier tipo de cuenta.
- Panel para que la agencia edite su propio demo.
- Pasarela de pago.
- Formulario de contacto que envíe correos (el CTA es WhatsApp, punto).
- Multi-idioma.
- Modo oscuro.
- Blog o cualquier contenido SEO.
- Expiración automática de demos.

---

## 14. Orden de construcción sugerido

1. Scaffold de Astro + Tailwind + adapter de Vercel + cliente de Supabase. Deploy vacío a Vercel con el dominio conectado.
2. Migraciones SQL de las cuatro tablas + RLS + bucket de storage.
3. Ruta `/[slug]` leyendo de la BD, renderizando texto plano sin estilos. **Verificar que el flujo de datos funciona antes de diseñar nada.**
4. Sistema de tokens de diseño e inyección del acento.
5. Header, Hero, PropertyCard, grid.
6. Componente de precio con conversor BCV + endpoint `/api/bcv` con su cache.
7. Página de detalle de inmueble + ActionBlock con los deeplinks de WhatsApp.
8. SearchBar con filtrado del lado del cliente.
9. TrustSection, Footer, WhatsAppFloat, barra de cierre de TiendaPana.
10. OG dinámico.
11. Panel `/admin` completo con uploader y botones de copiado.
12. Tracking de visitas.
13. Pase de pulido: móvil a 390px, estados de foco, `prefers-reduced-motion`, Lighthouse.

Sembrar un demo de prueba con datos realistas de una agencia ficticia de Margarita desde el paso 3, para poder juzgar el diseño con contenido real y no con lorem ipsum.

---

## 15. Nota sobre replicabilidad a otros nichos

La arquitectura debe permitir clonar esto a concesionarios, agencias de turismo y tiendas de Instagram cambiando únicamente:

- El esquema de `properties` → `vehicles` / `tours` / `products`.
- Los componentes de tarjeta y detalle.
- Los textos de los mensajes de WhatsApp.

Todo lo demás —tokens de diseño, conversor BCV, admin, OG dinámico, tracking, deeplinks— es compartido. **Escribir esas piezas de forma agnóstica al nicho desde el primer día**, en `/src/lib/` y no dentro de componentes de inmuebles. Es la diferencia entre construir esto cuatro veces y construirlo una.
