import { Container } from '../shared/Container'

const HERO_IMAGE = '/imagenes/hero-rubra.jpg'

/**
 * Hero editorial full-bleed: foto IA del vestido burdeo suspendido entre
 * trinitarias como protagonista, con overlay suave para legibilidad y un
 * degradado inferior que funde la sección con la superficie del sitio.
 * El claim mantiene su idioma y su texto original (decisión de marca).
 */
export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-[90vh] scroll-mt-20 items-center overflow-hidden"
    >
      {/* Foto protagonista (placeholder IA hasta las fotos reales de Anays) */}
      <img
        src={HERO_IMAGE}
        alt="Vestido burdeo suspendido entre trinitarias de la colección RUBRA"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay suave para legibilidad del texto */}
      <div aria-hidden="true" className="absolute inset-0 bg-surface/30 mix-blend-multiply" />

      {/* Scrim lateral: oscurece la zona del texto para que se lea sobre la foto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-negro/55 via-negro/25 to-transparent"
      />

      {/* Degradado inferior que funde la foto con la superficie del sitio */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-surface to-transparent" />

      <Container className="relative py-20 sm:py-28 lg:py-32">
        <div className="relative max-w-2xl">
          <p className="animate-rise motion-reduce:animate-none text-xs font-semibold uppercase tracking-[0.3em] text-surface [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]">
            ✦ Colección
          </p>
          <h1 className="animate-rise motion-reduce:animate-none mt-5 font-display text-5xl font-medium leading-[1.05] text-surface [text-shadow:0_1px_12px_rgba(0,0,0,0.25)] sm:text-6xl lg:text-7xl">
            Donde la ligereza
            <br />
            se convierte en{' '}
            <em className="bg-[linear-gradient(to_right,#6b1d2a,#9e2e48,#e8829a,#9e2e48,#6b1d2a)] bg-clip-text font-medium italic text-transparent [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))]">
              elegancia
            </em>
          </h1>
          <p className="animate-rise motion-reduce:animate-none mt-6 max-w-xl text-xs font-semibold uppercase tracking-[0.3em] text-surface [animation-delay:120ms] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
            Prendas femeninas hechas a mano bajo pedido, inspiradas en la
            bugambilla que florece en los jardines del Caribe.
          </p>
          <div className="animate-rise motion-reduce:animate-none mt-8 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <a
              href="#catalogo"
              className="inline-flex rounded-full bg-brand-primary px-7 py-3 text-sm font-semibold text-surface transition-colors hover:bg-brand-deep"
            >
              Ver la colección
            </a>
            <a
              href="#disenadora"
              className="inline-flex rounded-full border border-surface/90 bg-negro/30 px-7 py-3 text-sm font-semibold text-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-surface hover:text-brand-deep"
            >
              Conoce a la diseñadora
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}