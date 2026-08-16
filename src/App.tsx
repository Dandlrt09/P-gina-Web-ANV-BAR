import { Container } from './components/Container'
import { Section } from './components/Section'

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <header className="border-b border-brand-primary/20">
        <Container className="flex items-center py-5">
          <p className="font-display text-2xl font-semibold tracking-wide text-brand-deep">
            ANVÂ·BAR
          </p>
        </Container>
      </header>

      <main className="flex-1">
        <Section>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Moda hecha a mano
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-tight text-brand-primary sm:text-5xl">
            La colecciÃ³n estÃ¡ en camino
          </h1>
          <p className="mt-4 max-w-xl text-ink/80">
            Estamos preparando el catÃ¡logo, las fichas de producto y el pedido
            por WhatsApp. Vuelve en unos dÃ­as.
          </p>
        </Section>
      </main>

      <footer className="border-t border-brand-primary/20">
        <Container className="py-4">
          <p className="text-sm text-ink/70">
            ANVÂ·BAR â€” Donde la ligereza se convierte en elegancia
          </p>
        </Container>
      </footer>
    </div>
  )
}

export default App