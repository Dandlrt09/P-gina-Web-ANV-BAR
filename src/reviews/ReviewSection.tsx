import { useMemo, useState } from 'react'
import { type Product } from '../catalog/catalog'
import { loadReviews, type ProductReview } from './reviews-storage'
import { ReviewWizard } from './ReviewWizard'

const MAX_RATING = 5

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
 * Sección "Reviews" de la ficha de producto: lista las reviews guardadas en
 * el dispositivo para este producto (ordenadas por fecha, más reciente
 * primero), muestra un estado vacío amigable y el wizard de 2 pasos para
 * escribir una nueva.
 */
export function ReviewSection({ product }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    loadReviews().filter((review) => review.productId === product.id),
  )

  const sorted = useMemo(
    () => [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  const handlePublished = (review: ProductReview) => {
    setReviews((current) => [review, ...current])
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
          Opiniones reales de quienes ya vistieron la pieza. Las reviews se guardan en tu
          dispositivo y quedan visibles al volver a esta página.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        <div>
          {sorted.length === 0 ? (
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
                    {review.author?.trim() || 'Clienta ANV·BAR'}
                  </p>
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
