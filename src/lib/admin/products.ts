import {
  CATEGORIES,
  mapProductRow,
  type Product,
  type ProductColor,
  type ProductRow,
} from '../../data/catalog'
import { supabase } from '../supabase'

/**
 * Capa de productos del admin (slice B).
 *
 * Usa el MISMO cliente anónimo exportado por src/lib/supabase.ts; la seguridad
 * la garantiza RLS server-side (is_admin() en la migración admin), no el
 * cliente. Todos los writes fallan con 0 filas si la sesión no es allowlist.
 *
 * Los colores se guardan con URLs absolutas públicas de storage
 * (`${SUPABASE_URL}/storage/v1/object/public/productos/<id>/<file>`), espejo
 * exacto del ProductColor[]/Product que modela src/data/catalog.ts.
 */

export const STORAGE_BUCKET = 'productos'
export const STORAGE_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** MIME por extensión (default admin: jpg/png/webp/gif; pendiente confirmación del owner). */
const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Payload canónico del formulario admin (camelCase, listo para validar y persistir). */
export type AdminProductInput = {
  id: string
  name: string
  category: Product['category']
  priceCOP: number
  isNew: boolean
  sortOrder: number | null
  editorial: string
  fabric: string
  care: string
  sizes: string[]
  colors: ProductColor[]
}

export type ValidationIssue = { field: string; message: string }

/* ------------------------------------------------------------------ */
/* Validación (CR-PA-02 / SC-PA-04)                                   */
/* ------------------------------------------------------------------ */

/**
 * Valida el payload ANTES de escribir: precio int >= 0, tallas no vacías,
 * color con name+hex (y label si hay imagen), categoría dentro de la lista
 * vigente e id-slug válido en alta. Devuelve la lista de errores; vacía =
 * ok. Un payload inválido jamás toca la base (reject with nothing changed).
 */
export function validateProductInput(input: AdminProductInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const id = input.id.trim()
  if (id === '') {
    issues.push({ field: 'id', message: 'El identificador es obligatorio.' })
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    issues.push({
      field: 'id',
      message: 'El identificador admite solo minúsculas, números y guiones (ej. vestido-marfil).',
    })
  }
  if (input.name.trim() === '') issues.push({ field: 'name', message: 'El nombre es obligatorio.' })
  if (!CATEGORIES.includes(input.category)) {
    issues.push({ field: 'category', message: 'La categoría no está en la lista vigente del catálogo.' })
  }
  if (!Number.isInteger(input.priceCOP) || input.priceCOP < 0) {
    issues.push({ field: 'priceCOP', message: 'El precio debe ser un número entero mayor o igual a 0.' })
  }
  if (input.sizes.length === 0) {
    issues.push({ field: 'sizes', message: 'Agregá al menos una talla.' })
  }
  if (input.colors.length === 0) {
    issues.push({ field: 'colors', message: 'Cada producto necesita al menos una variante de color.' })
  }
  input.colors.forEach((color, index) => {
    if (color.name.trim() === '') {
      issues.push({ field: `colors.${index}.name`, message: `La variante ${index + 1} necesita un nombre.` })
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color.hex.trim())) {
      issues.push({
        field: `colors.${index}.hex`,
        message: `La variante ${index + 1} necesita un color hexadecimal (#rrggbb).`,
      })
    }
    if (color.image && color.image.label.trim() === '') {
      issues.push({
        field: `colors.${index}.image.label`,
        message: `La variante ${index + 1} tiene imagen pero le falta el texto descriptivo (label).`,
      })
    }
  })
  return issues
}

/* ------------------------------------------------------------------ */
/* Persistencia                                                       */
/* ------------------------------------------------------------------ */

function toProductRow(input: AdminProductInput): Partial<ProductRow> {
  return {
    name: input.name.trim(),
    category: input.category,
    price_cop: input.priceCOP,
    is_new: input.isNew,
    sort_order: input.sortOrder,
    editorial: input.editorial.trim(),
    fabric: input.fabric.trim(),
    care: input.care.trim(),
    sizes: [...input.sizes],
    colors: input.colors,
  }
}

export async function listAdminProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('id')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapProductRow(row as ProductRow))
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapProductRow(data as ProductRow)
}

export async function createProduct(input: AdminProductInput): Promise<Product> {
  const row = { ...toProductRow(input), id: input.id.trim() } as Partial<ProductRow> & { id: string }
  const { data, error } = await supabase.from('products').insert(row).select('*').single()
  if (error) throw new Error(error.message)
  return mapProductRow(data as ProductRow)
}

export async function updateProduct(input: AdminProductInput): Promise<Product> {
  const row = toProductRow(input) as Partial<ProductRow>
  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', input.id.trim())
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapProductRow(data as ProductRow)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* ------------------------------------------------------------------ */
/* Storage (`productos` bucket)                                       */
/* ------------------------------------------------------------------ */

/** Normaliza un nombre de archivo para el storage: sin espacios ni caracteres raros. */
export function sanitizeStorageName(fileName: string): string {
  return fileName.replace(/\s+/g, '-').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-')
}

/** Valida el archivo a subir (extensión permitida + límite 5 MB). Null = ok. */
export function validateUploadFile(file: File): string | null {
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
  if (!(ext in EXT_TO_MIME)) return 'Solo se admiten imágenes jpg, png, webp o gif.'
  if (file.size > MAX_UPLOAD_BYTES) return 'La imagen supera el límite de 5 MB.'
  return null
}

export type UploadResult = { path: string; url: string }

/**
 * Sube una imagen al bucket `productos` en `<productId>/<file>` (upsert) y
 * devuelve la URL pública absoluta almacenable en colors.jsonb.
 */
export async function uploadProductImage(productId: string, file: File): Promise<UploadResult> {
  const invalid = validateUploadFile(file)
  if (invalid) throw new Error(invalid)
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
  const name = sanitizeStorageName(`${productId}-${file.name}`)
  const path = `${productId}/${name}`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: EXT_TO_MIME[ext], upsert: true })
  if (error) throw new Error(error.message)
  return { path, url: `${STORAGE_PREFIX}${path}` }
}

/**
 * Limpieza best-effort (SC-PA/CR-PA-03): borra los objetos bajo `<productId>/`
 * derivando su path de las URLs absolutas guardadas en colors. Nunca lanza;
 * un fallo de storage no debe tumbar la eliminación del producto.
 */
export async function deleteProductImages(productId: string, colors: ProductColor[]): Promise<void> {
  const paths = new Set<string>()
  const collect = (image?: ProductColor['image']) => {
    if (!image) return
    for (const ref of [image.src, ...(image.gallery ?? [])]) {
      if (typeof ref === 'string' && ref.startsWith(STORAGE_PREFIX)) {
        paths.add(ref.slice(STORAGE_PREFIX.length))
      }
    }
  }
  colors.forEach((color) => collect(color.image))
  if (paths.size === 0) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([...paths])
  if (error) {
    console.warn(`[admin] Best-effort storage cleanup for "${productId}" failed: ${error.message}`)
  }
}

/**
 * Limpieza de emergencia para subidas huérfanas cuando el write de la base
 * falla después de subir imágenes (un upload ya no tiene dueño). Best-effort.
 */
export async function removeStrayUploads(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  if (error) {
    console.warn(`[admin] Could not remove stray uploads (${paths.length}): ${error.message}`)
  }
}