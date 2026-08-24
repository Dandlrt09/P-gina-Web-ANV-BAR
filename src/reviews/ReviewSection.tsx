import { useEffect, useMemo, useState } from 'react'
import { type Product } from '../catalog/catalog'
import { listProductReviews, type ProductReview } from './productReviews'
import { supabase } from '../shared/supabase'
import { ReviewWizard } from './ReviewWizard'

const MAX_RATING = 5

/**
 * Review que la lista recibe al publicarse. Hoy llega con la forma local del
 * wizard; cuando el wizard inserte en Supabase llegará la fila devuelta por
 * la base. Ambas formas satisfacen este contrato estructural.
 */
type PublishedReview = Pick<ProductReview, 'id' | 'rating' | 'comment' | 'createdAt'> & {
  author?: string | null
}

/** Renderiza la calificación de una review como estrellas ★/☆. */
function StarRating({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} de ${MAX_RATING} estrellas`}
      className="inline-flex gap-0.5 text-sm text-brand-primary"
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

/** Formatea una fecha ISO a "17 de agosto de 2026" (es-CO). */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

type ReviewSectionProps = {
  product: Product
}

/**
 * Sección "Reviews" de la ficha de producto: lee las reviews desde Supabase
 * (más reciente primero), se suscribe al canal realtime del producto para
 * reflejar inserciones, borrados y respuestas del admin sin recargar, y
 * muestra el wizard para escribir una nueva.
 */
export function ReviewSection({ product }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  /** Cambiarlo fuerza la relectura inicial (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let alive = true
    setIsLoading(true)

    // Relectura autoritativa: al montar y ante cualquier evento realtime.
    // Los payloads DELETE no traen la fila vieja sin REPLICA IDENTITY FULL y
    // los UPDATE traen la respuesta del admin, así que refrescar cubre
    // INSERT/UPDATE/DELETE con una sola ruta.
    const refresh = () => {
      listProductReviews(product.id)
        .then((rows) => {
          if (!alive) return
          setReviews(rows)
          setFailed(false)
        })
        .catch(() => {
          if (alive) setFailed(true)
        })
        .finally(() => {
          if (alive) setIsLoading(false)
        })
    }

    refresh()

    // Canal por producto: filtrado por product_id y desmontado en el cleanup,
    // sin listeners huérfanos al salir de la ficha.
    const channel = supabase
      .channel(`product-reviews-${product.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: `product_id=eq.${product.id}`,
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.warn('[reviews] realtime channel error')
      })

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [product.id, reloadToken])

  // La lectura ya llega ordenada (created_at DESC, id DESC); se reordena aquí
  // solo como defensa para que la publicación optimista respete el contrato.
  const sorted = useMemo(
    () =>
      [...reviews].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      ),
    [reviews],
  )

  /**
   * Publicación optimista: antepone la review y deduplica por id contra lo ya
   * listado; la próxima relectura realtime sigue siendo la autoridad.
   */
  const handlePublished = (review: PublishedReview) => {
    setReviews((current) => [
      { ...review, productId: product.id, author: review.author ?? null, adminResponse: null },
      ...current.filter((existing) => existing.id !== review.id),
    ])
  }

  const retry = () => {
    setFailed(false)
    setReloadToken((token) => token + 1)
  }

  return (
    <section
      aria-labelledby="reviews-title"
      className="mt-16 border-t border-brand-primary/15 pt-10 sm:mt-20 sm:pt-12"
    >
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          ✦ Tu opinión importa
        </p>
        <h2
          id="reviews-title"
          className="mt-3 font-display text-3xl font-medium text-brand-deep sm:text-4xl"
        >
          Reviews
        </h2>
        <p className="mt-3 text-ink/80">
          Opiniones reales de quienes ya vistieron la pieza. Se publican al instante y quedan
          visibles para todas las visitas.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        <div>
          {failed ? (
            <div className="rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
              <p className="text-2xl" aria-hidden="true">
                !
              </p>
              <h3 className="mt-3 font-display text-xl font-medium text-brand-deep">
                No pudimos cargar las reviews
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                Revisa tu conexión e inténtalo de nuevo en un momento.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 inline-flex rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
              >
                Reintentar
              </button>
            </div>
          ) : isLoading ? (
            <p className="text-sm text-ink/60" role="status">
              Cargando reviews…
            </p>
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
              <p className="text-2xl" aria-hidden="true">
                ★
              </p>
              <h3 className="mt-3 font-display text-xl font-medium text-brand-deep">
                Aún no hay reviews
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                Sé la primera en opinar: cuéntanos cómo te quedó esta pieza.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {sorted.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-brand-primary/15 bg-white/60 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating rating={review.rating} />
                    <time className="text-xs text-ink/60">{formatDate(review.createdAt)}</time>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink/85">{review.comment}</p>
                  <p className="mt-3 text-xs font-medium text-brand-deep">
                    {review.author?.trim() || 'Anónimo'}
                  </p>
                  {review.adminResponse !== null && (
                    <div className="mt-4 rounded-lg border-l-2 border-brand-primary bg-brand-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
                        ANV·BAR respondió
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink/85">
                        {review.adminResponse}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ReviewWizard productId={product.id} onPublished={handlePublished} />
      </div>
    </section>
  )
}
