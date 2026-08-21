import { Container } from '../shared/Container'
import { TESTIMONIALS } from '../catalog/catalog'

/**
 * Testimonios de clientas: nombre + ciudad y texto desde el data file
 * (TESTIMONIALS en src/catalog/catalog.ts), reemplazables sin tocar código.
 */
export function Testimonials() {
  return (
    <section id="testimonios" className="scroll-mt-20 border-t border-brand-primary/10">
      <Container className="py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Clientas</p>
        <h2 className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl lg:text-6xl">
          Lo que dicen
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-xl border border-brand-primary/15 bg-white/60 p-6">
              <blockquote className="flex-1 text-ink/80">“{t.text}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold text-brand-deep">{t.name}</span>
                {t.city && <span className="text-accent"> · {t.city}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  )
}