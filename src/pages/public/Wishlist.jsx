import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import ProductCard from '../../components/public/ProductCard'

const Wishlist = () => {
  const { user, loading: authLoading } = useAuth()
  const { wishlistProducts, loading: wishlistLoading } = useWishlist()
  const loading = authLoading || (Boolean(user) && wishlistLoading)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-7 w-7 text-emerald-700" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500">Your saved favourites</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-16" role="status">Loading your wishlist...</p>
      ) : !user ? (
        <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14">
          <Heart className="h-12 w-12 mx-auto mb-4 text-emerald-200" />
          <h2 className="text-lg font-semibold text-gray-900">Sign in to view your wishlist</h2>
          <p className="text-gray-500 mt-2 mb-6">Save your favourite pieces and find them here later.</p>
          <Link to="/login?redirect=/wishlist" className="inline-flex bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-800 transition-colors">
            Sign In
          </Link>
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14">
          <Heart className="h-12 w-12 mx-auto mb-4 text-emerald-200" />
          <h2 className="text-lg font-semibold text-gray-900">Your wishlist is empty</h2>
          <p className="text-gray-500 mt-2 mb-6">Tap the heart on a product to save it here.</p>
          <Link to="/products" className="inline-flex bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-800 transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {wishlistProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  )
}

export default Wishlist
