import { Container } from './Container'

type NavProps = {
  favoritesCount: number
  onGoToFavorites: () => void
  onGoHome: () => void
}

/**
 * Barra de navegación superior: wordmark ANV·BAR y el acceso a la pantalla
 * dedicada de favoritos, que muestra el contador de piezas guardadas.
 */
export function Nav({ favoritesCount, onGoToFavorites, onGoHome }: NavProps) {
  const favoritesLabel = favoritesCount > 0 ? `Tus favoritos (${favoritesCount})` : 'Tus favoritos'

  return (
    <header className="sticky top-0 z-40 border-b border-brand-primary/20 bg-surface/95 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <button
          type="button"
          onClick={onGoHome}
          className="font-display text-2xl font-semibold tracking-wide text-brand-deep"
        >
          ANV·BAR
        </button>
        <button
          type="button"
          onClick={onGoToFavorites}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
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