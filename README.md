# ANV·BAR Web

Tienda web de marca para **ANV·BAR**, moda femenina hecha a mano (Colombia). Sin carrito y sin pasarela de pago: catálogo en vivo, fichas de producto y pedidos por WhatsApp en texto. Incluye un panel de administración privado para gestionar el catálogo.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (tokens de diseño en `@theme`, dentro de `src/app/index.css`)
- Supabase: catálogo de productos en vivo (Postgres + Auth + Storage)
- Fuentes bundleadas localmente (Fontsource): Fraunces Variable (títulos) + Manrope (texto)

## Requisitos

- Node.js 20 o superior
- Un archivo `.env` con las variables de Supabase (ver más abajo)

## Comandos

```bash
npm install       # instala dependencias (primera vez)
npm run dev       # servidor de desarrollo (recarga en caliente)
npm run build     # typecheck + build de producción (dist/)
npm run preview   # sirve el build de producción localmente
npm run lint      # revisa el código (oxlint)
npm run seed      # siembra productos y categorías desde content/products hacia Supabase
```

## Estructura

La organización sigue arquitectura *screaming*: las carpetas gritan qué hace el negocio, no qué framework usa.

```
src/
  app/          # arranque: App (rutas por hash + gate del catálogo), main, tokens CSS
  catalog/      # EL corazón: tipos y mapeo de productos, contexto de carga,
                # tarjetas, grilla, ficha, galería, quick view, destacados
  favorites/    # página de favoritos + persistencia de likes (localStorage)
  reviews/      # reseñas de clientas (sección + wizard + storage local)
  storefront/   # secciones públicas: Nav, Hero, TrustBar, Designer,
                # Exclusivity, Testimonials, Contact, Footer, canales, WhatsApp
  chat/         # widget flotante de chat + cerebro del bot
  admin/        # panel privado (#/admin): login, CRUD de productos, importación,
                # recuperación de contraseña, auth
  shared/       # primitivas transversales: Container, Reveal, cliente Supabase
content/        # contenido editable en build (testimonios, diseñadora, contacto,
                # categorías) + fuente del seed (content/products/*.json)
supabase/       # migraciones SQL, políticas RLS, verificaciones y seed
public/imagenes/  # fotos locales referenciadas por los JSON del seed
```

## Flujo de datos

- **Productos y categorías**: se leen EN VIVO desde Supabase al iniciar la app. Un gate de pantalla completa bloquea el render hasta que la carga termina (con estado de error y reintento).
- **Testimonios, perfil de la diseñadora y contacto**: se cargan en build desde `content/testimonials.json`, `content/designer.json` y `content/contact.json`. Aceptan arreglo raíz o objeto envuelto.
- **Categorías**: son contrato de presentación. La tupla canónica vive en `src/catalog/catalog.ts`; el seed valida que la base coincida.
- **Seed**: `npm run seed` toma cada `content/products/*.json`, sube sus fotos al bucket de Storage y crea las filas en Postgres.

## Panel de administración

Ruta `#/admin` dentro de la misma SPA:

- Login con email/contraseña vía Supabase Auth; acceso restringido por una allowlist SQL (`is_admin()`) que media TODAS las políticas de escritura en RLS.
- CRUD completo de productos con subida de fotos a Storage, importación masiva desde planilla y generación automática de slug.

## Variables de entorno

Copia `.env.example` a `.env` y completa:

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto (va al bundle) |
| `VITE_SUPABASE_ANON_KEY` | clave anónima (pública por diseño; RLS es la barrera) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo para `npm run seed`; NUNCA con prefijo `VITE_`, nunca se commitea |

## Convenciones de dominio

- Precios SIEMPRE enteros en COP sin decimales ni puntos: `250000` se muestra como `$250.000`.
- Sin ofertas ni descuentos: nunca aparecen badges de SALE; el badge estándar es "Bajo pedido 3-5 días".
- Pedidos solo por WhatsApp texto (formato E.164 `573186424021`); el sitio nunca ofrece llamadas.

---

© ANV·BAR — Hecho a mano en el Caribe colombiano.
