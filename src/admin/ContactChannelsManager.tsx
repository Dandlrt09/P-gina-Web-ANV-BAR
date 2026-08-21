import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createChannel,
  deleteChannel,
  listChannels,
  updateChannel,
  validateContactChannel,
  type ContactChannel,
  type ContactChannelInput,
} from './contactChannels'
import type { ValidationIssue } from './products'

const inputClass =
  'w-full rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-brand-deep'

/**
 * Editable draft of one channel. sortOrder stays as raw text until submit so
 * an invalid value surfaces as a validation issue instead of being coerced
 * (Number('') is 0, which would silently reorder the channel).
 */
type ChannelDraft = {
  label: string
  handle: string
  href: string
  note: string
  sortOrder: string
}

const EMPTY_DRAFT: ChannelDraft = { label: '', handle: '', href: '', note: '', sortOrder: '' }

function draftFrom(channel: ContactChannel): ChannelDraft {
  return {
    label: channel.label,
    handle: channel.handle ?? '',
    href: channel.href,
    note: channel.note ?? '',
    sortOrder: String(channel.sortOrder),
  }
}

function draftToInput(draft: ChannelDraft): ContactChannelInput {
  const rawOrder = draft.sortOrder.trim()
  return {
    label: draft.label.trim(),
    handle: draft.handle.trim() === '' ? null : draft.handle.trim(),
    href: draft.href.trim(),
    note: draft.note.trim() === '' ? null : draft.note.trim(),
    // Empty/non-numeric order becomes NaN on purpose: validateContactChannel
    // rejects it with an explicit message instead of saving a wrong value.
    sortOrder: rawOrder === '' ? Number.NaN : Number(rawOrder),
  }
}

type ChannelEditorProps = {
  heading: string
  initial: ChannelDraft
  saving: boolean
  submitLabel: string
  onSave: (input: ContactChannelInput) => Promise<unknown>
  onCancel: () => void
}

/**
 * Inline create/edit form for one channel. Validates client-side with
 * validateContactChannel BEFORE touching the database (an invalid payload
 * never reaches Supabase) and renders the issues in the same summary style
 * as ProductForm; server errors bubble up to the parent screen.
 */
function ChannelEditor({ heading, initial, saving, submitLabel, onSave, onCancel }: ChannelEditorProps) {
  const [draft, setDraft] = useState<ChannelDraft>(initial)
  const [issues, setIssues] = useState<ValidationIssue[]>([])

  const invalidInput = (field: string) =>
    issues.some((issue) => issue.field === field)
      ? 'border-red-400 ring-2 ring-red-400/60 focus:border-red-500'
      : ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const input = draftToInput(draft)
    const found = validateContactChannel(input)
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Etiqueta
          <input
            type="text"
            value={draft.label}
            onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="WhatsApp"
            maxLength={40}
            className={`${inputClass} ${invalidInput('label')}`}
          />
        </label>
        <label className={labelClass}>
          Orden
          <input
            type="number"
            min={0}
            step={1}
            value={draft.sortOrder}
            onChange={(e) => setDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
            placeholder="0"
            className={`${inputClass} ${invalidInput('sortOrder')}`}
          />
        </label>
        <label className={labelClass}>
          Usuario o cuenta
          <input
            type="text"
            value={draft.handle}
            onChange={(e) => setDraft((prev) => ({ ...prev, handle: e.target.value }))}
            placeholder="@cuenta o número"
            maxLength={60}
            className={`${inputClass} ${invalidInput('handle')}`}
          />
        </label>
        <label className={labelClass}>
          Nota
          <input
            type="text"
            value={draft.note}
            onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Pedidos por mensaje de texto"
            maxLength={140}
            className={`${inputClass} ${invalidInput('note')}`}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Enlace
          <input
            type="text"
            inputMode="url"
            value={draft.href}
            onChange={(e) => setDraft((prev) => ({ ...prev, href: e.target.value }))}
            placeholder="https://wa.me/573186424021"
            className={`${inputClass} ${invalidInput('href')}`}
          />
        </label>
      </div>
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

/**
 * Contact channels manager (route #/admin/contacto).
 * Full CRUD over public.contact_channels through the slice-A data layer;
 * every write is authorized server-side by the is_admin() RLS policies.
 * Create and edit happen inline; each successful mutation reloads the list
 * so ordering always reflects the database contract (sort_order asc).
 */
export function ContactChannelsManager() {
  const [channels, setChannels] = useState<ContactChannel[] | null>(null)
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
      setChannels(await listChannels())
    } catch (error) {
      setChannels(null)
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Transient success feedback: "Cambios guardados." fades after a moment.
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

  const handleDelete = async (channel: ContactChannel) => {
    if (deletingId !== null || saving) return
    if (!window.confirm(`¿Eliminar "${channel.label}"? Esta acción no se puede deshacer.`)) return
    setActionError(null)
    setDeletingId(channel.id)
    try {
      await deleteChannel(channel.id)
      if (editingId === channel.id) setEditingId(null)
      setChannels((prev) => (prev ?? []).filter((item) => item.id !== channel.id))
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
            <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">Contacto</h1>
            <p className="mt-2 text-ink/80">
              Gestione los canales de contacto que se muestran en la tienda.
            </p>
          </div>
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            + Añadir canal
          </button>
        </div>

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5">
            <p className="font-medium text-brand-deep">No pudimos cargar los canales de contacto</p>
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

        {!loadError && channels === null && (
          <div role="status" className="mt-10 flex justify-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando canales…</span>
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

        {!loadError && channels !== null && channels.length === 0 && !creating && (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-brand-deep">Aún no hay canales de contacto</p>
            <p className="mt-1 text-sm text-ink/80">
              Cree el primero y aparecerá en la sección de contacto de la tienda.
            </p>
            <button
              type="button"
              onClick={beginCreate}
              className="mt-6 inline-block rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              + Añadir canal
            </button>
          </div>
        )}

        {channels !== null && (channels.length > 0 || creating) && (
          <ul className="mt-8 flex flex-col gap-3">
            {creating && (
              <li className="rounded-xl border border-brand-primary/15 bg-white/60 p-4 sm:p-5">
                <ChannelEditor
                  heading="Nuevo canal"
                  initial={EMPTY_DRAFT}
                  saving={saving}
                  submitLabel="Crear canal"
                  onSave={(input) => persist(() => createChannel(input))}
                  onCancel={closeEditors}
                />
              </li>
            )}
            {channels.map((channel) =>
              editingId === channel.id ? (
                <li key={channel.id} className="rounded-xl border border-brand-primary/25 bg-white/60 p-4 sm:p-5">
                  <ChannelEditor
                    heading={`Editar — ${channel.label}`}
                    initial={draftFrom(channel)}
                    saving={saving}
                    submitLabel="Guardar cambios"
                    onSave={(input) => persist(() => updateChannel(channel.id, input))}
                    onCancel={closeEditors}
                  />
                </li>
              ) : (
                <li
                  key={channel.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg leading-snug text-brand-deep">{channel.label}</h2>
                      <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-deep">
                        Orden {channel.sortOrder}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink/80">
                      {channel.handle ?? channel.label} · {channel.href}
                    </p>
                    {channel.note && <p className="mt-0.5 text-xs text-ink/70">{channel.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(channel.id)}
                      disabled={deletingId !== null}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(channel)}
                      disabled={deletingId === channel.id}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === channel.id ? 'Eliminando…' : 'Eliminar'}
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
