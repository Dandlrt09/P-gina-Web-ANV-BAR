import { useState, type FormEvent } from 'react'
import { REVIEW_BOUNDS, submitReview, type ProductReview } from './productReviews'

const RATING_PHRASES: Record<number, string> = {
  1: 'No fue para mí',
  2: 'Le falta algo',
  3: 'Está bien',
  4: 'Me gustó mucho',
  5: 'Me encantó',
}

type ReviewWizardProps = {
  productId: string
  /** Recibe la fila que Supabase devolvió para que la lista la refleje al instante. */
  onPublished: (review: ProductReview) => void
}

/**
 * Wizard de review en dos pasos:
 *  1. Selección de estrellas (1-5) con una frase por nivel.
 *  2. Comentario + nombre/ciudad opcional + aviso de publicación pública + botón
 *     de publicación.
 * Al publicar inserta la review en Supabase vía submitReview: el estado de
 * agradecimiento llega solo cuando la base devuelve la fila insertada. La
 * validación local replica exactamente los CHECKs de product_reviews
 * (REVIEW_BOUNDS): con datos inválidos no se envía ninguna petición. Si el
 * envío falla se conservan los valores escritos y se muestra un error inline.
 */
export function ReviewWizard({ productId, onPublished }: ReviewWizardProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [author, setAuthor] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [published, setPublished] = useState(false)
  /** true mientras la inserción está en vuelo (evita dobles envíos). */
  const [submitting, setSubmitting] = useState(false)
  /** Error de validación o de envío; null cuando no hay nada que reportar. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const commentOk =
    comment.trim().length >= REVIEW_BOUNDS.minComment &&
    comment.trim().length <= REVIEW_BOUNDS.maxComment
  const canContinue = rating !== null
  const canPublish = accepted && commentOk

  const reset = () => {
    setStep(1)
    setRating(null)
    setComment('')
    setAuthor('')
    setAccepted(false)
    setPublished(false)
    setSubmitError(null)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return

    // Validación cliente espejo de los CHECKs de la tabla: con datos
    // inválidos no sale ninguna petición del navegador.
    if (rating === null || rating < 1 || rating > 5) {
      setSubmitError('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }
    const trimmedComment = comment.trim()
    if (trimmedComment.length < REVIEW_BOUNDS.minComment) {
      setSubmitError(`Tu comentario debe tener al menos ${REVIEW_BOUNDS.minComment} caracteres.`)
      return
    }
    if (trimmedComment.length > REVIEW_BOUNDS.maxComment) {
      setSubmitError(`Tu comentario no puede superar ${REVIEW_BOUNDS.maxComment} caracteres.`)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    // La fila devuelta por Supabase ES la confirmación: hasta entonces no hay
    // éxito ni entrada publicada en la lista.
    submitReview({
      productId,
      rating,
      comment: trimmedComment,
      author: author.trim() || null,
    })
      .then((review) => {
        onPublished(review)
        setPublished(true)
      })
      .catch((error: unknown) => {
        // Fallo de red o de RLS: la fila no existe, así que se conservan los
        // valores escritos para reintentar sin perder lo tecleado.
        setSubmitError(
          error instanceof Error && error.message
            ? `No pudimos publicar tu review: ${error.message}`
            : 'No pudimos publicar tu review. Revisa tu conexión e inténtalo de nuevo.',
        )
      })
      .finally(() => setSubmitting(false))
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
          Tu opinión ya aparece en la lista y quedó publicada en la tienda.
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
              maxLength={REVIEW_BOUNDS.maxComment}
              placeholder="Cuéntanos cómo te quedó, qué tal la tela, el ajuste, la entrega..."
              className="mt-2 w-full rounded-xl border border-brand-primary/20 bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-primary"
            />
            <p className="mt-1 text-xs text-ink/60">
              {commentOk
                ? `${comment.trim().length} caracteres`
                : `Mínimo ${REVIEW_BOUNDS.minComment} caracteres`}
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
              maxLength={REVIEW_BOUNDS.maxAuthor}
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
              <span>
                Solo te contactaremos sobre tu review si es necesario. Al enviarla, tu comentario
                se publica de forma pública junto con el nombre o ciudad que indiques (opcional).
              </span>
            </label>
          </div>

          {submitError !== null && (
            <p role="alert" className="text-sm font-medium text-brand-deep">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="inline-flex justify-center rounded-full border border-brand-primary/40 px-6 py-3 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand-primary"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={!canPublish || submitting}
              className="inline-flex justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-primary"
            >
              {submitting ? 'Publicando…' : 'Publicar review'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
