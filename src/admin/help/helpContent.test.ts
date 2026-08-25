import { describe, expect, it } from 'vitest'
import { HELP_SECTIONS } from './helpContent'

/**
 * Contrato estructural del contenido de ayuda: ids únicos para la navegación
 * interna y texto siempre presente. El render es genérico, así que estos
 * invariantes son lo único que puede romper la página en silencio.
 */
describe('HELP_SECTIONS', () => {
  it('has the three documented sections with unique ids', () => {
    expect(HELP_SECTIONS.map((section) => section.id)).toEqual([
      'tienda-publica',
      'panel-administracion',
      'si-algo-se-rompe',
    ])
  })

  it('keeps every section and entry populated', () => {
    for (const section of HELP_SECTIONS) {
      expect(section.title.trim()).not.toBe('')
      expect(section.intro.trim()).not.toBe('')
      expect(section.entries.length).toBeGreaterThan(0)
      for (const entry of section.entries) {
        expect(entry.title.trim()).not.toBe('')
        const hasText =
          (entry.paragraphs?.some((p) => p.trim() !== '') ?? false) ||
          (entry.bullets?.some((b) => b.trim() !== '') ?? false)
        expect(hasText).toBe(true)
      }
    }
  })

  it('uses neutral plain text: no emojis anywhere in the guide', () => {
    const allText = JSON.stringify(HELP_SECTIONS)
    expect(/\p{Extended_Pictographic}/u.test(allText)).toBe(false)
  })
})
