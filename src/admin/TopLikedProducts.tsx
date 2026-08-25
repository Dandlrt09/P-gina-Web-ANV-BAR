/**
 * ANV·BAR — "Piezas más deseadas" ranking widget for the admin dashboard.
 *
 * Shows the top-5 most-liked products by aggregate anonymous favorite counts.
 * Data source: `product_likes` table via `fetchLikeCounts()` (same shared
 * snapshot used on the storefront cards). Read-only, no mutations.
 *
 * Realtime: subscribes to INSERT/DELETE on `product_likes` (already in the
 * Supabase publication) so the ranking refreshes live when any visitor
 * likes or unlikes a product.
 */
import { useEffect, useState } from 'react'
import { PRODUCTS, formatCOP } from '../catalog/catalog'
import { fetchLikeCounts } from '../favorites/likes-api'
import { likeCountLabel } from '../favorites/useLikeCount'
import { supabase } from '../shared/supabase'

type RankedProduct = {
  id: string
  name: string
  category: string
  price: string
  image: string | null
  count: number
}

function buildRanked(counts: Record<string, number>): RankedProduct[] {
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return sorted.map(([id, count]) => {
    const product = PRODUCTS.find((p) => p.id === id)
    const image = product?.colors?.[0]?.image?.src ?? null
    return {
      id,
      name: product?.name ?? id,
      category: product?.category ?? '',
      price: product ? formatCOP(product.priceCOP) : '',
      image,
      count,
    }
  })
}

export function TopLikedProducts() {
  const [ranked, setRanked] = useState<RankedProduct[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const counts = await fetchLikeCounts()
      if (cancelled) return
      setRanked(buildRanked(counts))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Realtime: refetch counts when any visitor likes/unlikes a product.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('admin-ranking-likes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_likes' },
        () => {
          // Debounce bursts of rapid toggles (300 ms).
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(async () => {
            const counts = await fetchLikeCounts()
            setRanked(buildRanked(counts))
          }, 300)
        },
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  if (ranked.length === 0) return null

  return (
    <div className="mt-8 rounded-xl border border-brand-primary/15 bg-white/60 p-6">
      <h2 className="font-display text-lg text-brand-deep">Piezas más deseadas</h2>
      <p className="mt-1 text-sm text-ink/80">
        Ranking de productos con más favoritos entre los visitantes.
      </p>

      <div className="mt-5 divide-y divide-brand-primary/10">
        {ranked.map((item, i) => (
          <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            {/* Rank number */}
            <span className="w-6 text-center font-display text-base font-semibold text-brand-primary">
              {i + 1}
            </span>

            {/* Thumbnail */}
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-xs font-medium text-brand-primary/60">
                {item.name.charAt(0)}
              </div>
            )}

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <a
                href={`#/admin/productos/${item.id}`}
                className="block truncate text-sm font-medium text-brand-deep hover:underline"
              >
                {item.name}
              </a>
              <p className="mt-0.5 text-xs text-ink/60">
                {item.category}
                {item.price && <span className="ml-1.5">{item.price}</span>}
              </p>
            </div>

            {/* Like count badge */}
            <span className="flex-shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-deep">
              {likeCountLabel(item.count)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
