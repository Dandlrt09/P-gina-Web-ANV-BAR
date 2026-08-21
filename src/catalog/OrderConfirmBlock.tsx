import { WHATSAPP_NUMBER } from '../storefront/whatsapp'

const STATUS_MESSAGE = 'Hola ANV·BAR, quiero consultar el estado de mi pedido.'

/**
 * Bloque de confirmación: explica cómo funciona el pedido después de
 * confirmar (número de pedido asignado, consulta por WhatsApp en texto,
 * envío 3-5 días). El registro solo pide nombre y contacto; el resto se
 * coordina por mensaje de texto.
 */
export function OrderConfirmBlock() {
  const statusLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(STATUS_MESSAGE)}`

  return (
    <section aria-labelledby="como-consulto-mi-pedido" className="rounded-xl border border-brand-primary/20 bg-white/60 p-5">
      <h4 id="como-consulto-mi-pedido" className="font-display text-lg font-medium text-brand-deep">
        ¿Cómo consulto mi pedido?
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">
        Al confirmar, Anays asigna un <strong>número de pedido</strong> y coordina contigo la
        talla y el ajuste por WhatsApp. Para conocer el estado de tu pedido, escríbenos por
        WhatsApp con tu número de pedido.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        <strong>Tu envío está programado: 3 a 5 días máximo.</strong>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        El registro solo pide tu <strong>nombre y un contacto</strong>; el resto se acuerda por
        mensaje de texto. No recibirás llamadas.
      </p>
      <a
        href={statusLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
      >
        Consultar por WhatsApp
      </a>
    </section>
  )
}