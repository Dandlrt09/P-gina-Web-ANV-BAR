import { useState, type FormEvent } from 'react'
import { addReview, type ProductReview } from '../lib/reviews-storage'

/**
 * Texto de Términos y Condiciones de las reviews. Texto corto en español
 * neutro, honesto con la realidad de la web (100% estática): las reviews
 * se guardan solo en el dispositivo de la persona que las escribe.
 * Constante exportada para que el cliente la revise fácilmente.
 */
export const REVIEW_TERMS =
  'Al publicar tu review confirmas que la reseña se muestra públicamente en la ficha de este ' +
  'producto y que refleja tu experiencia personal con la pieza. En esta versión del sitio, las ' +
  'reviews se guardan solo en tu dispositivo (navegador) y no se envían a ANV·BAR: volverán a ' +
  'aparecer cuando vuelvas a visitar esta página. ANV·BAR se reserva el derecho de moderar o ' +
  'retirar contenidos ofensivos o ajenos a la experiencia de compra.'

const MIN_COMMENT_LENGTH = 10

const RATING_PHRASES: Record<number, string> = {
  1: 'No fue para mí',
  2: 'Le falta algo',
  3: 'Está bien',
  4: 'Me gustó mucho',
  5: 'Me encantó',
}

type ReviewWizardProps = {
  productId: string
  /** Recibe la review ya publicada para que la lista la refleje al instante. */
  onPublished: (review: ProductReview) => void
}

/** Genera un ID único con respaldo para entornos sin crypto.randomUUID. */
function makeReviewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Wizard de review en dos pasos:
 *  1. Selección de estrellas (1-5) con una frase por nivel.
 *  2. Comentario + nombre/ciudad opcional + Términos y Condiciones + botón
 *     de publicación.
 * Al publicar guarda la review vía addReview (localStorage), muestra un
 * estado de agradecimiento y deja listo el wizard para otra review.
 */
export function ReviewWizard({ productId, onPublished }: ReviewWizardProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [author, setAuthor] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [published, setPublished] = useState(false)

  const commentOk = comment.trim().length >= MIN_COMMENT_LENGTH
  const canContinue = rating !== null
  const canPublish = accepted && commentOk

  const reset = () => {
    setStep(1)
    setRating(null)
    setComment('')
    setAuthor('')
    setAccepted(false)
    setPublished(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canPublish || rating === null) return
    const review: ProductReview = {
      id: makeReviewId(),
      productId,
      rating,
      author: author.trim() || undefined,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    }
    addReview(review)
    onPublished(review)
    setPublished(true)
  }

  if (published) {
    return (
      <div className="rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
        <p className="text-2xl" aria-hidden="true">
          ★
        </p>
        <h3 className="mt-3 font-display text-xl font-medium text-brand-deep">
          ¡Gracias por tu review!
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          Tu opinión ya aparece en la lista y queda guardada en este dispositivo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
        >
          Escribir otra review
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
        ✦ Deja tu opinión
      </p>
      <h3 className="mt-2 font-display text-2xl font-medium text-brand-deep">
        ¿Cómo te quedó?
      </h3>

      {step === 1 ? (
        <div className="mt-6">
          <fieldset>
            <legend className="sr-only">Calificación de 1 a 5 estrellas</legend>
            <div className="flex flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} de 5 estrellas`}
                  aria-pressed={rating === value}
                  className="grid size-11 place-items-center rounded-full transition-colors hover:bg-brand-primary/5 motion-reduce:transition-none"
                >
                  <span
                    aria-hidden="true"
                    className={`text-2xl leading-none ${
                      rating !== null && value <= rating
                        ? 'text-brand-primary'
                        : 'text-brand-primary/25'
                    }`}
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink/70">
              {rating !== null
                ? `${rating} de 5 — ${RATING_PHRASES[rating]}`
                : 'Toca las estrellas para calificar'}
            </p>
          </fieldset>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canContinue}
            className="mt-6 w-full rounded-full bg-brand-primary py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-primary"
          >
            Continuar
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="review-comment" className="text-sm font-medium text-brand-deep">
              Tu experiencia
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              maxLength={600}
              placeholder="Cuéntanos cómo te quedó, qué tal la tela, el ajuste, la entrega..."
              className="mt-2 w-full rounded-xl border border-brand-primary/20 bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-primary"
            />
            <p className="mt-1 text-xs text-ink/60">
              {commentOk
                ? `${comment.trim().length} caracteres`
                : `Mínimo ${MIN_COMMENT_LENGTH} caracteres`}
            </p>
          </div>

          <div>
            <label htmlFor="review-author" className="text-sm font-medium text-brand-deep">
              Nombre o ciudad <span className="font-normal text-ink/60">(opcional)</span>
            </label>
            <input
              id="review-author"
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={60}
              placeholder="Tu nombre o tu ciudad"
              className="mt-2 w-full rounded-xl border border-brand-primary/20 bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm leading-relaxed text-ink/80">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-brand-primary"
              />
              <span>Acepto los términos de la review.</span>
            </label>
            <p className="mt-2 rounded-lg border border-brand-primary/15 bg-surface/70 p-3 text-xs leading-relaxed text-ink/70">
              {REVIEW_TERMS}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex justify-center rounded-full border border-brand-primary/40 px-6 py-3 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={!canPublish}
              className="inline-flex justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-primary"
            >
              Publicar review
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
