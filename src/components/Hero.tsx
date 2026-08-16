import { Container } from './Container'

/**
 * Hero editorial full-bleed: manifiesto de una línea en serif,
 * colección RUBRA y el motivo de la trinitaria (tres pétalos).
 * El claim mantiene su idioma original (decisión de marca).
 */
export function Hero() {
  return (
    <section id="inicio" className="scroll-mt-20 overflow-hidden border-b border-brand-primary/10">
      <Container className="relative py-16 sm:py-24 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Colección RUBRA
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-brand-primary sm:text-5xl lg:text-6xl">
            Donde la ligereza se convierte en elegancia
          </h1>
          <p className="mt-5 max-w-xl text-ink/80">
            Prendas femeninas hechas a mano bajo pedido, inspiradas en la
            trinitaria que florece en los jardines del Caribe.
          </p>
          <a
            href="#catalogo"
            className="mt-8 inline-flex rounded-full bg-brand-primary px-7 py-3 text-sm font-semibold text-surface transition-colors hover:bg-brand-deep"
          >
            Ver la colección
          </a>
        </div>

        {/* Motivo decorativo: tres pétalos de la trinitaria */}
        <svg
          viewBox="0 0 200 200"
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 hidden w-72 -translate-y-1/2 lg:block"
        >
          <ellipse
            cx="100"
            cy="62"
            rx="48"
            ry="38"
            fill="var(--color-brand-primary)"
            transform="rotate(45 100 62)"
          />
          <ellipse
            cx="100"
            cy="138"
            rx="48"
            ry="38"
            fill="var(--color-accent)"
            transform="rotate(-45 100 138)"
          />
          <circle cx="100" cy="100" r="20" fill="var(--color-surface)" stroke="var(--color-brand-deep)" strokeWidth="2" />
        </svg>
      </Container>
    </section>
  )
}