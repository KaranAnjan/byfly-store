import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProduct } from '../../hooks/useProducts'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import Loading from '../../components/common/Loading'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, ChevronRight, IndianRupee, Heart } from 'lucide-react'
import { getImageUrl } from '../../lib/supabaseClient'
import { toSlug, formatName } from '../../lib/utils'
import toast from 'react-hot-toast'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading } = useProduct(id)
  const { cart, addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()

  if (loading) return <Loading />
  if (!product) return <div className="text-center py-16 text-lg text-gray-500">Product not found</div>
  const minimumOrder = product.min_order_qty || 1
  const canMeetMinimum = product.stock >= minimumOrder

  const handleAddToCart = () => {
    addToCart(product)
    toast.success((t) => (
      <div className="flex items-center justify-between gap-3 w-full">
        <span>Added to cart!</span>
        <button
          onClick={() => {
            navigate('/cart')
            toast.dismiss(t.id)
          }}
          className="bg-white text-emerald-600 font-semibold px-3 py-1 rounded-md hover:bg-emerald-50 transition-all text-sm"
        >
          View Cart
        </button>
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
          <ChevronRight className="h-3 w-3" />
          {product.categories?.category_name && (
            <>
              <Link to={`/category/${toSlug(product.categories.category_name)}`} className="hover:text-emerald-600 transition-colors">
                {formatName(product.categories.category_name)}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-gray-600 font-medium truncate max-w-[200px]">{product.product_name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden group relative"
          >
            <div className="aspect-square">
              {product.image_url ? (
                <img
                  src={getImageUrl(product.image_url)}
                  alt={product.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <ShoppingCart className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>
            <button
              onClick={() => toggleWishlist(product)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all z-10"
            >
              <Heart className={`h-5 w-5 transition-colors ${isInWishlist(product.id) ? 'fill-emerald-600 text-emerald-600' : 'text-gray-600'}`} />
            </button>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
            className="space-y-5"
          >
            {/* Category */}
            {product.categories?.category_name && (
              <span className="inline-block text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">
                {formatName(product.categories.category_name)}
              </span>
            )}

            {/* Title */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {product.product_name}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Code: <span className="font-mono text-gray-600">{product.product_code}</span>
              </p>
            </div>

            {product.description?.trim() && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 text-sm leading-6 text-gray-600">
                <h2 className="mb-1 font-semibold text-gray-900">Product details</h2>
                <p className="whitespace-pre-line">{product.description.trim()}</p>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <IndianRupee className="h-5 w-5 text-emerald-700" />
              {product.wholesale_price != null ? (
                <>
                  <span className="text-base font-bold text-emerald-700">₹{product.wholesale_price}</span>
                  {product.wholesale_mrp != null && Number(product.wholesale_mrp) > Number(product.wholesale_price) &&
                    <span className="text-sm text-gray-400 line-through">₹{product.wholesale_mrp}</span>}
                </>
              ) : (
                <span className="text-xs font-medium text-gray-500">Price on request</span>
              )}
            </div>

            {/* Stock */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
              product.stock > 0
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              {product.stock > 0
                ? product.stock <= 3 ? `Only ${product.stock} left` : 'In Stock'
                : 'Out of Stock'}
            </div>
            {minimumOrder > 1 && <p className="text-sm text-slate-500">Minimum order: {minimumOrder} units</p>}

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Add to Cart */}
            {cart.some(item => item.id === product.id) ? (
              <Link to="/cart"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                View Cart
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!canMeetMinimum || product.wholesale_price == null}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                {product.stock <= 0 ? 'Sold Out' : !canMeetMinimum ? 'Below minimum quantity' : product.wholesale_price == null ? 'Price unavailable' : 'Add to Cart'}
              </button>
            )}

            {/* Contact Row */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Hi, interested in:\n${product.product_name}\nCode: ${product.product_code}\n${product.wholesale_price != null ? `Wholesale price: Rs. ${product.wholesale_price}` : 'Please share the wholesale price'}`)
                  window.open(`https://wa.me/${(import.meta.env.VITE_PHONE || '+917407437378').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
                }}
                className="text-center text-sm font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 rounded-lg py-2.5 transition-all"
              >
                WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
