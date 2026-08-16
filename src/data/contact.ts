/**
 * ANV·BAR — Canales de contacto oficiales (fuente única, verificable en
 * harness node). Handles exactos exigidos por el spec contact.
 */

export type ContactChannel = {
  label: string
  /** Texto exacto mostrado (handle o número, tal como exige el spec). */
  handle: string
  href: string
  note?: string
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    label: 'WhatsApp',
    handle: '3186424021',
    href: 'https://wa.me/573186424021',
    note: 'Pedidos por mensaje de texto, sin llamadas',
  },
  {
    label: 'Instagram',
    handle: '@anv.bar_av',
    href: 'https://www.instagram.com/anv.bar_av',
  },
  {
    label: 'Facebook Marketplace',
    handle: 'Facebook Marketplace',
    href: 'https://www.facebook.com/marketplace',
  },
  {
    label: 'Diseñadora',
    handle: '@anysval_',
    href: 'https://www.instagram.com/anysval_',
  },
]