import { useState, type FormEvent } from 'react'
import { ADMIN_EMAILS, useAuth } from './auth'

/**
 * Pantalla de inicio de sesión del admin (CR-AD-01).
 *
 * Solo pide correo + contraseña a Supabase Auth. La autorización (allowlist)
 * se resuelve en AuthProvider: acá solo se dispara el signIn y se muestran
 * los errores de autenticación; una cuenta válida pero no allowlist cae al
 * estado "No autorizado" que no expone nada.
 */
export function AdminLogin() {
  const { signIn, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)
    if (result.error) {
      setError('No pudimos iniciar sesión. Verificá el correo y la contraseña e intentá de nuevo.')
      return
    }
    // auth resolverá solo el gate; aterrizamos en el panel.
    window.location.hash = '/admin'
  }

  const handleResetRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const result = await sendPasswordReset(email.trim() || ADMIN_EMAILS[0])
    setSubmitting(false)
    if (result.error) {
      setError('No pudimos enviar el link de recuperación. Intentá de nuevo.')
      return
    }
    setResetSent(true)
  }

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 font-sans text-ink">
        <div className="w-full max-w-md rounded-xl border border-brand-primary/15 bg-white/60 p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">ANV·BAR</p>
          <h1 className="mt-4 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
            Recuperar contraseña
          </h1>
          {resetSent ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">
                Revisá tu correo: te enviamos un link para crear una contraseña
                nueva. Si no aparece en unos minutos, mirá la carpeta de spam.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setResetSent(false)
                }}
                className="mt-6 inline-block text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
              >
                ← Volver a iniciar sesión
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink/80">
                Te enviamos un link de recuperación por correo.
              </p>
              <form onSubmit={handleResetRequest} className="mt-7 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
                  Correo electrónico
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={ADMIN_EMAILS[0]}
                    required
                    autoComplete="email"
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
                  {submitting ? 'Enviando…' : 'Enviar link de recuperación'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="mt-6 inline-block text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
              >
                ← Volver a iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 font-sans text-ink">
      <div className="w-full max-w-md rounded-xl border border-brand-primary/15 bg-white/60 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">ANV·BAR</p>
        <h1 className="mt-4 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
          Iniciar sesión
        </h1>
        <p className="mt-3 text-sm text-ink/80">
          Acceso restringido al equipo de ANV·BAR. Si no tenés permiso, podés volver a la tienda.
        </p>
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-deep">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setMode('forgot')
            }}
            className="self-end text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
          >
            ¿Olvidaste tu contraseña?
          </button>
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
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
        <a
          href="#/"
          className="mt-6 inline-block text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
        >
          ← Volver a la tienda
        </a>
      </div>
    </div>
  )
}