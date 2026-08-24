import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  TESTIMONIAL_BOUNDS,
  createTestimonial,
  deleteTestimonial,
  listTestimonials,
  updateTestimonial,
  type Testimonial,
} from '../testimonials/testimonials'
import { supabase } from '../shared/supabase'

const inputClass =
  'w-full rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-brand-deep'

/** Formatea una fecha ISO a "17 de agosto de 2026" (es-CO), igual que la tienda. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Borrador editable: solo los campos que la tabla guarda; id y fechas son de la base. */
type TestimonialDraft = { name: string; text: string }

const EMPTY_DRAFT: TestimonialDraft = { name: '', text: '' }

type DraftIssue = { field: 'name' | 'text'; message: string }

/** Espejo de los CHECKs de la tabla ANTES de tocar Supabase; la base es la última autoridad. */
function validateDraft(draft: TestimonialDraft): DraftIssue[] {
  const issues: DraftIssue[] = []
  const name = draft.name.trim()
  const text = draft.text.trim()
  if (name.length < TESTIMONIAL_BOUNDS.minName) {
    issues.push({ field: 'name', message: 'El nombre es obligatorio.' })
  } else if (name.length > TESTIMONIAL_BOUNDS.maxName) {
    issues.push({ field: 'name', message: `El nombre no puede superar ${TESTIMONIAL_BOUNDS.maxName} caracteres.` })
  }
  if (text.length < TESTIMONIAL_BOUNDS.minText) {
    issues.push({ field: 'text', message: 'El texto del testimonio es obligatorio.' })
  } else if (text.length > TESTIMONIAL_BOUNDS.maxText) {
    issues.push({ field: 'text', message: `El texto no puede superar ${TESTIMONIAL_BOUNDS.maxText} caracteres.` })
  }
  return issues
}

type TestimonialEditorProps = {
  heading: string
  initial: TestimonialDraft
  saving: boolean
  submitLabel: string
  onSave: (input: { name: string; text: string }) => Promise<unknown>
  onCancel: () => void
}

/** Formulario en línea de creación/edición: valida antes de la red; los errores del servidor suben al contenedor. */
function TestimonialEditor({
  heading,
  initial,
  saving,
  submitLabel,
  onSave,
  onCancel,
}: TestimonialEditorProps) {
  const [draft, setDraft] = useState<TestimonialDraft>(initial)
  const [issues, setIssues] = useState<DraftIssue[]>([])

  const invalidInput = (field: DraftIssue['field']) =>
    issues.some((issue) => issue.field === field)
      ? 'border-red-400 ring-2 ring-red-400/60 focus:border-red-500'
      : ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const input = { name: draft.name.trim(), text: draft.text.trim() }
    const found = validateDraft(input)
    if (found.length > 0) {
      setIssues(found)
      return
    }
    setIssues([])
    await onSave(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="font-display text-lg text-brand-deep">{heading}</p>
      {issues.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-400/60 bg-white/60 p-5 text-sm text-brand-deep">
          <p className="font-medium">Faltan datos por corregir:</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-ink/80">
            {issues.map((issue) => (
              <li key={issue.field}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      <label className={labelClass}>
        Nombre de la clienta
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ana María"
          maxLength={TESTIMONIAL_BOUNDS.maxName}
          className={`${inputClass} ${invalidInput('name')}`}
        />
      </label>
      <label className={labelClass}>
        Testimonio
        <textarea
          value={draft.text}
          onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
          rows={4}
          maxLength={TESTIMONIAL_BOUNDS.maxText}
          placeholder="Cómo vivió su experiencia con la marca…"
          className={`${inputClass} resize-y ${invalidInput('text')}`}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** Gestor de testimonios (#/admin/testimonios): CRUD con RLS is_admin(); lista created_at desc. */
export function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setTestimonials(await listTestimonials())
    } catch (error) {
      setTestimonials(null)
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime refetch-on-event (estrategia de la tienda y de Comentarios); REPLICA IDENTITY FULL completa los DELETE.
  useEffect(() => {
    const channel = supabase
      .channel('admin-testimonials')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'testimonials' },
        () => void load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  // Transient success feedback: the note fades after a moment.
  useEffect(() => {
    if (!savedNote) return
    const timer = window.setTimeout(() => setSavedNote(null), 4000)
    return () => window.clearTimeout(timer)
  }, [savedNote])

  const beginCreate = () => {
    setEditingId(null)
    setCreating(true)
    setActionError(null)
  }

  const beginEdit = (id: string) => {
    setCreating(false)
    setEditingId(id)
    setActionError(null)
  }

  const closeEditors = () => {
    setCreating(false)
    setEditingId(null)
  }

  const persist = async (action: () => Promise<unknown>) => {
    setSaving(true)
    setActionError(null)
    try {
      await action()
      await load()
      setSavedNote('Cambios guardados.')
      closeEditors()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (testimonial: Testimonial) => {
    if (deletingId !== null || saving) return
    const message = `¿Eliminar el testimonio de "${testimonial.name}"? Esta acción no se puede deshacer.`
    if (!window.confirm(message)) return
    setActionError(null)
    setSavedNote(null)
    setDeletingId(testimonial.id)
    try {
      await deleteTestimonial(testimonial.id)
      // Retiro local optimista: la tienda retira la fila por realtime.
      if (editingId === testimonial.id) setEditingId(null)
      setTestimonials((prev) => (prev ?? []).filter((item) => item.id !== testimonial.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">Testimonios</h1>
            <p className="mt-2 text-ink/80">
              Gestione los testimonios de clientas que se publican en la tienda.
            </p>
          </div>
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            + Añadir testimonio
          </button>
        </div>

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5">
            <p className="font-medium text-brand-deep">No pudimos cargar los testimonios</p>
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

        {!loadError && testimonials === null && (
          <div role="status" className="mt-10 flex justify-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando testimonios…</span>
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

        {!loadError && testimonials !== null && testimonials.length === 0 && !creating && (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-brand-deep">Aún no hay testimonios</p>
            <p className="mt-1 text-sm text-ink/80">
              Cree el primero y aparecerá en la sección de testimonios de la tienda.
            </p>
            <button
              type="button"
              onClick={beginCreate}
              className="mt-6 inline-block rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              + Añadir testimonio
            </button>
          </div>
        )}

        {testimonials !== null && (testimonials.length > 0 || creating) && (
          <ul className="mt-8 flex flex-col gap-3">
            {creating && (
              <li className="rounded-xl border border-brand-primary/15 bg-white/60 p-4 sm:p-5">
                <TestimonialEditor
                  heading="Nuevo testimonio"
                  initial={EMPTY_DRAFT}
                  saving={saving}
                  submitLabel="Crear testimonio"
                  onSave={(input) => persist(() => createTestimonial(input))}
                  onCancel={closeEditors}
                />
              </li>
            )}
            {testimonials.map((testimonial) =>
              editingId === testimonial.id ? (
                <li key={testimonial.id} className="rounded-xl border border-brand-primary/25 bg-white/60 p-4 sm:p-5">
                  <TestimonialEditor
                    heading={`Editar — ${testimonial.name}`}
                    initial={{ name: testimonial.name, text: testimonial.text }}
                    saving={saving}
                    submitLabel="Guardar cambios"
                    onSave={(input) => persist(() => updateTestimonial(testimonial.id, input))}
                    onCancel={closeEditors}
                  />
                </li>
              ) : (
                <li
                  key={testimonial.id}
                  className="flex flex-wrap items-start gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-4 sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg leading-snug text-brand-deep">{testimonial.name}</h2>
                    <time className="mt-0.5 block text-xs text-ink/60">
                      {formatDate(testimonial.createdAt)}
                    </time>
                    <p className="mt-2 text-sm leading-relaxed text-ink/85">{testimonial.text}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(testimonial.id)}
                      disabled={deletingId !== null}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(testimonial)}
                      disabled={deletingId === testimonial.id}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === testimonial.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
