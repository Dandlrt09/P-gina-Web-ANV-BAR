import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LikesContext } from './likes'
import { loadLikes, saveLikes } from './likes-storage'
import { syncLike } from './likes-api'

/**
 * Provee el estado de "me gusta" (favoritos) a toda la tienda.
 *
 * Los favoritos persisten en localStorage (se restauran al cargar y se
 * guardan en cada cambio) y se muestran en su pantalla dedicada
 * (FavoritesPage), sin filtrar el catálogo principal. Cada alta/baja también
 * espeja un conteo anónimo en Supabase (likes-api.ts, fire-and-forget) que
 * alimenta la prueba social "N favoritos"; si el backend falla la
 * experiencia local no se ve afectada.
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [likes, setLikes] = useState<Set<string>>(() => loadLikes())

  useEffect(() => {
    saveLikes(likes)
  }, [likes])

  const toggleLike = useCallback(
    (id: string) => {
      const liked = likes.has(id)
      const next = new Set(likes)
      if (liked) {
        next.delete(id)
      } else {
        next.add(id)
      }
      setLikes(next)
      // Espejo anónimo del like en Supabase (prueba social): fire-and-forget,
      // idempotente y tolerante a fallos — jamás bloquea ni rompe la UI.
      syncLike(id, !liked)
    },
    [likes],
  )

  const isLiked = useCallback((id: string) => likes.has(id), [likes])

  const value = useMemo(() => ({ likes, isLiked, toggleLike }), [likes, isLiked, toggleLike])

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}