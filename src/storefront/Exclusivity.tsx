import { Container } from '../shared/Container'
import { WHATSAPP_NUMBER } from './whatsapp'

const EXCLUSIVE_MESSAGE = 'Hola Anays, me interesa un diseño exclusivo de ANV·BAR. ¿Podemos conversar?'

/**
 * Bloque "Diseños exclusivos": abre el WhatsApp directo de la diseñadora
 * con un mensaje de diseño a medida. Solo texto, sin llamadas (spec 5-7).
 */
export function Exclusivity() {
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(EXCLUSIVE_MESSAGE)}`

  return (
    <section id="exclusivos" className="scroll-mt-20 border-t border-brand-primary/10">
      <Container className="py-14 sm:py-16">
        <div className="relative overflow-hidden rounded-2xl bg-brand-deep px-6 py-10 text-surface sm:px-10 sm:py-12">
          {/* Marca de agua editorial: "RUBRA" sobre el fondo oscuro */}
          <span
            aria-hidden="true"
            className="editorial-watermark editorial-watermark--light absolute -bottom-6 -right-4 font-display text-[6rem] italic leading-none tracking-tight sm:text-[8rem]"
          >
            RUBRA
          </span>

          <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Diseños exclusivos
          </p>
          <h2 className="relative mt-3 max-w-2xl font-display text-3xl font-medium leading-snug sm:text-4xl">
            ¿Buscas una pieza para una <em className="italic">ocasión especial</em>?
          </h2>
          <p className="relative mt-3 max-w-2xl text-surface/80">
            Una pieza única, diseñada desde tu idea y cosida por las manos de Anays.
            Escríbele por WhatsApp y hagámosla realidad.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="relative mt-6 inline-flex rounded-full bg-surface px-7 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-accent hover:text-surface"
          >
            Cuéntale tu idea
          </a>
        </div>
      </Container>
    </section>
  )
}