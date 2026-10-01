import { Gem, Gift, Sparkles, Palette } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../../lib/supabaseClient'

const DISPLAY_COUNT = 5
const RADIUS = 440

const categoryFallback = {
  jewellery: { icon: Gem, bg: 'from-amber-100 to-amber-200', iconColor: 'text-amber-500', label: '💎' },
  gifts: { icon: Gift, bg: 'from-pink-100 to-pink-200', iconColor: 'text-pink-500', label: '🎁' },
  cosmetics: { icon: Palette, bg: 'from-emerald-100 to-emerald-200', iconColor: 'text-emerald-500', label: '💄' },
  'special-occasions': { icon: Sparkles, bg: 'from-yellow-100 to-yellow-200', iconColor: 'text-yellow-500', label: '✨' },
}

const Carousel3D = ({ products = [] }) => {
  const displayItems = Array.from({ length: DISPLAY_COUNT }, (_, i) =>
    products[i % products.length]
  ).filter(Boolean)

  const n = displayItems.length
  const step = n > 1 ? ((86 * Math.PI) / 180) / (n - 1) : 0
  const center = (n - 1) / 2

  if (displayItems.length === 0) {
    return (
      <div className="w-full h-[340px] flex items-center justify-center">
        <p className="text-white/50 text-lg">No products to display</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[340px] md:h-[400px] flex items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={{
          width: 0,
          height: 0,
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        {displayItems.map((product, i) => {
          const offset = i - center
          const angle = offset * step
          const x = Math.sin(angle) * RADIUS
          const z = Math.cos(angle) * RADIUS - RADIUS

          const imageUrl = product.image_url ? getImageUrl(product.image_url) : null
          const catName = product.categories?.category_name?.toLowerCase() || ''
          const fallback = categoryFallback[catName] || categoryFallback.gifts
          const FallbackIcon = fallback.icon

          return (
            <Link
              key={`${product.id}-${i}`}
              to={`/products/${product.id}`}
              className="absolute top-1/2 left-1/2 block"
              style={{
                transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px)`,
              }}
            >
              <div
                className="w-32 md:w-44 bg-white rounded-xl overflow-hidden shadow-xl transform-gpu cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                style={{ filter: 'brightness(0.75) contrast(1)', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1) contrast(1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.75) contrast(1)'
                }}
              >
                <div className="relative h-40 md:h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.product_name}
                      className="w-full h-full object-cover transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${fallback.bg} gap-2`}>
                      <FallbackIcon className={`h-10 w-10 ${fallback.iconColor}`} />
                      <span className="text-3xl">{fallback.label}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <span className="bg-white/90 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 translate-y-2 hover:translate-y-0 shadow-lg">
                      View Details
                    </span>
                  </div>
                </div>

                <div className="px-3 py-3">
                  <p className="text-xs font-semibold text-gray-800 truncate text-center">
                    {product.product_name}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 text-center">
                    {product.price != null ? `Rs. ${product.price}` : 'Price on request'}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Carousel3D
