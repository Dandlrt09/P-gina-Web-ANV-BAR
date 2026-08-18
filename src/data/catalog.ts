/**
 * ANV·BAR — Catálogo (contenido proveniente de archivos editables).
 *
 * Los datos (productos, testimonios, perfil de la diseñadora y categorías) se
 * cargan en tiempo de build desde el directorio `content/` del proyecto. El
 * equipo edita esos archivos desde el admin (Decap CMS) sin tocar código; el
 * bundle los empaqueta y la interfaz los consume exactamente igual que antes.
 *
 * CÓMO EDITAR EL SITIO SIN TOCAR CÓDIGO:
 *  - Productos: un archivo JSON por pieza en content/products/. El orden de
 *    presentación del catálogo lo define el identificador `id` (orden alfabético).
 *  - Testimonios: content/testimonials.json. Perfil de la diseñadora:
 *    content/designer.json. Categorías: content/categories.json (su orden es
 *    el de presentación del catálogo).
 *  - Reemplaza una foto: asigna `src` en la variante de color (ruta dentro de
 *    /public o URL externa). Mientras `src` quede vacío, la interfaz muestra un
 *    placeholder tipográfico elegante con `label`.
 *
 * Convenciones del tipo Product:
 *  - priceCOP SIEMPRE en pesos enteros sin decimales (250000 → "$250.000").
 *  - colors contiene variantes de color REALES (nombre + hex exacto).
 *  - No hay ofertas ni descuentos: el sitio nunca muestra badges de SALE; el
 *    badge estándar es "Bajo pedido 3-5 días".
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type ProductImage = {
  /** Ruta de la foto real (carpeta /public o URL). Vacío → placeholder elegante. */
  src?: string
  /** Fotos adicionales de la misma variante (más allá de la principal). Cada
   *  una es una ruta o URL. La primera se usa como vista hover en las tarjetas;
   *  todas aparecen en la galería de la ficha. Opcional. */
  gallery?: string[]
  /** Texto corto: se muestra en el placeholder tipográfico y sirve de alt. Ej: "Burdeo". */
  label: string
}

export type ProductColor = {
  /** Nombre visible del color, tal como aparece en la ficha del producto. */
  name: string
  /** Hex exacto del color (#rrggbb). */
  hex: string
  /** Foto opcional por variante de color. */
  image?: ProductImage
}

export type Product = {
  /** Identificador único del producto (enlaces y favoritos). No debe repetirse. */
  id: string
  /** Nombre de venta del producto. */
  name: string
  /** Categoría: debe ser uno de los valores de CATEGORIES. */
  category: ProductCategory
  /** Precio en pesos colombianos, SOLO enteros sin decimales (ej. 250000 = "$250.000"). */
  priceCOP: number
  /** Variantes de color reales del producto. */
  colors: ProductColor[]
  /** Tallas disponibles (ej. ["XS","S","M","L","XL"] o ["Único"] para accesorios). */
  sizes: string[]
  /** Tela principal; se muestra en los datos técnicos de la ficha. */
  fabric: string
  /** Instrucciones de cuidado; se muestran en los datos técnicos de la ficha. */
  care: string
  /** Texto editorial de la ficha: voz de marca, 1-2 frases. */
  editorial: string
  /** Flag de novedad (lo marca Anays): la pieza aparece en la cinta de novedades. */
  isNew?: boolean
}

export type Testimonial = {
  /** Nombre de la clienta ("Clienta ANV·BAR" si prefiere anonimato). */
  name: string
  /** Ciudad (opcional). */
  city?: string
  /** Texto del testimonio en español neutro. */
  text: string
}

export type DesignerProfile = {
  /** Nombre de la diseñadora. */
  name: string
  /** Rol o firma que aparece junto al nombre. */
  role: string
  /** Biografía corta (texto de ejemplo, reemplazable). */
  bio: string
  /** Historia de la colección. */
  collection: {
    /** Nombre de la colección (ej. "RUBRA"). */
    name: string
    /** Relato de la colección en español neutro. */
    story: string
  }
  /** Frase de marca; se mantiene en su idioma original. */
  claim: string
}

/* ------------------------------------------------------------------ */
/* Carga de contenido (archivos JSON en content/)                      */
/* ------------------------------------------------------------------ */

/**
 * Devuelve el contenido de un único archivo JSON de `content/`, comprobando
 * que exista. Lanza un error claro si falta, para detectarlo al levantar el
 * sitio (dev/build) y no con un catálogo silenciosamente roto.
 */
function singleContentFile(entries: [string, unknown][], label: string): unknown {
  if (entries.length === 0) {
    throw new Error(`[catalog] No se encontró ${label}. Es un archivo de contenido obligatorio.`)
  }
  return entries[0][1]
}

/**
 * Normaliza una lista que puede venir como arreglo raíz del JSON, o como
 * objeto con esa clave (la forma que usa Decap CMS al guardar file
 * collections). Lanza un error claro si el contenido no coincide.
 */
function listFromJson(raw: unknown, key: string, label: string): unknown[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>)[key])
      ? ((raw as Record<string, unknown>)[key] as unknown[])
      : null
  if (list === null) {
    throw new Error(
      `[catalog] El contenido de ${label} debe ser una lista JSON o un objeto con la clave "${key}".`,
    )
  }
  return list
}

const categories: string[] = listFromJson(
  singleContentFile(
    Object.entries(
      import.meta.glob('../../content/categories.json', { eager: true, import: 'default' }),
    ),
    'content/categories.json',
  ),
  'categories',
  'content/categories.json',
).map((category, index) => {
  if (typeof category !== 'string' || category.trim() === '') {
    throw new Error(
      `[catalog] La categoría #${index + 1} de content/categories.json debe ser texto no vacío.`,
    )
  }
  return category.trim()
})

const seenCategories = new Set<string>()
for (const category of categories) {
  if (seenCategories.has(category)) {
    throw new Error(`[catalog] content/categories.json repite la categoría "${category}".`)
  }
  seenCategories.add(category)
}

/* ------------------------------------------------------------------ */
/* Categorías del catálogo (orden de presentación "todo a la vista")   */
/* ------------------------------------------------------------------ */

/**
 * Lista de categorías con su orden de presentación. En runtime proviene de
 * content/categories.json (editable desde el admin); el tipo se mantiene como
 * tupla readonly de las 7 categorías vigentes (contrato de la interfaz).
 */
export const CATEGORIES = categories as unknown as readonly [
  'Vestidos',
  'Conjuntos',
  'Camisas',
  'Faldas',
  'Pantalones',
  'Sets',
  'Accesorios',
]

export type ProductCategory = (typeof CATEGORIES)[number]

/* ------------------------------------------------------------------ */
/* Productos (un archivo JSON por pieza en content/products/)          */
/* ------------------------------------------------------------------ */

function requiredString(product: Record<string, unknown>, key: string, file: string): string {
  const value = product[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[catalog] "${file}": el campo "${key}" es obligatorio y debe ser texto no vacío.`)
  }
  return value
}

function parseImage(where: string, raw: unknown, fallbackLabel: string): ProductImage {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`[catalog] ${where} espera un objeto de imagen.`)
  }
  const image = raw as Record<string, unknown>
  const src = typeof image.src === 'string' && image.src.trim() !== '' ? image.src : undefined
  const gallery = Array.isArray(image.gallery)
    ? image.gallery
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item !== '')
    : undefined
  const label =
    typeof image.label === 'string' && image.label.trim() !== '' ? image.label : fallbackLabel
  return {
    ...(typeof src === 'string' ? { src } : {}),
    ...(Array.isArray(gallery) && gallery.length > 0 ? { gallery } : {}),
    label,
  }
}

function parseColor(file: string, raw: unknown, index: number): ProductColor {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`[catalog] "${file}": la variante de color #${index + 1} debe ser un objeto.`)
  }
  const color = raw as Record<string, unknown>
  const name = typeof color.name === 'string' ? color.name : ''
  const hex = typeof color.hex === 'string' ? color.hex : ''
  if (name.trim() === '' || hex.trim() === '') {
    throw new Error(`[catalog] "${file}": cada variante de color necesita "name" y "hex" no vacíos.`)
  }
  const parsed: ProductColor = { name, hex }
  if (color.image != null) {
    parsed.image = parseImage(`"${file}" (color "${name}")`, color.image, name)
  }
  return parsed
}

function parseProductFile(file: string, rawContent: unknown): Product {
  if (typeof rawContent !== 'object' || rawContent === null || Array.isArray(rawContent)) {
    throw new Error(`[catalog] "${file}": el contenido debe ser un objeto JSON con un producto.`)
  }
  const product = rawContent as Record<string, unknown>

  const id = requiredString(product, 'id', file)
  const name = requiredString(product, 'name', file)
  const category = requiredString(product, 'category', file)
  if (!categories.includes(category)) {
    throw new Error(
      `[catalog] "${file}": la categoría "${category}" no figura en content/categories.json.`,
    )
  }

  const priceCOP = product.priceCOP
  if (typeof priceCOP !== 'number' || !Number.isInteger(priceCOP) || priceCOP < 0) {
    throw new Error(
      `[catalog] "${file}": priceCOP debe ser un número entero en pesos colombianos, sin decimales.`,
    )
  }

  const rawColors = product.colors
  if (!Array.isArray(rawColors) || rawColors.length === 0) {
    throw new Error(`[catalog] "${file}": colors debe ser una lista no vacía de variantes de color.`)
  }
  const colors = rawColors.map((color, index) => parseColor(file, color, index))

  let sizes: string[]
  if (category === 'Accesorios') {
    sizes = ['Único']
  } else {
    const rawSizes = product.sizes
    if (!Array.isArray(rawSizes)) {
      throw new Error(`[catalog] "${file}": sizes debe ser una lista de tallas.`)
    }
    sizes = rawSizes
      .map((size) => (typeof size === 'string' ? size.trim() : ''))
      .filter((size) => size !== '')
    if (sizes.length === 0) {
      throw new Error(`[catalog] "${file}": sizes no puede quedar vacío.`)
    }
  }

  const data: Product = {
    id,
    name,
    category: category as ProductCategory,
    priceCOP,
    colors,
    sizes,
    fabric: requiredString(product, 'fabric', file),
    care: requiredString(product, 'care', file),
    editorial: requiredString(product, 'editorial', file),
  }
  if (product.isNew === true) {
    data.isNew = true
  }

  return data
}

const productEntries = Object.entries(
  import.meta.glob('../../content/products/*.json', { eager: true, import: 'default' }),
)
if (productEntries.length === 0) {
  throw new Error('[catalog] No hay archivos en content/products/. Cada producto requiere su archivo JSON.')
}

/**
 * Productos del catálogo ordenados por identificador (`id`) de forma
 * determinística (el orden del glob JSON no está garantizado). Ese orden
 * define la presentación del catálogo y de la cinta de novedades.
 */
export const PRODUCTS: Product[] = productEntries
  .map(([file, rawContent]) => parseProductFile(file, rawContent))
  .sort((a, b) => a.id.localeCompare(b.id))

/* ------------------------------------------------------------------ */
/* Testimonios (content/testimonials.json)                             */
/* ------------------------------------------------------------------ */

const testimonialsEntries = listFromJson(
  singleContentFile(
    Object.entries(
      import.meta.glob('../../content/testimonials.json', { eager: true, import: 'default' }),
    ),
    'content/testimonials.json',
  ),
  'testimonials',
  'content/testimonials.json',
)

const parsedTestimonials: Testimonial[] = testimonialsEntries.map((item, index) => {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new Error(`[catalog] El testimonio #${index + 1} de content/testimonials.json debe ser un objeto.`)
  }
  const testimonial = item as Record<string, unknown>
  const name = testimonial.name
  const text = testimonial.text
  if (typeof name !== 'string' || name.trim() === '' || typeof text !== 'string' || text.trim() === '') {
    throw new Error(
      `[catalog] El testimonio #${index + 1} necesita "name" y "text" no vacíos (content/testimonials.json).`,
    )
  }
  const parsed: Testimonial = { name, text }
  if (typeof testimonial.city === 'string' && testimonial.city !== '') {
    parsed.city = testimonial.city
  }
  return parsed
})

export const TESTIMONIALS: Testimonial[] = parsedTestimonials

/* ------------------------------------------------------------------ */
/* Perfil de la diseñadora (content/designer.json)                     */
/* ------------------------------------------------------------------ */

const designerRaw = singleContentFile(
  Object.entries(import.meta.glob('../../content/designer.json', { eager: true, import: 'default' })),
  'content/designer.json',
)
if (typeof designerRaw !== 'object' || designerRaw === null || Array.isArray(designerRaw)) {
  throw new Error('[catalog] content/designer.json debe ser un objeto con el perfil de la diseñadora.')
}
const designer = designerRaw as Record<string, unknown>
const collectionRaw = designer.collection
if (typeof collectionRaw !== 'object' || collectionRaw === null || Array.isArray(collectionRaw)) {
  throw new Error('[catalog] content/designer.json necesita un objeto "collection" con "name" y "story".')
}
const collection = collectionRaw as Record<string, unknown>
export const DESIGNER: DesignerProfile = {
  name: requiredString(designer, 'name', 'content/designer.json'),
  role: requiredString(designer, 'role', 'content/designer.json'),
  bio: requiredString(designer, 'bio', 'content/designer.json'),
  collection: {
    name: requiredString(collection, 'name', 'content/designer.json'),
    story: requiredString(collection, 'story', 'content/designer.json'),
  },
  claim: requiredString(designer, 'claim', 'content/designer.json'),
}

/* ------------------------------------------------------------------ */
/* Utilidad de formato (usada por la interfaz de catálogo)             */
/* ------------------------------------------------------------------ */

/**
 * Formatea un precio COP a "$250.000" (sin decimales).
 * El precio se guarda como entero; esta función solo agrega el separador
 * de miles y el símbolo de pesos.
 */
export function formatCOP(priceCOP: number): string {
  return '$' + priceCOP.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}