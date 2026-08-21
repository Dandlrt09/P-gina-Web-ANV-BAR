import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../shared/supabase'
import { AuthContext, isAdminEmail, type AuthStatus } from './auth'

/**
 * Provee la sesión de Supabase Auth a todo el árbol.
 *
 * AL arrancar restaura la sesión guardada (getSession) y luego ESCUCHA los
 * cambios (onAuthStateChange), así el state vive solo acá y el gate del admin
 * es una proyección: signedOut → login, no allowlist → denied, allowlist → ok.
 * Sin sesión/credenciales nunca se exponen datos del catálogo desde el admin.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const applySession = (sessionEmail: string | null) => {
      if (!active) return
      setEmail(sessionEmail)
      if (sessionEmail === null) {
        setStatus('signedOut')
      } else if (isAdminEmail(sessionEmail)) {
        setStatus('ok')
      } else {
        setStatus('denied')
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session?.user.email ?? null)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session?.user.email ?? null)
      // El link de recovery (PKCE) llega con el fragment #/recovery intacto,
      // pero si el usuario lo abre desde un lugar que no lo preservó (p.ej.
      // un cliente de correo que reescribe la URL), navegamos acá igual.
      if (event === 'PASSWORD_RECOVERY' && !window.location.hash.startsWith('#/recovery')) {
        window.location.hash = '/recovery'
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password })
    return error ? { error: error.message } : { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (emailInput: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim(), {
      redirectTo: `${window.location.origin}/#/recovery`,
    })
    return error ? { error: error.message } : { error: null }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? { error: error.message } : { error: null }
  }, [])

  const value = useMemo(
    () => ({ status, email, signIn, signOut, sendPasswordReset, updatePassword }),
    [status, email, signIn, signOut, sendPasswordReset, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}