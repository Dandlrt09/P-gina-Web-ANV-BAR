# ANV·BAR Web

Sitio web estático de marca para **ANV·BAR**, moda femenina hecha a mano (Colombia). Sin backend, sin carrito y sin pasarela de pago: catálogo, fichas de producto y pedidos por WhatsApp en texto.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (tokens de diseño en `@theme`, dentro de `src/index.css`)
- Fuentes bundleadas localmente (Fontsource): Fraunces Variable (títulos) + Manrope (texto)

## Requisitos

- Node.js 20 o superior (desarrollado y probado con Node 26)

## Comandos

```bash
npm install       # instala dependencias (primera vez)
npm run dev       # servidor de desarrollo (recarga en caliente)
npm run build     # typecheck + build de producción (dist/)
npm run preview   # sirve el build de producción localmente
npm run lint      # revisa el código (oxlint)
```

## Estructura

```
src/
  data/catalog.ts      # fuente única del catálogo (productos, testimonios, perfil)
  data/contact.ts      # canales de contacto oficiales
  components/          # componentes de interfaz (NO editar contenido aquí)
  lib/whatsapp.ts      # número de WhatsApp de pedidos (solo texto, sin llamadas)
  lib/likes-storage.ts # persistencia de favoritos (localStorage)
  index.css            # tokens de marca: paleta y tipografías
```

---

## Guía de reemplazo de contenido

Toda la información del sitio (productos, precios, colores, testimonios, perfil de la diseñadora y contacto) se edita **solo en los archivos de datos**. No hace falta tocar componentes ni código de interfaz.

### 1. Productos, precios y colores — `src/data/catalog.ts`

Cada producto es un objeto dentro de `PRODUCTS`:

```ts
{
  id: 'vestido-rubra-nocturno',     // identificador único (no repetir)
  name: 'Vestido RUBRA Nocturno',   // nombre visible
  category: 'Vestidos',             // una de las 7 categorías (ver abajo)
  priceCOP: 320000,                 // precio en pesos, SOLO entero
  colors: [
    { name: 'Burdeo', hex: '#58232c', image: { label: 'Vestido RUBRA Nocturno — Burdeo' } },
  ],
  sizes: ['S', 'M', 'L'],           // tallas disponibles ('Único' para accesorios)
  fabric: 'Gasa de seda',           // tela (se muestra en la ficha)
  care: 'Lavar a mano con agua fría.', // cuidados
  editorial: 'Texto de la pieza...', // voz editorial de la ficha
}
```

- **Categorías** disponibles (orden de aparición en la página): `Vestidos`, `Conjuntos`, `Camisas`, `Faldas`, `Pantalones`, `Sets`, `Accesorios`.
- **Precios**: siempre enteros, sin decimales ni puntos. `250000` se muestra como `$250.000`.
- **Colores**: `name` es el nombre visible; `hex` es el color exacto del selector. Puedes usar los colores de marca (`#58232c` burdeo, `#390f12` burdeo profundo, `#8c6d51` dorado, `#000000` negro, `#f3f2ef` marfil) u otros que representen la prenda real.
- **Fotos**: coloca la imagen dentro de la carpeta `public/` del proyecto y escribe su ruta en `src` — por ejemplo `src: '/vestido-burdeo.jpg'`. Mientras `src` esté vacío, el sitio muestra un placeholder tipográfico elegante con el texto de `label`, así que el sitio funciona perfectamente sin fotos.
- **Badges**: por defecto todo producto muestra “Bajo pedido 3-5 días”. No se usan ofertas ni descuentos.

### 2. Testimonios — `src/data/catalog.ts`

Dentro de `TESTIMONIALS`:

```ts
{ name: 'Valentina R.', city: 'Barranquilla', text: 'El vestido llegó en el tiempo prometido...' }
```

- `name` es el nombre que se muestra (puede ser “Clienta ANV·BAR” si prefiere anonimato).
- `city` es opcional: si se omite, no aparece la ciudad.
- `text` es el testimonio.

### 3. Perfil de la diseñadora — `src/data/catalog.ts`

Dentro de `DESIGNER`:

```ts
{
  name: 'Anays Vargas',
  role: 'Diseñadora y fundadora de ANV·BAR',
  bio: 'Creadora caribeña...',
  collection: { name: 'RUBRA', story: 'La historia de la colección...' },
  claim: 'Donde la ligereza se convierte en elegancia',
}
```

- `claim` es la frase de marca: se mantiene en su idioma original.
- Al actualizar `bio`, `collection.story` o `name`, la sección “La diseñadora” cambia automáticamente, sin tocar código.

### 4. Contacto — `src/data/contact.ts`

Cada canal es un objeto de `CONTACT_CHANNELS`:

```ts
{ label: 'WhatsApp', handle: '3186424021', href: 'https://wa.me/573186424021', note: 'Pedidos por mensaje de texto, sin llamadas' }
```

- `handle` es el texto visible; `href` es el enlace; `note` es opcional.
- El número de WhatsApp en los enlaces usa formato internacional **E.164**: `573186424021` (prefijo `+57` + número). Si algún día cambia el número, actualízalo aquí **y también** en `src/lib/whatsapp.ts` (allí vive el número de los pedidos).
- El sitio nunca ofrece llamadas: solo mensajes de texto.

### 5. Lo que no debe editarse

- `src/components/` — componentes de interfaz; el contenido vive en los archivos de datos.
- `src/index.css` — tokens de marca (paleta y tipografías).
- `src/lib/whatsapp.ts` — lógica de pedidos; solo se toca si cambia el número de WhatsApp.

### 6. Después de cada cambio

```bash
npm run build   # verifica que todo compile y genera dist/
```

Si el servidor de desarrollo (`npm run dev`) está corriendo, los cambios se reflejan solos al guardar.

---

© ANV·BAR — Hecho a mano en el Caribe colombiano.