import { type Producto } from '@/lib/supabase'
import { Star } from 'lucide-react'
import ProductCard from './ProductCard'

interface TopProductsProps {
  products: Producto[]
}

export default function TopProducts({ products }: TopProductsProps) {
  if (!products || products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <div>
          <div className="inline-flex items-center gap-2 mb-4">
            <Star className="w-6 h-6 text-accent fill-accent" />
            <h2 className="text-4xl md:text-5xl font-black tracking-[0.25em] text-white uppercase italic">Top Picks</h2>
            <Star className="w-6 h-6 text-accent fill-accent" />
          </div>
          <p className="text-sm md:text-base text-white/70 font-medium uppercase tracking-[0.35em]">Los más elegidos — sin vueltas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 w-full px-1 md:px-0">
        {products.map((producto, idx) => (
          <div key={producto.id} className={`reveal reveal-delay-${(idx % 5) + 1}`}>
            <ProductCard 
              producto={{...producto, isTopProduct: true}} 
            />
          </div>
        ))}
      </div>
    </section>
  )
}
