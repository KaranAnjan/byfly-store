import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, Search, Heart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { supabase, getImageUrl } from '../../lib/supabaseClient'
import { useState, useEffect, useRef } from 'react'
import { toSlug, formatName } from '../../lib/utils'
import { attachProductPrices, normalizeStoreProduct } from '../../lib/storeCatalog'
import { visibleAccountEmail } from '../../lib/accountIdentity'

const Navbar = () => {
  const { cart } = useCart()
  const { wishlistIds } = useWishlist()
  const { user, profileSummary, isAdmin } = useAuth()
  const { categories } = useCategories()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
  const desktopSearchRef = useRef(null)
  const desktopSearchInputRef = useRef(null)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const displayName = user?.user_metadata?.name || profileSummary?.name || ''
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean)
  const profileInitials = (nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0]?.slice(0, 2) || visibleAccountEmail(user)?.[0] || 'U').toUpperCase()

  useEffect(() => {
    const updateScrollState = () => {
      const scrollY = window.scrollY
      setIsScrolled((current) => current ? scrollY > 16 : scrollY > 56)
    }
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
    setDesktopSearchOpen(false)
    setSearchResults([])
  }, [location.pathname, location.search])

  useEffect(() => {
    if (desktopSearchOpen) desktopSearchInputRef.current?.focus()
  }, [desktopSearchOpen])

  useEffect(() => {
    if (!desktopSearchOpen) return undefined
    const handleOutsideClick = (event) => {
      if (!desktopSearchRef.current?.contains(event.target)) setDesktopSearchOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') setDesktopSearchOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [desktopSearchOpen])

  useEffect(() => {
    if (!searchQuery.trim() || !mobileSearchOpen) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const q = searchQuery.trim().toLowerCase()
      const { data } = await supabase
        .from('products')
        .select('id, product_name, product_code, image_url, stock, price, mrp, product_stock(retail_quantity,wholesale_quantity)')
        .or(`product_name.ilike.%${q}%,product_code.ilike.%${q}%`)
        .limit(6)
      const productsWithPrices = await attachProductPrices(data || [])
      setSearchResults(productsWithPrices.map(normalizeStoreProduct))
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, mobileSearchOpen])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchResults([])
      setDesktopSearchOpen(false)
    }
  }

  const isActive = (path) => location.pathname === path
  const isHomePage = location.pathname === '/'
  const isTransparentAtTop = isHomePage && !isScrolled
  const pathPart = location.pathname.match(/^\/category\/(.+)/)?.[1]
  const curCategory = pathPart || new URLSearchParams(location.search).get('category')
  const isProductsPage = location.pathname === '/products' || !!pathPart

  return (
    <nav className={`${isHomePage ? 'fixed top-0 left-0 right-0' : 'sticky top-0'} z-50 bg-transparent transition-shadow duration-300 ${isTransparentAtTop ? 'shadow-none' : 'shadow-xl'}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 transition-opacity duration-300 ease-out ${isTransparentAtTop ? 'opacity-0' : 'opacity-100'}`} />
      <div className="max-w-7xl mx-auto px-4">
        <div className={`relative z-10 flex justify-between items-center transition-[height] duration-300 ease-out ${isScrolled ? 'h-16' : 'h-20'}`}>
          {/* Byfly brand */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-all duration-300 flex-shrink-0 group">
            <img src="/logo.png" alt="Byfly" className="h-14 w-16 object-contain md:h-16 md:w-[4.5rem]" />
            <div className="block">
              <p className="text-[10px] md:text-sm text-emerald-100 leading-tight">Wholesale Store</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                isActive('/')
                  ? 'bg-white text-emerald-700 shadow-lg scale-105'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              Home
            </Link>

            <Link
              to="/products"
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                isProductsPage && !curCategory
                  ? 'bg-white text-emerald-700 shadow-lg scale-105'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              All Products
            </Link>

            {categories.map((cat) => {
              const slug = toSlug(cat.category_name)
              return (
              <Link
                key={cat.id}
                to={`/category/${slug}`}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                  curCategory === slug
                    ? 'bg-white text-emerald-700 shadow-lg scale-105'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                {formatName(cat.category_name)}
              </Link>
              )
            })}

          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 md:gap-5">
            <form ref={desktopSearchRef} onSubmit={handleSearchSubmit} className="hidden md:flex items-center">
              <div className={`relative flex items-center overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all duration-300 ${desktopSearchOpen ? 'w-36 lg:w-48' : 'w-10'}`}>
                <input
                  ref={desktopSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all..."
                  tabIndex={desktopSearchOpen ? 0 : -1}
                  aria-hidden={!desktopSearchOpen}
                  className={`min-w-0 py-2 text-xs text-white placeholder-emerald-200 bg-transparent focus:outline-none transition-all duration-300 ${desktopSearchOpen ? 'w-full pl-3 pr-10 opacity-100' : 'w-0 pl-0 pr-0 opacity-0'}`}
                />
                <button
                  type="button"
                  onClick={() => setDesktopSearchOpen((open) => !open)}
                  aria-label={desktopSearchOpen ? 'Close search' : 'Open search'}
                  className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-emerald-100 hover:text-white"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <Link to="/wishlist" aria-label="Wishlist" title="Wishlist" className="relative p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/10 group transition-all duration-300">
              <Heart className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
              {wishlistIds.size > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                  {wishlistIds.size}
                </span>
              )}
            </Link>
            <Link to="/cart" aria-label="Cart" title="Cart" className="relative p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/10 group transition-all duration-300">
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link to="/profile" aria-label={`Profile${displayName ? `: ${displayName}` : ''}`} title={displayName || 'My Profile'} className="hidden md:flex text-emerald-100 hover:text-white transition-colors duration-300 items-center gap-2 group">
                <div className="h-9 w-9 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors flex items-center justify-center">
                  <span className="text-xs font-bold tracking-wide text-white">{profileInitials}</span>
                </div>
                <span className="hidden lg:block max-w-24 truncate text-sm font-medium">{displayName.split(/\s+/)[0] || 'Profile'}</span>
              </Link>
            ) : (
              <Link to="/login" className="hidden md:flex bg-white text-emerald-700 px-4 py-2 rounded-lg font-medium hover:bg-yellow-200 transition-all duration-300 transform hover:scale-105 text-sm">
                Login
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:block px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm transform hover:scale-105 bg-white/20 text-white hover:bg-white/30"
              >
                Admin
              </Link>
            )}

            {/* Mobile Search + Menu */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden text-emerald-100 hover:text-white"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-emerald-100 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div ref={searchRef} className="md:hidden border-t border-emerald-500 bg-emerald-800 relative">
            <div className="px-4 py-3">
              <form onSubmit={(e) => { handleSearchSubmit(e); setMobileSearchOpen(false) }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all products..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-emerald-200 border border-white/20 focus:outline-none focus:bg-white/25 focus:border-white/40 text-sm"
                  />
                </div>
              </form>
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full bg-emerald-800 border-t border-emerald-500 shadow-xl rounded-b-xl overflow-hidden z-50">
                {searchResults.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); setSearchResults([]) }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-700 overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        <img src={getImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-300 text-xs">N/A</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{p.product_name}</p>
                      <p className="text-xs text-emerald-300">{p.price != null ? `Rs. ${p.price}` : 'Price on request'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {searching && (
              <div className="px-4 py-2 text-xs text-emerald-300">Searching...</div>
            )}
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-500 bg-emerald-800 pb-4 max-h-[80vh] overflow-y-auto">

            <Link
              to="/"
              className={`block px-4 py-3 rounded font-medium text-base transition-all duration-300 ${
                isActive('/')
                  ? 'bg-white text-emerald-700 shadow-lg mx-3 rounded-lg'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            <div className="px-4 py-2 text-sm font-semibold text-emerald-300 uppercase tracking-wider mt-2">Categories</div>
            <div className="space-y-1 mx-3 rounded-lg overflow-hidden">
              <Link
                to="/products"
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                  isProductsPage && !curCategory
                    ? 'bg-white text-emerald-700 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                All Products
              </Link>
              {categories.map((cat) => {
                const slug = toSlug(cat.category_name)
                return (
                <Link
                  key={cat.id}
                  to={`/category/${slug}`}
                  className={`block px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                    curCategory === slug
                      ? 'bg-white text-emerald-700 shadow-md'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {formatName(cat.category_name)}
                </Link>
                )
              })}
            </div>

            <Link
              to="/cart"
              className={`flex items-center gap-2 px-4 py-3 rounded font-medium text-base transition-all duration-300 ${
                isActive('/cart')
                  ? 'bg-white text-emerald-700 shadow-lg mx-3 rounded-lg'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart className="h-5 w-5" />
              Cart {cartCount > 0 && `(${cartCount})`}
            </Link>

            <Link
              to="/wishlist"
              className={`flex items-center gap-2 px-4 py-3 rounded font-medium text-base transition-all duration-300 ${
                isActive('/wishlist')
                  ? 'bg-white text-emerald-700 shadow-lg mx-3 rounded-lg'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Heart className="h-5 w-5" />
              Wishlist {wishlistIds.size > 0 && `(${wishlistIds.size})`}
            </Link>

            {user ? (
              <Link
                to="/profile"
                className={`flex items-center gap-2 px-4 py-3 rounded font-medium text-base transition-all duration-300 ${
                  isActive('/profile')
                    ? 'bg-white text-emerald-700 shadow-lg mx-3 rounded-lg'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                  {profileInitials}
                </span>
                My Profile
              </Link>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-2 px-4 py-3 rounded font-medium text-base transition-all duration-300 ${
                  isActive('/login')
                    ? 'bg-white text-emerald-700 shadow-lg mx-3 rounded-lg'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                Login / Register
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="block px-4 py-3 rounded font-medium text-base transition-all duration-300 text-emerald-100 hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar


