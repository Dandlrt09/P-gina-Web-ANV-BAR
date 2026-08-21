/**
 * ANV·BAR — Persistencia de favoritos en localStorage.
 *
 * Módulo deliberadamente SIN dependencias de React para poder verificarse
 * fuera del navegador (harness node). LikesProvider lo usa como capa de
 * guardado/carga; aquí vive el contrato de persistencia (spec likes).
 */

export const LIKES_STORAGE_KEY = 'anv-bar:likes'

/**
 * Resuelve el storage del navegador. Devuelve null cuando no existe
 * (render en node/SSR) o está bloqueado (modo privado): el sitio sigue
 * funcionando en memoria, sin persistencia y sin fallar.
 */
function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * Carga el Set de IDs favoritos guardados. Datos ausentes o corruptos
 * producen un Set vacío, nunca un error.
 */
export function loadLikes(storage: Storage | null = defaultStorage()): Set<string> {
  if (!storage) return new Set()
  try {
    const raw = storage.getItem(LIKES_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

/**
 * Guarda el Set de IDs favoritos como JSON. Sin storage disponible se
 * convierte en no-op silencioso (el estado en memoria sigue activo).
 */
export function saveLikes(ids: ReadonlySet<string>, storage: Storage | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // Cuota excedida o storage bloqueado: no romper la experiencia.
  }
}