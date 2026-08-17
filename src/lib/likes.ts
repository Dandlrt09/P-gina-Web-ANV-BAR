import { createContext, useContext } from 'react'

export type LikesContextValue = {
  likes: ReadonlySet<string>
  isLiked: (id: string) => boolean
  toggleLike: (id: string) => void
}

export const LikesContext = createContext<LikesContextValue | null>(null)

export function useLikes(): LikesContextValue {
  const ctx = useContext(LikesContext)
  if (!ctx) throw new Error('useLikes debe usarse dentro de LikesProvider')
  return ctx
}