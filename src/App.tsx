import { useState } from 'react'
import type { Product } from './data/catalog'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { TrustBar } from './components/TrustBar'
import { ProductGrid } from './components/ProductGrid'
import { QuickViewModal } from './components/QuickViewModal'
import { Footer } from './components/Footer'
import { LikesProvider } from './lib/LikesContext'

function Shop() {
  const [quickView, setQuickView] = useState<Product | null>(null)

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ProductGrid onQuickView={setQuickView} />
      </main>
      <Footer />
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
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