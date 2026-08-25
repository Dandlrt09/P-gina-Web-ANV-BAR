/**
 * ANV·BAR — Conteo agregado de favoritos en Supabase (prueba social).
 *
 * La lista PERSONAL de favoritos sigue viviendo en localStorage
 * (likes-storage.ts); esta capa añade el espejo anónimo en la tabla
 * public.product_likes para poder mostrar "N favoritos" en las tarjetas y
 * fichas. Módulo tolerante a fallos: si Supabase no responde o el visitante
 * está offline, la experiencia local de favoritos queda intacta (solo
 * console.warn, jamás un error visible).
 */
import { supabase } from '../shared/supabase'

/** Clave del UUID anónimo del visitante en localStorage. */
export const CLIENT_ID_STORAGE_KEY = 'anv-likes-client-id'

/**
 * Resuelve el UUID anónimo estable del visitante: se genera una vez con
 * crypto.randomUUID() y se reutiliza desde localStorage. Sin storage
 * disponible (render en node/SSR o modo privado) devuelve un id efímero de
 * sesión: el sitio nunca falla por esto.
 */
export function getClientId(): string {
  try {
    const stored = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (stored) return stored
    const generated = randomUUID()
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated)
    return generated
  } catch {
    // Storage ausente o bloqueado: id efímero; el conteo igual registra el like.
    return randomUUID()
  }
}

/** UUID v4 con fallback para contextos no seguros (crypto.randomUUID ausente). */
function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const nibble = char === 'x' ? random : (random & 0x3) | 0x8
    return nibble.toString(16)
  })
}

/**
 * Espeja un alta/baja de favorito en Supabase — fire-and-forget. Idempotente:
 * el alta usa resolución ignore-duplicates contra la PK (product_id,
 * client_id), así re-hacer like no duplica ni falla. Tras un sync exitoso
 * refresca los conteos compartidos. Cualquier fallo solo advierte por
 * consola: NUNCA rompe la UX local de favoritos.
 */
export function syncLike(productId: string, liked: boolean): void {
  void mirrorLike(productId, liked)
}

async function mirrorLike(productId: string, liked: boolean): Promise<void> {
  try {
    const clientId = getClientId()
    // Alta vía upsert con resolución ignore-duplicates contra la PK:
    // equivale a INSERT ... ON CONFLICT (product_id, client_id) DO NOTHING.
    const { error } = liked
      ? await supabase
          .from('product_likes')
          .upsert(
            { product_id: productId, client_id: clientId },
            { onConflict: 'product_id,client_id', ignoreDuplicates: true },
          )
      : await supabase
          .from('product_likes')
          .delete()
          .eq('product_id', productId)
          .eq('client_id', clientId)
    if (error) throw error
    void refreshLikeCounts()
  } catch (err) {
    console.warn('[favoritos] El conteo agregado no pudo sincronizarse:', err)
  }
}

/**
 * Trae los conteos agregados en UNA consulta ligera (escala de la tienda:
 * cientos de filas como máximo) y los cuenta en cliente. Fallo tolerante:
 * devuelve un objeto vacío, nunca rechaza.
 */
export async function fetchLikeCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase.from('product_likes').select('product_id')
    if (error) throw error
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      counts[row.product_id] = (counts[row.product_id] ?? 0) + 1
    }
    return counts
  } catch (err) {
    console.warn('[favoritos] No se pudieron cargar los conteos agregados:', err)
    return {}
  }
}

/* ------------------------------------------------------------------ */
/* Snapshot compartido (patrón useSyncExternalStore)                    */
/* ------------------------------------------------------------------ */

let likeCountsSnapshot: Record<string, number> = {}
const listeners = new Set<() => void>()

function getLikeCountsSnapshot(): Record<string, number> {
  return likeCountsSnapshot
}

function emitLikeCounts(): void {
  for (const listener of listeners) listener()
}

/** Refresca el snapshot compartido de conteos (una consulta por llamada). */
export async function refreshLikeCounts(): Promise<void> {
  likeCountsSnapshot = await fetchLikeCounts()
  emitLikeCounts()
}

let initialCountsLoadStarted = false

/** Carga inicial única: múltiples montajes comparten la misma petición. */
export function ensureLikeCountsLoaded(): void {
  if (initialCountsLoadStarted) return
  initialCountsLoadStarted = true
  void refreshLikeCounts()
}

export function subscribeLikeCounts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export { getLikeCountsSnapshot }
