import { describe, expect, it } from 'vitest'
import { compareCatalogOrder, formatCOP, type Product } from './catalog'

/** Minimal product stub; only the fields these pure helpers read. */
function product(id: string, sortOrder?: number): Product {
  return { id, sortOrder } as unknown as Product
}

describe('formatCOP', () => {
  it('renders an integer COP amount with thousands separator', () => {
    expect(formatCOP(250000)).toBe('$250.000')
  })

  it('never shows decimals — prices are whole pesos by domain rule', () => {
    expect(formatCOP(0)).toBe('$0')
    expect(formatCOP(999)).toBe('$999')
    expect(formatCOP(1000000)).toBe('$1.000.000')
  })
})

describe('compareCatalogOrder', () => {
  it('orders by sortOrder ascending', () => {
    const items = [product('c', 2), product('a', 0), product('b', 1)]
    const sorted = [...items].sort(compareCatalogOrder)
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('places products without sortOrder after numbered ones (NULLS LAST)', () => {
    const items = [product('z'), product('a', 1), product('m')]
    const sorted = [...items].sort(compareCatalogOrder)
    expect(sorted.map((item) => item.id)).toEqual(['a', 'm', 'z'])
  })

  it('breaks ties by id for a stable order', () => {
    const items = [product('b', 3), product('a', 3)]
    const sorted = [...items].sort(compareCatalogOrder)
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b'])
  })
})
