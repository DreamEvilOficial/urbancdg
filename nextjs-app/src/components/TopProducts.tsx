import { type Producto } from '@/lib/supabase'
import { Star, Zap } from 'lucide-react'
import ProductCard from './ProductCard'

interface TopProductsProps {
  products: Producto[]
}

export default function TopProducts({ products }: TopProductsProps) {
  if (!products || products.length === 0) return null

  return (
    <section className="relative w-full py-20 overflow-hidden bg-black">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.05)_0%,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      
      {/* Decorative Elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative max-w-7xl mx-auto px-4 z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-3 mb-4 group">
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400 group-hover:scale-125 transition-transform duration-300" />
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              Top Picks
            </h2>
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400 group-hover:scale-125 transition-transform duration-300" />
          </div>
          <p className="text-sm md:text-base text-gray-400 font-medium uppercase tracking-[0.3em] flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-yellow-500/50"></span>
            Los más elegidos — sin vueltas
            <span className="w-8 h-px bg-yellow-500/50"></span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 w-full">
          {products.map((producto, idx) => (
            <div key={producto.id} className={`transform hover:-translate-y-2 transition-transform duration-500`}>
              <ProductCard 
                producto={{...producto, isTopProduct: true}} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
