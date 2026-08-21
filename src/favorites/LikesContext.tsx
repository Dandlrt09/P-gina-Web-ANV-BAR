import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LikesContext } from './likes'
import { loadLikes, saveLikes } from './likes-storage'

/**
 * Provee el estado de "me gusta" (favoritos) a toda la tienda.
 *
 * Los favoritos persisten en localStorage (se restauran al cargar y se
 * guardan en cada cambio) y se muestran en su pantalla dedicada
 * (FavoritesPage), sin filtrar el catálogo principal.
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [likes, setLikes] = useState<Set<string>>(() => loadLikes())

  useEffect(() => {
    saveLikes(likes)
  }, [likes])

  const toggleLike = useCallback((id: string) => {
    setLikes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isLiked = useCallback((id: string) => likes.has(id), [likes])

  const value = useMemo(() => ({ likes, isLiked, toggleLike }), [likes, isLiked, toggleLike])

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}