import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../catalog/catalog'
import { RULES, answerFor } from './chatbot'

describe('answerFor', () => {
  it('answers greetings with the assistant intro', () => {
    const answer = answerFor('Hola')
    expect(answer.text).toContain('ANV·BAR')
    expect(answer.text).toContain('asistente virtual')
  })

  it('routes ordering intent to WhatsApp with a deep link', () => {
    const answer = answerFor('quiero hacer un pedido')
    expect(answer.link?.label).toBe('Pedir por WhatsApp')
    expect(answer.link?.href).toMatch(/^https:\/\/wa\.me\/\d+$/)
  })

  it('answers shipping questions with the made-to-order delivery window', () => {
    const answer = answerFor('cuánto tarda el envío')
    expect(answer.text).toContain('Entrega en 3 a 5 días')
  })

  it('lists the canonical categories when asked about the catalog', () => {
    const answer = answerFor('qué categorías de productos tienen')
    expect(answer.text).toContain(String(CATEGORIES.length))
    CATEGORIES.forEach((category) => expect(answer.text).toContain(category))
  })

  it('falls back to a helpful answer when nothing matches', () => {
    const answer = answerFor('xyzzy sin sentido alguno')
    expect(answer.text.length).toBeGreaterThan(0)
  })

  it('prefers the rule with the most keyword hits, not the first match', () => {
    // 'quiero pedir' hits the order rule twice while weaker rules stay at zero.
    const answer = answerFor('quiero pedir')
    expect(answer.link?.label).toBe('Pedir por WhatsApp')
  })

  it('keeps the fallback rule last in the array (contract)', () => {
    const last = RULES[RULES.length - 1]
    expect(last.keywords).toEqual([])
  })
})
