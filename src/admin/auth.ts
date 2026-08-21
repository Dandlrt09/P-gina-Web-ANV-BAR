import { createContext, useContext } from 'react'

/**
 * Allowlist de correos con acceso al panel de administración. Colección con
 * `as const`: el contrato vive aquí y la copia server-side es
 * `public.is_admin()` en la migración admin (deben mantenerse en sync).
 */
export const ADMIN_EMAILS = ['danieldelosriost@gmail.com'] as const

export type AuthStatus = 'loading' | 'signedOut' | 'ok' | 'denied'

export type AuthContextValue = {
  /** Estado de la sesión para el gate del admin. */
  status: AuthStatus
  /** Correo de la sesión activa (null cuando no hay sesión). */
  email: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Envía el correo de recuperación de contraseña (link → #/recovery). */
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  /** Cambia la contraseña de la sesión activa (flujo de recovery). */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

/** true solo cuando el correo pertenece a ADMIN_EMAILS (case-insensitive no: los correos se normalizan en Supabase). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email != null && (ADMIN_EMAILS as readonly string[]).includes(email)
}