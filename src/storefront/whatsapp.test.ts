import { describe, expect, it } from 'vitest'
import { SHIPPING_NOTICE, WHATSAPP_NUMBER, buildWhatsAppLink } from './whatsapp'

describe('buildWhatsAppLink', () => {
  it('targets the brand number in E.164 format', () => {
    const href = buildWhatsAppLink({ product: 'Vestido', color: 'Burdeo', size: 'M', quantity: 1 })
    expect(href).toContain(`https://wa.me/${WHATSAPP_NUMBER}?text=`)
  })

  it('encodes the message — no raw spaces or line breaks in the URL', () => {
    const href = buildWhatsAppLink({ product: 'Vestido RUBRA Nocturno', color: 'Burdeo', size: 'M', quantity: 2 })
    expect(href).not.toMatch(/\s/)
    const decoded = decodeURIComponent(href.split('?text=')[1])
    expect(decoded).toContain('Hola ANV·BAR, quiero pedir:')
    expect(decoded).toContain('Vestido RUBRA Nocturno, color Burdeo, talla M, cantidad 2.')
  })

  it('always includes the made-to-order shipping notice', () => {
    const href = buildWhatsAppLink({ product: 'Falda', color: 'Marfil', size: 'S', quantity: 1 })
    expect(decodeURIComponent(href.split('?text=')[1])).toContain(`${SHIPPING_NOTICE}.`)
  })
})
