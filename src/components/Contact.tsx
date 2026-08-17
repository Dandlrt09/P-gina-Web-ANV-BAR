import { Container } from './Container'
import { CONTACT_CHANNELS } from '../data/contact'

/**
 * Sección de contacto: los cuatro canales oficiales de la marca
 * (WhatsApp texto 3186424021, Instagram @anv.bar_av, Facebook Marketplace
 * y la diseñadora @anysval_), renderizados desde src/data/contact.ts.
 */
export function Contact() {
  return (
    <section id="contacto" className="scroll-mt-20 border-t border-brand-primary/10 bg-white/40">
      <Container className="py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Contacto</p>
        <h2 className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl lg:text-6xl">
          Hablemos
        </h2>
        <p className="mt-3 max-w-xl text-ink/80">Escríbenos por el canal que prefieras. Todos los pedidos se tramitan por WhatsApp en texto, sin llamadas.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACT_CHANNELS.map((channel) => (
            <li key={channel.handle}>
              <a
                href={channel.href}
                target="_blank"
                rel="noreferrer"
                className="block h-full rounded-xl border border-brand-primary/15 bg-surface p-5 transition-colors hover:border-brand-primary hover:bg-white"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {channel.label}
                </span>
                <span className="mt-2 block font-display text-lg text-brand-deep">
                  {channel.handle}
                </span>
                {channel.note && (
                  <span className="mt-1 block text-xs text-ink/70">{channel.note}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}