import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  DESIGNER_PROFILE_BOUNDS,
  loadDesignerProfile,
  updateDesignerProfile,
  type DesignerProfileInput,
} from '../catalog/designerProfile'
import type { DesignerProfile } from '../catalog/catalog'
import { supabase } from '../shared/supabase'

const inputClass =
  'w-full rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-brand-deep'

/** Proyecta el perfil (vista anidada) al borrador plano de seis campos del formulario. */
function profileToDraft(profile: DesignerProfile): DesignerProfileInput {
  return {
    name: profile.name,
    role: profile.role,
    bio: profile.bio,
    collectionName: profile.collection.name,
    collectionStory: profile.collection.story,
    claim: profile.claim,
  }
}

/** Recorte defensivo antes de validar y guardar: la base guarda valores sin espacios sobrantes. */
function trimDraft(draft: DesignerProfileInput): DesignerProfileInput {
  return {
    name: draft.name.trim(),
    role: draft.role.trim(),
    bio: draft.bio.trim(),
    collectionName: draft.collectionName.trim(),
    collectionStory: draft.collectionStory.trim(),
    claim: draft.claim.trim(),
  }
}

type DraftField = keyof DesignerProfileInput

type DraftIssue = { field: DraftField; message: string }

/**
 * Espejo de los CHECKs de la tabla ANTES de tocar la red: mínimo 1 carácter
 * (tras recortar) y máximo por campo según DESIGNER_PROFILE_BOUNDS. La base
 * sigue siendo la última autoridad (RLS + CHECKs).
 */
function validateDraft(draft: DesignerProfileInput): DraftIssue[] {
  const rules: Array<{ field: DraftField; label: string; max: number }> = [
    { field: 'name', label: 'el nombre', max: DESIGNER_PROFILE_BOUNDS.maxName },
    { field: 'role', label: 'el rol', max: DESIGNER_PROFILE_BOUNDS.maxRole },
    { field: 'bio', label: 'la biografía', max: DESIGNER_PROFILE_BOUNDS.maxBio },
    {
      field: 'collectionName',
      label: 'el nombre de la colección',
      max: DESIGNER_PROFILE_BOUNDS.maxCollectionName,
    },
    {
      field: 'collectionStory',
      label: 'la historia de la colección',
      max: DESIGNER_PROFILE_BOUNDS.maxCollectionStory,
    },
    { field: 'claim', label: 'la frase de marca', max: DESIGNER_PROFILE_BOUNDS.maxClaim },
  ]
  const issues: DraftIssue[] = []
  for (const rule of rules) {
    const value = draft[rule.field]
    if (value.length < 1) {
      issues.push({ field: rule.field, message: `Falta ${rule.label}.` })
    } else if (value.length > rule.max) {
      issues.push({
        field: rule.field,
        message: `${rule.label.charAt(0).toUpperCase()}${rule.label.slice(1)} no puede superar ${rule.max} caracteres.`,
      })
    }
  }
  return issues
}

/** Estado del formulario: los seis valores más una bandera de escritura en curso. */
type EditorState = { values: DesignerProfileInput; dirty: boolean }

/**
 * Gestor del perfil de la diseñadora (#/admin/disenadora).
 * La ficha es ÚNICA (fila id = 1): solo se edita — no existe crear, listar ni
 * eliminar; el ciclo de vida de la fila pertenece a las migraciones.
 */
export function DesignerProfileManager() {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [issues, setIssues] = useState<DraftIssue[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setEditor({ values: profileToDraft(await loadDesignerProfile()), dirty: false })
    } catch (error) {
      setEditor(null)
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime refetch-on-event: si el cambio llega de otro lado (u otro admin),
  // el formulario se rellena SOLO cuando está limpio; nunca se pisa lo que la
  // usuaria está escribiendo.
  useEffect(() => {
    const channel = supabase
      .channel('admin-designer-profile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'designer_profile' },
        () => {
          void loadDesignerProfile()
            .then((fresh) =>
              setEditor((prev) =>
                prev !== null && prev.dirty ? prev : { values: profileToDraft(fresh), dirty: false },
              ),
            )
            .catch(() => {})
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  // Nota efímera de éxito: desaparece sola tras un momento.
  useEffect(() => {
    if (!savedNote) return
    const timer = window.setTimeout(() => setSavedNote(null), 4000)
    return () => window.clearTimeout(timer)
  }, [savedNote])

  const setField = (field: DraftField, value: string) => {
    setEditor((prev) => {
      if (prev === null) return prev
      const values: DesignerProfileInput = { ...prev.values, [field]: value }
      return { ...prev, values, dirty: true }
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (editor === null || saving) return
    const input = trimDraft(editor.values)
    const found = validateDraft(input)
    if (found.length > 0) {
      setIssues(found)
      return
    }
    setIssues([])
    setSaving(true)
    setActionError(null)
    try {
      await updateDesignerProfile(input)
      setEditor({ values: input, dirty: false })
      setSavedNote('Cambios guardados.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  const invalidInput = (field: DraftField) =>
    issues.some((issue) => issue.field === field)
      ? 'border-red-400 ring-2 ring-red-400/60 focus:border-red-500'
      : ''

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">Diseñadora</h1>
          <p className="mt-2 text-ink/80">
            Edite el perfil de la diseñadora que se publica en la tienda. El perfil es una ficha
            única: se puede editar, pero no crear ni eliminar.
          </p>
        </div>

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5">
            <p className="font-medium text-brand-deep">No pudimos cargar el perfil</p>
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

        {!loadError && editor === null && (
          <div role="status" className="mt-10 flex justify-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando el perfil…</span>
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

        {editor !== null && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-4 sm:p-5"
          >
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
                Nombre
                <input
                  type="text"
                  value={editor.values.name}
                  onChange={(e) => setField('name', e.target.value)}
                  maxLength={DESIGNER_PROFILE_BOUNDS.maxName}
                  placeholder="Anays Vargas"
                  className={`${inputClass} ${invalidInput('name')}`}
                />
              </label>
              <label className={labelClass}>
                Rol
                <input
                  type="text"
                  value={editor.values.role}
                  onChange={(e) => setField('role', e.target.value)}
                  maxLength={DESIGNER_PROFILE_BOUNDS.maxRole}
                  placeholder="Diseñadora y fundadora de ANV·BAR"
                  className={`${inputClass} ${invalidInput('role')}`}
                />
              </label>
            </div>
            <label className={labelClass}>
              Biografía
              <textarea
                value={editor.values.bio}
                onChange={(e) => setField('bio', e.target.value)}
                rows={4}
                maxLength={DESIGNER_PROFILE_BOUNDS.maxBio}
                placeholder="Quién es la diseñadora y cómo trabaja…"
                className={`${inputClass} resize-y ${invalidInput('bio')}`}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Nombre de la colección
                <input
                  type="text"
                  value={editor.values.collectionName}
                  onChange={(e) => setField('collectionName', e.target.value)}
                  maxLength={DESIGNER_PROFILE_BOUNDS.maxCollectionName}
                  placeholder="RUBRA"
                  className={`${inputClass} ${invalidInput('collectionName')}`}
                />
              </label>
              <label className={labelClass}>
                Frase de marca
                <input
                  type="text"
                  value={editor.values.claim}
                  onChange={(e) => setField('claim', e.target.value)}
                  maxLength={DESIGNER_PROFILE_BOUNDS.maxClaim}
                  placeholder="Donde la ligereza se convierte en elegancia"
                  className={`${inputClass} ${invalidInput('claim')}`}
                />
              </label>
            </div>
            <label className={labelClass}>
              Historia de la colección
              <textarea
                value={editor.values.collectionStory}
                onChange={(e) => setField('collectionStory', e.target.value)}
                rows={5}
                maxLength={DESIGNER_PROFILE_BOUNDS.maxCollectionStory}
                placeholder="El relato detrás de la colección…"
                className={`${inputClass} resize-y ${invalidInput('collectionStory')}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
