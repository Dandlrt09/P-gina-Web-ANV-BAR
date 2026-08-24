/**
 * ANV·BAR — Acceso a datos de reviews de producto en Supabase.
 *
 * Módulo compartido por el storefront (lectura pública e inserción anónima)
 * y el panel admin (moderación reactiva): una sola fuente de verdad para los
 * tipos, los límites de validación y el mapeo snake_case → camelCase.
 *
 * La seguridad la aplica Row Level Security en la base: cualquiera puede leer
 * e insertar (INSERT acotado por los CHECKs de la tabla), mientras que la
 * respuesta del admin y el borrado solo prosperan para roles en la allowlist
 * de administradores (public.is_admin()); para cualquier otro rol RLS los
 * ignora sin error.
 */

import { supabase } from '../shared/supabase'

/** Límites de validación, espejo exacto de los CHECKs de product_reviews. */
export const REVIEW_BOUNDS = {
  minComment: 10,
  maxComment: 1000,
  maxAuthor: 60,
} as const

/** Fila cruda de public.product_reviews (snake_case, tal como la entrega PostgREST). */
export type ProductReviewRow = {
  id: string
  product_id: string
  rating: number
  comment: string
  author: string | null
  admin_response: string | null
  created_at: string
}

/** Review lista para renderizar (camelCase), misma forma para storefront y admin. */
export type ProductReview = {
  id: string
  productId: string
  rating: number
  /** Nombre o ciudad de quien escribe; null se muestra como "Anónimo". */
  author: string | null
  comment: string
  /** Respuesta del equipo ANV·BAR; null hasta que el admin responda. */
  adminResponse: string | null
  createdAt: string
}

/** Mapea una fila de `product_reviews` a `ProductReview` (snake_case → camelCase). */
export function mapReviewRow(row: ProductReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    rating: row.rating,
    author: row.author,
    comment: row.comment,
    adminResponse: row.admin_response,
    createdAt: row.created_at,
  }
}

/**
 * Reviews del producto ordenadas de más reciente a más antigua
 * (`created_at DESC` con `id DESC` como desempate, el mismo criterio del
 * índice de la tabla).
 */
export async function listProductReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapReviewRow(row as ProductReviewRow))
}

/**
 * Inserta la review del visitante y devuelve la fila insertada: recibir la
 * fila ES la prueba de éxito — sin fila no hay confirmación.
 */
export async function submitReview(input: {
  productId: string
  rating: number
  comment: string
  author: string | null
}): Promise<ProductReview> {
  const { data, error } = await supabase
    .from('product_reviews')
    .insert({
      product_id: input.productId,
      rating: input.rating,
      comment: input.comment,
      author: input.author,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapReviewRow(data as ProductReviewRow)
}

/** Guarda o reemplaza la respuesta del admin a una review (RLS: solo allowlist). */
export async function saveAdminResponse(id: string, response: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .update({ admin_response: response })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Borra definitivamente una review (RLS: solo allowlist). */
export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('product_reviews').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
