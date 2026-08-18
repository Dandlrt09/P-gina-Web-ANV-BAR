import { formatCOP, type Product } from '../data/catalog'
import { ProductImage } from './ProductImage'
import { useLikes } from '../lib/likes'

type ProductCardProps = {
  product: Product
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
}

const ORDER_BADGE = 'Bajo pedido 3-5 días'

/**
 * Tarjeta de producto: placeholder tipográfico o foto, badge de
 * pedido bajo (nunca SALE), precio COP formateado, botón de "me
 * gusta" y acceso a la vista rápida.
 */
export function ProductCard({ product, onQuickView, onOpenDetail }: ProductCardProps) {
  const { isLiked, toggleLike } = useLikes()
  const liked = isLiked(product.id)
  const primary = product.colors[0]

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-primary/15 bg-white/60 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onQuickView(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onQuickView(product)
        }}
        className="relative cursor-pointer"
        aria-label={`Vista rápida de ${product.name}`}
      >
        <ProductImage
          image={primary?.image}
          alt={primary?.image?.label ?? product.name}
          className="aspect-[4/5] w-full"
        />
        <span className="absolute left-3 top-3 rounded-full bg-brand-deep/90 px-3 py-1 text-xs font-medium text-surface">
          {ORDER_BADGE}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleLike(product.id)
          }}
          aria-pressed={liked}
          aria-label={liked ? 'Quitar de tus favoritos' : 'Añadir a tus favoritos'}
          className={`absolute right-3 top-3 grid size-9 place-items-center rounded-full border text-lg ${
            liked
              ? 'border-brand-primary bg-brand-primary text-surface'
              : 'border-brand-primary/30 bg-surface/90 text-brand-primary'
          }`}
        >
          ♥
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">{product.category}</p>
        <h3 className="font-display text-lg leading-snug text-brand-deep">{product.name}</h3>
        <p className="mt-auto pt-1 text-base font-semibold text-brand-primary">
          {formatCOP(product.priceCOP)}
        </p>
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="mt-2 w-full rounded-full bg-brand-primary py-2 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
        >
          Ver ficha completa
        </button>
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="mt-2 w-full rounded-full border border-brand-primary/40 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
        >
          Vista rápida
        </button>
      </div>
    </article>
  )
}