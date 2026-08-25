import { useEffect, useSyncExternalStore } from 'react'
import {
  ensureLikeCountsLoaded,
  getLikeCountsSnapshot,
  subscribeLikeCounts,
} from './likes-api'

/**
 * Conteo agregado de favoritos de un producto (prueba social "N favoritos").
 * Lee el snapshot compartido cargado UNA vez por página y refrescado en cada
 * like-toggle; devuelve 0 mientras no haya dato o si el backend falla — la
 * UI oculta el cero, así que un fallo es invisible.
 */
export function useLikeCount(productId: string): number {
  useEffect(() => {
    ensureLikeCountsLoaded()
  }, [])
  return useSyncExternalStore(subscribeLikeCounts, () => getLikeCountsSnapshot()[productId] ?? 0)
}

/** Etiqueta neutra del conteo: "8 favoritos" / "1 favorito". */
export function likeCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'favorito' : 'favoritos'}`
}
