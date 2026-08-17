import { Container } from './Container'
import { DESIGNER } from '../data/catalog'

/**
 * Sección "La diseñadora": perfil de Anays y la historia de la colección
 * RUBRA (flor trinitaria). Todo el contenido llega del data file (DESIGNER
 * en src/data/catalog.ts), reemplazable sin tocar código (spec 5).
 */
export function Designer() {
  return (
    <section id="disenadora" className="relative scroll-mt-20 overflow-hidden border-t border-brand-primary/10 bg-white/40">
      <Container className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.5fr] lg:items-start">
        {/* Marca de agua editorial: "RUBRA" detrás de la tarjeta */}
        <span
          aria-hidden="true"
          className="editorial-watermark absolute -right-8 bottom-2 font-display text-[6rem] italic leading-none tracking-tight sm:text-[10rem] lg:text-[12rem]"
        >
          RUBRA
        </span>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            La diseñadora
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl">
            {DESIGNER.name}
          </h2>
          <p className="mt-2 text-sm text-accent">{DESIGNER.role}</p>
          <p className="mt-4 font-display text-xl italic leading-relaxed text-brand-primary">
            {DESIGNER.claim}
          </p>
        </div>
        <div className="relative space-y-6">
          <p className="text-ink/80">{DESIGNER.bio}</p>
          <div className="rounded-xl border border-brand-primary/15 bg-surface p-6">
            <h3 className="font-display text-xl font-medium text-brand-deep">
              Colección {DESIGNER.collection.name}
            </h3>
            <p className="mt-3 text-ink/80">{DESIGNER.collection.story}</p>
          </div>
        </div>
      </Container>
    </section>
  )
}