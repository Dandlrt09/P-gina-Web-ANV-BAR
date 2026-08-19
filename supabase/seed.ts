/**
 * supabase-products — server-side seed (Fase 0: data foundations).
 *
 * Upserts categories + products from `content/*.json` into Supabase and uploads
 * product images to the public "productos" bucket under
 * `/productos/<product-id>/<filename>`.
 *
 * Runs with the service_role key — NEVER in the client bundle:
 *   - `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix, never bundled)
 *   - `VITE_SUPABASE_URL` is read from env only to build absolute storage URLs.
 *
 * Fail-loud by design: any validation mismatch or write error exits non-zero.
 * Rules mirror the retired parser in `src/data/catalog.ts` verbatim (parity);
 * `featuredImage`/`addedAt` are deliberately ignored (dead fields).
 *
 * Run: npm run seed  (requires a populated `.env` — see `.env.example`)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content')
const PRODUCTS_DIR = path.join(CONTENT_DIR, 'products')
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'imagenes')
const STORAGE_BUCKET = 'productos'
const ENV_FILE = path.join(PROJECT_ROOT, '.env')

/**
 * Static 7-tuple of catalog categories (presentation order). The seed asserts
 * BOTH the content JSON and the live DB categories against this tuple.
 */
export const CANONICAL_CATEGORIES = [
  'Vestidos',
  'Conjuntos',
  'Camisas',
  'Faldas',
  'Pantalones',
  'Sets',
  'Accesorios',
] as const

type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number]

type ProductColorSource = {
  name: string
  hex: string
  image?: ProductImageSource
}

type ProductImageSource = {
  src?: string
  gallery?: string[]
  label: string
}

type ParsedProduct = {
  id: string
  name: string
  category: CanonicalCategory
  priceCOP: number
  colors: ProductColorSource[]
  sizes: string[]
  fabric: string
  care: string
  editorial: string
  isNew: boolean
  sortOrder: number | null
}

/* ------------------------------------------------------------------ */
/* Env guard (step 1)                                                  */
/* ------------------------------------------------------------------ */

function loadEnv(): void {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch (error) {
    console.error(`[seed] Could not load .env at ${ENV_FILE}: ${String(error)}`)
    console.error('[seed] Copy .env.example to .env and fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  const url = process.env.VITE_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || url.trim() === '') {
    console.error('[seed] Missing VITE_SUPABASE_URL in .env. Refusing to run.')
    process.exit(1)
  }
  if (!serviceRole || serviceRole.trim() === '') {
    console.error('[seed] Missing SUPABASE_SERVICE_ROLE_KEY in .env (never VITE_-prefixed; it must not reach the bundle). Refusing to run.')
    process.exit(1)
  }
}

/* ------------------------------------------------------------------ */
/* JSON helpers (BOM-strip)                                            */
/* ------------------------------------------------------------------ */

function readText(file: string): string {
  const text = readFileSync(file, 'utf8')
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/* ------------------------------------------------------------------ */
/* Parser — reimplemented verbatim from the retired catalog parser     */
/* ------------------------------------------------------------------ */

/**
 * Returns a list from a JSON value that is either a root array or an object
 * with the given key (the shape Decap CMS writes for file collections).
 */
function listFromJson(raw: unknown, key: string, label: string): unknown[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>)[key])
      ? ((raw as Record<string, unknown>)[key] as unknown[])
      : null
  if (list === null) {
    throw new Error(`[seed] Content of ${label} must be a JSON list or an object with the key "${key}".`)
  }
  return list
}

function requiredString(product: Record<string, unknown>, key: string, file: string): string {
  const value = product[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[seed] "${file}": field "${key}" is required and must be non-empty text.`)
  }
  return value
}

/**
 * Normalizes an image entry. Accepts a `src` string or an object `{ src }` in
 * gallery entries (both shapes appear in content/), trims everything, and
 * drops empty entries. `label` falls back to the provided default.
 */
function parseImage(where: string, raw: unknown, fallbackLabel: string): ProductImageSource {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`[seed] ${where} expects an image object.`)
  }
  const image = raw as Record<string, unknown>
  const src = typeof image.src === 'string' && image.src.trim() !== '' ? image.src : undefined
  const gallery = Array.isArray(image.gallery)
    ? image.gallery
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (typeof item === 'object' && item !== null) {
            const inner = (item as Record<string, unknown>).src
            return typeof inner === 'string' ? inner.trim() : ''
          }
          return ''
        })
        .filter((item) => item !== '')
    : undefined
  const label = typeof image.label === 'string' && image.label.trim() !== '' ? image.label : fallbackLabel
  const parsed: ProductImageSource = { label }
  if (typeof src === 'string') parsed.src = src
  if (Array.isArray(gallery) && gallery.length > 0) parsed.gallery = gallery
  return parsed
}

function parseColor(file: string, raw: unknown, index: number): ProductColorSource {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`[seed] "${file}": color variant #${index + 1} must be an object.`)
  }
  const color = raw as Record<string, unknown>
  const name = typeof color.name === 'string' ? color.name : ''
  const hex = typeof color.hex === 'string' ? color.hex : ''
  if (name.trim() === '' || hex.trim() === '') {
    throw new Error(`[seed] "${file}": every color variant needs non-empty "name" and "hex".`)
  }
  const parsed: ProductColorSource = { name, hex }
  if (color.image != null) {
    parsed.image = parseImage(`"${file}" (color "${name}")`, color.image, name)
  }
  return parsed
}

/**
 * Parses one content/products/*.json file into a catalog product.
 * `featuredImage` / `addedAt` are intentionally never read (dead fields).
 */
function parseProductFile(file: string, rawContent: unknown): ParsedProduct {
  if (typeof rawContent !== 'object' || rawContent === null || Array.isArray(rawContent)) {
    throw new Error(`[seed] "${file}": content must be a JSON object with one product.`)
  }
  const product = rawContent as Record<string, unknown>

  const id = requiredString(product, 'id', file)
  const name = requiredString(product, 'name', file)
  const category = requiredString(product, 'category', file)
  if (!CANONICAL_CATEGORIES.includes(category as CanonicalCategory)) {
    throw new Error(`[seed] "${file}": category "${category}" is not one of the canonical categories.`)
  }

  const priceCOP = product.priceCOP
  if (typeof priceCOP !== 'number' || !Number.isInteger(priceCOP) || priceCOP < 0) {
    throw new Error(`[seed] "${file}": priceCOP must be an integer in Colombian pesos, no decimals.`)
  }

  const rawColors = product.colors
  if (!Array.isArray(rawColors) || rawColors.length === 0) {
    throw new Error(`[seed] "${file}": colors must be a non-empty list of color variants.`)
  }
  const colors = rawColors.map((color, index) => parseColor(file, color, index))

  let sizes: string[]
  if (category === 'Accesorios') {
    sizes = ['Único']
  } else {
    const rawSizes = product.sizes
    if (!Array.isArray(rawSizes)) {
      throw new Error(`[seed] "${file}": sizes must be a list of sizes.`)
    }
    sizes = rawSizes.map((size) => (typeof size === 'string' ? size.trim() : '')).filter((s) => s !== '')
    if (sizes.length === 0) {
      throw new Error(`[seed] "${file}": sizes cannot end up empty.`)
    }
  }

  return {
    id,
    name,
    category: category as CanonicalCategory,
    priceCOP,
    colors,
    sizes,
    fabric: requiredString(product, 'fabric', file),
    care: requiredString(product, 'care', file),
    editorial: requiredString(product, 'editorial', file),
    isNew: product.isNew === true,
    sortOrder:
      typeof product.sortOrder === 'number' && Number.isFinite(product.sortOrder) ? product.sortOrder : null,
  }
}

function readCategories(): CanonicalCategory[] {
  const raw = JSON.parse(readText(path.join(CONTENT_DIR, 'categories.json'))) as unknown
  const list = listFromJson(raw, 'categories', 'content/categories.json')
  const categories = list.map((category, index) => {
    if (typeof category !== 'string' || category.trim() === '') {
      throw new Error(`[seed] Category #${index + 1} of content/categories.json must be non-empty text.`)
    }
    return category.trim()
  })
  const seen = new Set<string>()
  for (const category of categories) {
    if (seen.has(category)) {
      throw new Error(`[seed] content/categories.json repeats category "${category}".`)
    }
    seen.add(category)
  }
  // Exact match against the canonical tuple (order AND set).
  if (
    categories.length !== CANONICAL_CATEGORIES.length ||
    categories.some((category, i) => category !== CANONICAL_CATEGORIES[i])
  ) {
    throw new Error(
      `[seed] content/categories.json does not match the canonical tuple.\n` +
        `  file:    ${JSON.stringify(categories)}\n` +
        `  tuple:   ${JSON.stringify([...CANONICAL_CATEGORIES])}`,
    )
  }
  return categories as CanonicalCategory[]
}

/* ------------------------------------------------------------------ */
/* Storage uploads (steps 5–6)                                         */
/* ------------------------------------------------------------------ */

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

function isRemoteUrl(ref: string): boolean {
  return /^(https?:)?\/\//.test(ref)
}

/**
 * Uploads one local image ref (`/imagenes/<file>` or `imagenes/<file>`) to
 * bucket `productos` at `<product-id>/<filename>`, returning the absolute
 * public storage URL. Remote URLs are returned verbatim (never re-uploaded).
 */
async function uploadRef(
  supabase: SupabaseClient,
  supabaseUrl: string,
  productId: string,
  ref: string,
  uploadedFiles: string[],
): Promise<string> {
  if (isRemoteUrl(ref)) return ref
  const fileName = path.basename(ref)
  if (!fileName) {
    throw new Error(`[seed] "${productId}": cannot resolve a local file from ref "${ref}".`)
  }
  const localFile = path.join(IMAGES_DIR, fileName)
  if (!existsSync(localFile)) {
    throw new Error(`[seed] "${productId}": image file not found at "${localFile}" (ref "${ref}").`)
  }
  const buffer = readFileSync(localFile)
  const contentType = EXT_TO_MIME[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream'
  const storagePath = `${productId}/${fileName}`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) {
    throw new Error(`[seed] "${productId}": storage upload failed for "${storagePath}": ${error.message}`)
  }
  uploadedFiles.push(storagePath)
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`
}

/**
 * Rewrites color image refs into absolute public storage URLs, mirroring the
 * ProductColor[] shape exactly (label always present; src/gallery only when
 * they exist).
 */
async function buildColorsPayload(
  supabase: SupabaseClient,
  supabaseUrl: string,
  product: ParsedProduct,
  uploadedFiles: string[],
): Promise<Array<Record<string, unknown>>> {
  const colors: Array<Record<string, unknown>> = []
  for (const color of product.colors) {
    const payload: Record<string, unknown> = { name: color.name, hex: color.hex }
    if (color.image) {
      const image: Record<string, unknown> = { label: color.image.label }
      if (color.image.src !== undefined) {
        image.src = await uploadRef(supabase, supabaseUrl, product.id, color.image.src, uploadedFiles)
      }
      if (color.image.gallery !== undefined && color.image.gallery.length > 0) {
        const gallery: string[] = []
        for (const ref of color.image.gallery) {
          gallery.push(await uploadRef(supabase, supabaseUrl, product.id, ref, uploadedFiles))
        }
        image.gallery = gallery
      }
      payload.image = image
    }
    colors.push(payload)
  }
  return colors
}

/* ------------------------------------------------------------------ */
/* DB validation + upserts (steps 7–8)                                 */
/* ------------------------------------------------------------------ */

/**
 * Validates the live DB categories against the canonical tuple BEFORE any
 * write. Zero rows (fresh project) is fine; otherwise the order + set must
 * match exactly or the seed fails loudly without writing.
 */
async function validateDbCategories(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.from('categories').select('name').order('sort_order', { ascending: true })
  if (error) {
    throw new Error(`[seed] Could not read DB categories: ${error.message}`)
  }
  const names = (data ?? []).map((row) => row.name)
  if (names.length === 0) return // fresh project — nothing to compare yet
  const tuple = [...CANONICAL_CATEGORIES]
  const matches = names.length === tuple.length && names.every((name, i) => name === tuple[i])
  if (!matches) {
    throw new Error(
      `[seed] DB categories differ from the canonical tuple (order + set); refusing to write.\n` +
        `  DB:    ${JSON.stringify(names)}\n` +
        `  tuple: ${JSON.stringify(tuple)}`,
    )
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  loadEnv()
  const supabaseUrl = (process.env.VITE_SUPABASE_URL as string).replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  // step 3: assert content vs canonical tuple — the call itself fails loudly
  readCategories()
  const categoryRows = [...CANONICAL_CATEGORIES].map((name, index) => ({ name, sort_order: index }))

  const productFiles = readdirSync(PRODUCTS_DIR).filter((file) => file.endsWith('.json')).sort()
  if (productFiles.length === 0) {
    throw new Error('[seed] No files in content/products/.')
  }
  const products = productFiles.map((file) => {
    const raw = JSON.parse(readText(path.join(PRODUCTS_DIR, file))) as unknown
    return parseProductFile(file, raw)
  })

  // Uploads happen BEFORE any DB write: a missing file aborts the seed.
  const uploadedFiles: string[] = []
  const productRows: Array<Record<string, unknown>> = []
  for (const product of products) {
    const colors = await buildColorsPayload(supabase, supabaseUrl, product, uploadedFiles)
    productRows.push({
      id: product.id,
      name: product.name,
      category: product.category,
      price_cop: product.priceCOP,
      sizes: product.sizes,
      fabric: product.fabric,
      care: product.care,
      editorial: product.editorial,
      is_new: product.isNew,
      sort_order: product.sortOrder,
      colors,
    })
  }

  await validateDbCategories(supabase) // step 7: fail loudly before any write

  const { error: categoriesError } = await supabase.from('categories').upsert(categoryRows, {
    onConflict: 'name',
  })
  if (categoriesError) {
    throw new Error(`[seed] Categories upsert failed: ${categoriesError.message}`)
  }

  // created_at/updated_at are not part of the payload: DB defaults apply on
  // insert and are preserved on conflict (idempotent re-runs).
  const { error: productsError } = await supabase.from('products').upsert(productRows, { onConflict: 'id' })
  if (productsError) {
    throw new Error(`[seed] Products upsert failed: ${productsError.message}`)
  }

  console.log(`[seed] Categories: ${categoryRows.length} upserted (canonical tuple: ${CANONICAL_CATEGORIES.join(', ')}).`)
  console.log(`[seed] Products: ${productRows.length} upserted — ids: ${productRows.map((row) => row.id).join(', ')}.`)
  console.log(`[seed] Images uploaded: ${uploadedFiles.length}`)
  for (const file of uploadedFiles) {
    console.log(`  productos/${file}`)
  }
  console.log('[seed] Done. Re-running is idempotent (same ids, sortOrder and URLs).')
}

main().catch((error: unknown) => {
  console.error(`[seed] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})