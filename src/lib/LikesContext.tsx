import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LikesContext } from './likes'

/**
 * Provee el estado de "me gusta" (favoritos) a toda la tienda.
 * En este work unit el estado vive en memoria; la persistencia en
 * localStorage y el filtro "Tus favoritos" se agregan en la fase 5.
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [likes, setLikes] = useState<Set<string>>(() => new Set())

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

  const value = useMemo(
    () => ({ likes, isLiked, toggleLike }),
    [likes, isLiked, toggleLike],
  )

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}