import { useState } from 'react'
import type { Product } from './data/catalog'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { TrustBar } from './components/TrustBar'
import { ProductGrid } from './components/ProductGrid'
import { QuickViewModal } from './components/QuickViewModal'
import { ProductDetail } from './components/ProductDetail'
import { Footer } from './components/Footer'
import { LikesProvider } from './lib/LikesContext'

function Shop() {
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [detail, setDetail] = useState<Product | null>(null)

  const openDetail = (product: Product) => {
    setQuickView(null)
    setDetail(product)
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ProductGrid onQuickView={setQuickView} onOpenDetail={openDetail} />
      </main>
      <Footer />
      {quickView && (
        <QuickViewModal
          product={quickView}
          onClose={() => setQuickView(null)}
          onOpenDetail={openDetail}
        />
      )}
      {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function App() {
  return (
    <LikesProvider>
      <Shop />
    </LikesProvider>
  )
}

export default App