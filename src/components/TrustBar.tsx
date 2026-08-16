import { Container } from './Container'

const PROMISES = [
  'Hecho a mano',
  'Envío al Caribe',
  'Bajo pedido 3-5 días',
  'Pide por WhatsApp',
] as const

/**
 * Barra de confianza con las cuatro promesas de la marca.
 * Copy exacto del spec: no modificar los textos.
 */
export function TrustBar() {
  return (
    <section aria-label="Nuestras promesas" className="border-b border-brand-primary/10 bg-white/40">
      <Container className="grid grid-cols-2 gap-y-4 py-5 sm:grid-cols-4">
        {PROMISES.map((promise) => (
          <p key={promise} className="flex items-center justify-center gap-2 text-center text-sm font-medium text-brand-deep">
            <span aria-hidden="true" className="text-accent">
              ✦
            </span>
            {promise}
          </p>
        ))}
      </Container>
    </section>
  )
}