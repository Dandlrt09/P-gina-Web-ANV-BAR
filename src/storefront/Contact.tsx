import { useEffect, useState } from 'react'
import { Container } from '../shared/Container'
import { ensureContactChannelsLoaded, getContactChannels } from '../catalog/contactChannels'

/**
 * Contact section: the brand's official channels (WhatsApp text orders,
 * Instagram, Facebook Marketplace and the designer). Channels come from the
 * shared singleton in src/catalog/contactChannels.ts — fetched once per page
 * load from Supabase (managed at #/admin/contacto) with the bundled
 * content/contact.json as fallback — so the first paint already has content
 * while the DB read is in flight.
 */
export function Contact() {
  const [channels, setChannels] = useState(getContactChannels)

  // Refresh from the singleton once the single DB read settles; while DB rows
  // match the bundled seed this swap renders identical output.
  useEffect(() => {
    let active = true
    void ensureContactChannelsLoaded().then(() => {
      if (active) setChannels(getContactChannels())
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <section id="contacto" className="scroll-mt-20 border-t border-brand-primary/10 bg-white/40">
      <Container className="py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Contacto</p>
        <h2 className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl lg:text-6xl">
          Hablemos
        </h2>
        <p className="mt-3 max-w-xl text-ink/80">Escríbenos por el canal que prefieras. Todos los pedidos se tramitan por WhatsApp en texto, sin llamadas.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((channel) => (
            <li key={`${channel.label}·${channel.href}`}>
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
