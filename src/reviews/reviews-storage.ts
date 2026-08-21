/**
 * ANV·BAR — Persistencia de reviews en localStorage.
 *
 * Módulo deliberadamente SIN dependencias de React para poder verificarse
 * fuera del navegador (harness node). Las reviews se guardan SOLO en el
 * dispositivo (el sitio es 100% estático, sin backend ni cuentas).
 *
 * Contrato de datos: cada review es una entrada del tipo ProductReview.
 * loadReviews devuelve únicamente entradas válidas (las corruptas se
 * descartan, nunca rompen la lectura).
 */

export const REVIEWS_STORAGE_KEY = 'anv-bar:reviews'

/** Review de producto guardada en el dispositivo (persistencia local). */
export type ProductReview = {
  /** Identificador único de la review. */
  id: string
  /** ID del producto al que pertenece la review. */
  productId: string
  /** Calificación de 1 a 5 estrellas. */
  rating: number
  /** Nombre o ciudad de quien escribe (opcional). */
  author?: string
  /** Comentario en texto libre. */
  comment: string
  /** Fecha ISO 8601 de publicación. */
  createdAt: string
}

/**
 * Resuelve el storage del navegador. Devuelve null cuando no existe
 * (render en node/SSR) o está bloqueado (modo privado): el sitio sigue
 * funcionando en memoria, sin persistencia y sin fallar.
 */
function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** Valida que un valor parseado sea una ProductReview completa y razonable. */
function isValidReview(value: unknown): value is ProductReview {
  if (typeof value !== 'object' || value === null) return false
  const review = value as Record<string, unknown>
  return (
    typeof review.id === 'string' &&
    review.id.length > 0 &&
    typeof review.productId === 'string' &&
    review.productId.length > 0 &&
    typeof review.rating === 'number' &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    (review.author === undefined || typeof review.author === 'string') &&
    typeof review.comment === 'string' &&
    review.comment.trim().length > 0 &&
    typeof review.createdAt === 'string' &&
    review.createdAt.length > 0
  )
}

/**
 * Carga las reviews guardadas. Datos ausentes o corruptos producen una
 * lista vacía, nunca un error; las entradas inválidas se descartan.
 */
export function loadReviews(storage: Storage | null = defaultStorage()): ProductReview[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(REVIEWS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidReview)
  } catch {
    return []
  }
}

/**
 * Guarda la lista completa de reviews como JSON. Sin storage disponible se
 * convierte en no-op silencioso (la review queda solo en la sesión actual).
 */
export function saveReviews(
  reviews: ProductReview[],
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews))
  } catch {
    // Cuota excedida o storage bloqueado: no romper la experiencia.
  }
}

/**
 * Agrega una review al inicio de la lista persistida y devuelve la lista
 * actualizada (útil para reflejarla en la UI sin recargar).
 */
export function addReview(
  review: ProductReview,
  storage: Storage | null = defaultStorage(),
): ProductReview[] {
  const next = [review, ...loadReviews(storage)]
  saveReviews(next, storage)
  return next
}
