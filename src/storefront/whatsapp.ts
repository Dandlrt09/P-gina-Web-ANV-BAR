/**
 * ANV·BAR — Canal de pedidos por WhatsApp (solo texto, nunca llamadas).
 *
 * Todo pedido se tramita por un mensaje de texto a wa.me. El sitio no ofrece
 * llamadas (sin enlaces `tel:`) y no tiene carrito ni pasarela de pago: el
 * deep link abre WhatsApp con el mensaje prearmado del producto.
 *
 * Número en formato E.164 (prefijo internacional +57 + 3186424021).
 */

export const WHATSAPP_NUMBER = '573186424021'

export type OrderMessage = {
  /** Nombre del producto tal como aparece en el catálogo. */
  product: string
  /** Nombre real del color seleccionado (variante de la ficha). */
  color: string
  /** Talla elegida. */
  size: string
  /** Cantidad de unidades. */
  quantity: number
}

/** Aviso de envío incluido en todo mensaje de pedido (spec whatsapp-order-flow). */
export const SHIPPING_NOTICE = 'Entrega en 3 a 5 días'

/**
 * Construye el deep link wa.me con el mensaje prearmado de un pedido.
 *
 * El mensaje es compacto (<= ~200 caracteres) y codifica espacios y signos
 * con encodeURIComponent; nunca se interpola texto crudo en la URL.
 *
 * @example
 * buildWhatsAppLink({
 *   product: 'Vestido RUBRA Nocturno',
 *   color: 'Burdeo',
 *   size: 'M',
 *   quantity: 1,
 * })
 * // → https://wa.me/573186424021?text=Hola%20ANV%C2%B7BAR%2C%20quiero%20pedir%3A%20...
 */
export function buildWhatsAppLink(order: OrderMessage): string {
  const message = [
    'Hola ANV·BAR, quiero pedir:',
    `${order.product}, color ${order.color}, talla ${order.size}, cantidad ${order.quantity}.`,
    `${SHIPPING_NOTICE}.`,
  ].join(' ')

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}