import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  REVIEW_BOUNDS,
  deleteReview,
  listAllReviews,
  saveAdminResponse,
  type ProductReview,
} from '../reviews/productReviews'
import { PRODUCTS } from '../catalog/catalog'

const inputClass =
  'w-full rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary'
const MAX_RATING = 5

/**
 * Nombre de venta del producto dueño de la review, resuelto contra el singleton
 * PRODUCTS (el gate del catálogo garantiza que ya está lleno antes de montar
 * cualquier ruta admin). Si el producto ya no existe en el catálogo, cae al id
 * crudo para que la fila siga siendo moderable.
 */
function productName(productId: string): string {
  return PRODUCTS.find((product) => product.id === productId)?.name ?? productId
}

/** Formatea una fecha ISO a "17 de agosto de 2026" (es-CO), igual que la tienda. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Calificación compacta como estrellas ★/☆ para escanear la lista de un vistazo. */
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

type ResponseEditorProps = {
  review: ProductReview
  saving: boolean
  onSave: (response: string) => void
}

/**
 * Editor en línea de la respuesta del admin para una review. Llega precargado
 * con la respuesta vigente (vacío si aún no hay); guarda solo texto con
 * contenido y respeta el tope de admin_response en la base, que comparte los
 * 1000 caracteres con maxComment.
 */
function ResponseEditor({ review, saving, onSave }: ResponseEditorProps) {
  const [draft, setDraft] = useState(review.adminResponse ?? '')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const response = draft.trim()
    if (saving || response === '') return
    onSave(response)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
        Respuesta de ANV·BAR
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={REVIEW_BOUNDS.maxComment}
          placeholder="Escriba la respuesta pública…"
          className={`${inputClass} resize-y`}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-ink/60">
          Se muestra públicamente como “ANV·BAR respondió” · máx. {REVIEW_BOUNDS.maxComment}{' '}
          caracteres
        </p>
        <button
          type="submit"
          disabled={saving || draft.trim() === ''}
          className="shrink-0 rounded-full bg-brand-primary px-5 py-1.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar respuesta'}
        </button>
      </div>
    </form>
  )
}

/**
 * Panel “Comentarios” (ruta #/admin/comentarios): moderación reactiva de las
 * reviews de producto. Lista TODAS las reviews de todos los productos, más
 * reciente primero; permite responder en nombre de ANV·BAR y eliminar filas
 * definitivamente. Toda mutación la autoriza el servidor vía las políticas
 * is_admin() sobre product_reviews; los errores se muestran en línea sin
 * perder la fila afectada ni el texto escrito.
 */
export function ReviewsManager() {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setReviews(await listAllReviews())
    } catch (error) {
      setReviews(null)
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Transient success feedback: the note fades after a moment.
  useEffect(() => {
    if (!savedNote) return
    const timer = window.setTimeout(() => setSavedNote(null), 4000)
    return () => window.clearTimeout(timer)
  }, [savedNote])

  const handleSaveResponse = async (review: ProductReview, response: string) => {
    if (respondingId !== null || deletingId !== null) return
    setActionError(null)
    setSavedNote(null)
    setRespondingId(review.id)
    try {
      await saveAdminResponse(review.id, response)
      // Relectura autoritativa: confirma lo realmente persistido en la base.
      await load()
      setSavedNote('Respuesta guardada.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setRespondingId(null)
    }
  }

  const handleDelete = async (review: ProductReview) => {
    if (deletingId !== null || respondingId !== null) return
    const who = review.author?.trim() || 'Anónimo'
    if (
      !window.confirm(
        `¿Eliminar la review de "${who}" en ${productName(review.productId)}? Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }
    setActionError(null)
    setSavedNote(null)
    setDeletingId(review.id)
    try {
      await deleteReview(review.id)
      // Borrado local optimista: la tienda la retira por realtime.
      setReviews((prev) => (prev ?? []).filter((item) => item.id !== review.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">
            Comentarios
          </h1>
          <p className="mt-2 text-ink/80">
            Modere las reviews de la tienda: responda en nombre de ANV·BAR o elimine las que no
            deban permanecer publicadas.
          </p>
        </div>

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5">
            <p className="font-medium text-brand-deep">No pudimos cargar las reviews</p>
            <p className="mt-1 text-sm text-ink/80">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-full border border-brand-primary/40 px-6 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loadError && reviews === null && (
          <div role="status" className="mt-10 flex justify-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando comentarios…</span>
          </div>
        )}

        {savedNote && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-brand-primary/20 bg-white/60 p-5 text-sm font-medium text-brand-deep"
          >
            {savedNote}
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5 text-sm text-brand-deep">
            <p className="font-medium">No se pudo guardar el cambio</p>
            <p className="mt-1 text-ink/80">{actionError}</p>
          </div>
        )}

        {!loadError && reviews !== null && reviews.length === 0 && (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p aria-hidden="true" className="text-2xl">
              ★
            </p>
            <p className="font-display text-lg text-brand-deep">Aún no hay reviews</p>
            <p className="mt-1 text-sm text-ink/80">
              Cuando las clientas opinen desde la ficha de un producto, aparecerán aquí.
            </p>
          </div>
        )}

        {reviews !== null && reviews.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-brand-primary/15 bg-white/60 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-lg leading-snug text-brand-deep">
                      {productName(review.productId)}
                    </h2>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink/60">
                      {review.author?.trim() || 'Anónimo'}
                    </span>
                    <StarRating rating={review.rating} />
                  </div>
                  <time className="shrink-0 text-xs text-ink/60">{formatDate(review.createdAt)}</time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">{review.comment}</p>
                <ResponseEditor
                  review={review}
                  saving={respondingId === review.id}
                  onSave={(response) => void handleSaveResponse(review, response)}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleDelete(review)}
                    disabled={deletingId !== null || respondingId !== null}
                    className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === review.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
