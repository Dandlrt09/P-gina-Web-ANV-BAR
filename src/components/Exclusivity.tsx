import { Container } from './Container'
import { WHATSAPP_NUMBER } from '../lib/whatsapp'

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
        <div className="rounded-2xl bg-brand-deep px-6 py-10 text-surface sm:px-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Diseños exclusivos
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-medium leading-snug sm:text-3xl">
            ¿Buscas una pieza para una ocasión especial?
          </h2>
          <p className="mt-3 max-w-2xl text-surface/80">
            Anays diseña piezas a medida con la esencia de la colección. Escríbele por WhatsApp
            para contarle tu idea.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full bg-surface px-7 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-accent hover:text-surface"
          >
            Escribir a la diseñadora
          </a>
        </div>
      </Container>
    </section>
  )
}