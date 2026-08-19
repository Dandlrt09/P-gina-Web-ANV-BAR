/**
 * ANV·BAR — Catálogo (productos desde Supabase, resto desde archivos locales).
 *
 * Los productos y su orden de presentación se cargan UNA vez al iniciar la
 * aplicación: el CatalogProvider (src/lib/CatalogContext.tsx) hace el fetch y
 * rellena el singleton `PRODUCTS` de este módulo ANTES de que el gate de
 * render lo deje pasar. La interfaz consume `PRODUCTS`/`CATEGORIES` exactamente
 * como antes — este módulo es hoy solo la capa de mapeo (tipos 1:1 con la
 * respuesta de Supabase) junto con testimonios y perfil de la diseñadora, que
 * siguen cargándose en build desde `content/` (Decap CMS).
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
  /** Orden de presentación en el catálogo (0 primero, 1 después...). Opcional:
   *  si falta, se ordena después de los numerados; los empates por id. */
  sortOrder?: number
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
/* Categorías del catálogo (orden de presentación "todo a la vista")   */
/* ------------------------------------------------------------------ */

/**
 * Tupla estática con las 7 categorías vigentes en su orden de presentación
 * (contrato de la interfaz). La semilla de Supabase valida la base contra esta
 * tupla y falla si difieren (fail-loud): el sitio ya no deriva categorías de
 * content/categories.json.
 */
export const CATEGORIES = [
  'Vestidos',
  'Conjuntos',
  'Camisas',
  'Faldas',
  'Pantalones',
  'Sets',
  'Accesorios',
] as const

export type ProductCategory = (typeof CATEGORIES)[number]

/* ------------------------------------------------------------------ */
/* Productos (provenientes de Supabase)                                */
/* ------------------------------------------------------------------ */

/**
 * Fila cruda de la tabla `products` (1:1 con el payload de Supabase, nombres
 * snake_case). `categories(sort_order)` se agrega en el fetch del provider
 * como embed futuro; no forma parte del tipo de producto de la interfaz.
 * `fabric`/`care`/`editorial` son columnas nullable; la semilla valida que
 * sean texto no vacío, así que el `?? ''` del mapeo es inalcanzable con datos
 * correctos.
 */
export type ProductRow = {
  id: string
  name: string
  category: string
  price_cop: number
  sizes: string[]
  fabric: string | null
  care: string | null
  editorial: string | null
  is_new: boolean
  sort_order: number | null
  colors: ProductColor[]
  created_at: string
  updated_at: string
}

/**
 * Fila cruda de la proyección `select('name,sort_order')` de la tabla
 * `categories` (orden de presentación; `id` no se consulta).
 */
export type CategoryRow = {
  name: string
  sort_order: number
}

/** Mapea una fila de `products` a `Product` (snake_case → camelCase). */
export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    // La FK de la base apunta a categories.name y la semilla valida la tupla:
    // el cast es seguro y reproduce el parser retirado.
    category: row.category as ProductCategory,
    priceCOP: row.price_cop,
    colors: row.colors,
    sizes: row.sizes,
    fabric: row.fabric ?? '',
    care: row.care ?? '',
    editorial: row.editorial ?? '',
    // Solo `true` explicito marca novedad / solo valor numerado define orden,
    // igual que el parser retirado (ausencia ≠ false).
    ...(row.is_new === true ? { isNew: true } : {}),
    ...(row.sort_order != null ? { sortOrder: row.sort_order } : {}),
  }
}

/** Mapea una fila de `categories` a su nombre de presentación. */
export function mapCategoryRow(row: CategoryRow): ProductCategory {
  return row.name as ProductCategory
}

/**
 * Productos del catálogo en el orden de presentación (sort_order ASC NULLS
 * LAST, luego id) tal como los devuelve Supabase. Singleton de módulo: se llena
 * una sola vez por carga de página (CatalogProvider) y jamás se renderiza
 * vacío gracias al gate de la App.
 */
export let PRODUCTS: Product[] = []

/** Rellena el singleton `PRODUCTS` (lo invoca exclusivamente CatalogProvider). */
export function setCatalogProducts(products: Product[]): void {
  PRODUCTS = products
}

/* ------------------------------------------------------------------ */
/* Testimonios (content/testimonials.json)                             */
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

function requiredString(product: Record<string, unknown>, key: string, file: string): string {
  const value = product[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[catalog] "${file}": el campo "${key}" es obligatorio y debe ser texto no vacío.`)
  }
  return value
}

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
 * Compara dos productos por orden de presentación: primero por `sortOrder`
 * (0, 1, 2...); los que no tienen `sortOrder` van después de los numerados;
 * los empates se resuelven por `id`. Espeja el `ORDER BY sort_order NULLS
 * LAST, id` del fetch de Supabase; se mantiene para la cinta de novedades
 * (filtra una sub-lista y la reordena con el mismo criterio).
 */
export function compareCatalogOrder(a: Product, b: Product): number {
  const aOrder = a.sortOrder ?? Number.POSITIVE_INFINITY
  const bOrder = b.sortOrder ?? Number.POSITIVE_INFINITY
  return aOrder - bOrder || a.id.localeCompare(b.id)
}

/**
 * Formatea un precio COP a "$250.000" (sin decimales).
 * El precio se guarda como entero; esta función solo agrega el separador
 * de miles y el símbolo de pesos.
 */
export function formatCOP(priceCOP: number): string {
  return '$' + priceCOP.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}