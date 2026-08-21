import { useState, type FormEvent } from 'react'
import { useAuth } from './auth'

/**
 * Página de recuperación de contraseña (ruta #/recovery).
 *
 * Aterriza con la sesión de recovery ya establecida: el link del correo trae
 * un code PKCE por query; supabase-js lo canjea durante la inicialización y
 * AuthProvider recibe PASSWORD_RECOVERY, navegando acá. Con sesión activa se
 * muestra el formulario; el cambio se confirma con updateUser({ password }),
 * se cierra la sesión y se vuelve al login del admin. Sin sesión (link
 * vencido o abierto a mano) se muestra el estado inválido.
 */
export function RecoveryPage() {
  const { status, updatePassword, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)

    const trimmed = password
    if (trimmed.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (trimmed !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    const result = await updatePassword(trimmed)
    setSubmitting(false)
    if (result.error) {
      setError(`No pudimos actualizar la contraseña: ${result.error}`)
      return
    }
    // El link es de un solo uso: cerramos la sesión de recovery y volvemos
    // al login para entrar con la contraseña nueva.
    await signOut()
    window.location.hash = '/admin'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 font-sans text-ink">
      <div className="w-full max-w-md rounded-xl border border-brand-primary/15 bg-white/60 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">ANV·BAR</p>
        <h1 className="mt-4 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
          Nueva contraseña
        </h1>

        {status === 'loading' ? (
          <p className="mt-3 text-sm text-ink/70">Verificando el link…</p>
        ) : status !== 'ok' ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Este link de recuperación no es válido o ya fue usado. Pedí uno
              nuevo desde la pantalla de inicio de sesión.
            </p>
            <a
              href="#/admin"
              className="mt-6 inline-block text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
            >
              ← Volver a iniciar sesión
            </a>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink/80">
              Elegí una contraseña nueva para tu cuenta de administración.
            </p>
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
                Nueva contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
                Repetir contraseña
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm font-medium text-brand-deep">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}