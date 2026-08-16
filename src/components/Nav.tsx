import { Container } from './Container'
import { useLikes } from '../lib/likes'

/**
 * Barra de navegación superior: wordmark ANV·BAR y acceso a
 * la colección. El enlace "Tus favoritos" gana su filtro funcional
 * en la fase 5 (favoritos persistentes).
 */
export function Nav() {
  const { likes } = useLikes()
  const favoritesLabel = likes.size > 0 ? `Tus favoritos (${likes.size})` : 'Tus favoritos'

  return (
    <header className="sticky top-0 z-40 border-b border-brand-primary/20 bg-surface/95 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <a
          href="#inicio"
          className="font-display text-2xl font-semibold tracking-wide text-brand-deep"
        >
          ANV·BAR
        </a>
        <a
          href="#catalogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
        >
          <span aria-hidden="true" className="text-xs">
            ♥
          </span>
          {favoritesLabel}
        </a>
      </Container>
    </header>
  )
}