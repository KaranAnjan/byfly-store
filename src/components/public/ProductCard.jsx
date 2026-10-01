import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { getImageUrl } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'

const ProductCard = ({ product }) => {
  const navigate = useNavigate()
  const { cart, addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const inStock = product.stock > 0
  const minimumOrder = product.min_order_qty || 1
  const canMeetMinimum = product.stock >= minimumOrder
  const inCart = cart.some(item => item.id === product.id)
  const wishlisted = isInWishlist(product.id)
  const wholesaleDiscount = product.wholesale_mrp != null && product.wholesale_price != null && Number(product.wholesale_mrp) > Number(product.wholesale_price)
    ? Math.round(((Number(product.wholesale_mrp) - Number(product.wholesale_price)) / Number(product.wholesale_mrp)) * 100)
    : 0

  const imageUrl = product.image_url ? getImageUrl(product.image_url) : null

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
    toast.success((t) => (
      <div className="flex items-center justify-between gap-3 w-full">
        <span>Added to cart!</span>
        <button
          onClick={() => {
            navigate('/cart')
            toast.dismiss(t.id)
          }}
          className="bg-white text-emerald-600 font-bold px-3 py-1 rounded-lg hover:bg-emerald-50 transition-all text-sm"
        >
          View Cart
        </button>
      </div>
    ))
  }

  const openDetails = () => navigate(`/products/${product.id}`)
  const handleCardKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetails()
    }
  }

  return (
    <div className="group block h-full">
      <div
        onClick={openDetails}
        onKeyDown={handleCardKeyDown}
        role="link"
        tabIndex={0}
        className="bg-white rounded-lg border border-gray-200 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
          <Link to={`/products/${product.id}`} className="absolute inset-0 block">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <ShoppingCart className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded">Out of Stock</span>
            </div>
          )}
          </Link>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product) }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all z-10"
          >
            <Heart className={`h-4 w-4 transition-colors ${wishlisted ? 'fill-emerald-600 text-emerald-600' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <Link to={`/products/${product.id}`} className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug hover:text-emerald-700">
            {product.product_name}
          </Link>

          <p className="text-xs text-gray-400 font-mono mb-3">{product.product_code}</p>

          <div className="flex items-center gap-2 mb-3">
            {product.wholesale_price != null ? (
                <>
                  <span className="text-base font-bold text-emerald-700">Rs. {product.wholesale_price}</span>
                  {wholesaleDiscount > 0 && <>
                    <span className="text-xs text-gray-400 line-through">Rs. {product.wholesale_mrp}</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">{wholesaleDiscount}% OFF</span>
                  </>}
                </>
              ) : (
                <span className="text-xs font-medium text-gray-500">Price on request</span>
              )}
          </div>

          {inStock && product.stock <= 3 && (
            <p className="text-xs text-amber-600 mb-3">Only {product.stock} left</p>
          )}
          {minimumOrder > 1 && <p className="mb-3 text-xs text-slate-500">Minimum order: {minimumOrder} units</p>}

          <div className="mt-auto">
            {inCart ? (
              <Link to="/cart" onClick={(e) => e.stopPropagation()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                View Cart
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!canMeetMinimum || product.wholesale_price == null}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {!inStock ? 'Sold Out' : !canMeetMinimum ? 'Below minimum quantity' : product.wholesale_price == null ? 'Price unavailable' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
