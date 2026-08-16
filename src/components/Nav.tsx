import { Container } from './Container'
import { useLikes } from '../lib/likes'

/**
 * Barra de navegación superior: wordmark ANV·BAR y el conmutador
 * "Tus favoritos", que enciende el filtro del catálogo (fase 5) y
 * muestra el contador de piezas guardadas.
 */
export function Nav() {
  const { likes, favoritesOnly, toggleFavorites } = useLikes()
  const favoritesLabel = likes.size > 0 ? `Tus favoritos (${likes.size})` : 'Tus favoritos'

  const handleToggle = () => {
    const activating = !favoritesOnly
    toggleFavorites()
    if (activating) {
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-primary/20 bg-surface/95 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <a
          href="#inicio"
          className="font-display text-2xl font-semibold tracking-wide text-brand-deep"
        >
          ANV·BAR
        </a>
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={favoritesOnly}
          className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
            favoritesOnly
              ? 'text-brand-deep underline underline-offset-4'
              : 'text-brand-primary hover:text-brand-deep'
          }`}
        >
          <span aria-hidden="true" className="text-xs">
            ♥
          </span>
          {favoritesLabel}
        </button>
      </Container>
    </header>
  )
}