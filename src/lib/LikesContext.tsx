import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LikesContext } from './likes'
import { loadLikes, saveLikes } from './likes-storage'

/**
 * Provee el estado de "me gusta" (favoritos) a toda la tienda.
 *
 * Fase 5: los favoritos persisten en localStorage (se restauran al cargar
 * y se guardan en cada cambio) y el conmutador "Tus favoritos" enciende el
 * filtro del catálogo para mostrar solo las piezas guardadas (spec likes).
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [likes, setLikes] = useState<Set<string>>(() => loadLikes())
  const [favoritesOnly, setFavoritesOnly] = useState(false)

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

  const toggleFavorites = useCallback(() => setFavoritesOnly((prev) => !prev), [])

  const value = useMemo(
    () => ({ likes, isLiked, toggleLike, favoritesOnly, toggleFavorites }),
    [likes, isLiked, toggleLike, favoritesOnly, toggleFavorites],
  )

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}