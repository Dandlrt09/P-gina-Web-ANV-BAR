import { Container } from '../shared/Container'

/**
 * Footer con el humano adelante: canales de contacto exactos de la
 * marca (Instagram @anv.bar_av, WhatsApp 3186424021, @anysval_ y
 * Facebook Marketplace) y la frase de marca.
 */
export function Footer() {
  return (
    <footer className="border-t border-brand-primary/20 bg-brand-deep text-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-semibold tracking-wide">ANV·BAR</p>
          <p className="mt-2 text-sm text-surface/70">
            Donde la ligereza se convierte en elegancia
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Síguenos
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-surface/80">
            <li>
              <a
                href="https://www.instagram.com/anv.bar_av"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-surface"
              >
                Instagram @anv.bar_av
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/anysval_"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-surface"
              >
                Diseñadora @anysval_
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/marketplace"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-surface"
              >
                Facebook Marketplace
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Pedidos
          </h4>
          <p className="mt-3 text-sm text-surface/80">
            WhatsApp{' '}
            <a
              href="https://wa.me/573186424021"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-surface transition-colors hover:text-accent"
            >
              3186424021
            </a>
          </p>
          <p className="mt-1 text-sm text-surface/70">Bajo pedido 3-5 días</p>
        </div>
      </Container>

      <div className="border-t border-surface/10">
        <Container className="py-4">
          <p className="text-xs text-surface/60">
            © {new Date().getFullYear()} ANV·BAR — Hecho a mano en el Caribe colombiano.
          </p>
        </Container>
      </div>
    </footer>
  )
}