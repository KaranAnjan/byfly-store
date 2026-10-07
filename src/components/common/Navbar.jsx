import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, Search, Heart, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useState, useEffect, useRef } from 'react'
import { toSlug } from '../../lib/utils'
import { visibleAccountEmail } from '../../lib/accountIdentity'
import { supabase } from '../../lib/supabaseClient'
import { attachProductPrices, normalizeStoreProduct } from '../../lib/storeCatalog'

const STATIC_CATEGORY_ITEMS = [
  { key: 'cosmetics', label: 'Cosmetics' },
  { key: 'jewellery', label: 'Jewellery' },
  { key: 'gifts', label: 'Gifts' },
  { key: 'toys', label: 'Toys' },
]

const SearchResultsList = ({ results, searching }) => (
  <div className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(26rem,70vh)] overflow-y-auto rounded-xl border border-emerald-200/20 bg-emerald-900/95 p-2 shadow-2xl backdrop-blur-md">
    {searching && <div className="px-3 py-3 text-sm text-emerald-200">Searching...</div>}
    {!searching && results.length === 0 && <div className="px-3 py-3 text-sm text-emerald-200">No products found.</div>}
    {results.map((product) => (
      <Link
        key={product.id}
        to={`/products/${product.id}`}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/10"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{product.product_name}</p>
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-emerald-300" />
      </Link>
    ))}
  </div>
)

const Navbar = () => {
  const { cart } = useCart()
  const { wishlistIds } = useWishlist()
  const { user, profileSummary, isAdmin } = useAuth()
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories()
  const safeCategories = Array.isArray(categories) ? categories : []
  const fetchedCategoryMap = new Map(
    safeCategories.map((category) => [String(category.category_name || '').trim().toLowerCase(), category])
  )
  const staticCategories = STATIC_CATEGORY_ITEMS.map((category) => {
    const fetchedCategory = fetchedCategoryMap.get(category.label.toLowerCase())
    return {
      ...category,
      slug: fetchedCategory ? toSlug(fetchedCategory.category_name) : category.key,
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '')
  const location = useLocation()
  const navigate = useNavigate()
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
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
    setSearchOpen(false)
    setSearchResults([])
    setSearchQuery(new URLSearchParams(location.search).get('search') || '')
  }, [location.pathname, location.search])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query || !searchOpen) {
      setSearchResults([])
      return undefined
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const q = query.toLowerCase()
      const { data } = await supabase
        .from('products')
        .select('id, product_name, product_code, image_url, stock, price, mrp, product_stock(retail_quantity,wholesale_quantity)')
        .or(`product_name.ilike.%${q}%,product_code.ilike.%${q}%`)
        .limit(8)
      const productsWithPrices = await attachProductPrices(data || [])
      setSearchResults(productsWithPrices.map(normalizeStoreProduct))
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchOpen])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setMobileSearchOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/products?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
    setMobileSearchOpen(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
  }

  const isActive = (path) => location.pathname === path
  const isHomePage = location.pathname === '/'
  const isTransparentAtTop = isHomePage && !isScrolled
  const pathPart = location.pathname.match(/^\/category\/(.+)/)?.[1]
  const curCategory = pathPart || new URLSearchParams(location.search).get('category')
  const isProductsPage = location.pathname === '/products' || !!pathPart

  return (
    <nav ref={searchRef} className={`${isHomePage ? 'fixed top-0 left-0 right-0' : 'sticky top-0'} z-50 bg-transparent transition-shadow duration-300 ${isTransparentAtTop ? 'shadow-none' : 'shadow-xl'}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 transition-opacity duration-300 ease-out ${isTransparentAtTop ? 'opacity-0' : 'opacity-100'}`} />
      <div className="max-w-7xl mx-auto px-4">
        <div className={`relative z-10 flex justify-between items-center transition-[height] duration-300 ease-out ${isScrolled ? 'h-16' : 'h-20'}`}>
          {/* Byfly brand */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-all duration-300 flex-shrink-0 group">
            <span className="relative block h-[3.15rem] w-16 overflow-hidden md:h-[3.4rem] md:w-[4.5rem]">
              <img src="/assets/logo.png" alt="BYFLY logo" className="absolute left-0 top-0 h-auto w-full max-w-none" />
            </span>
            <div className="block">
              <p className="text-lg font-extrabold italic leading-none tracking-[0.12em] text-white md:text-xl">BYFLY</p>
              <p className="mt-1 whitespace-nowrap text-[9px] uppercase leading-tight tracking-[0.04em] text-emerald-100">WHOLE SALE STORE</p>
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

            {staticCategories.map((cat) => {
              const slug = cat.slug
              return (
              <Link
                key={cat.key}
                to={`/category/${slug}`}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                  curCategory === slug
                    ? 'bg-white text-emerald-700 shadow-lg scale-105'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </Link>
              )
            })}

          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 md:gap-5">
            <form onSubmit={handleSearchSubmit} className="relative hidden md:flex items-center">
              <div className={`group relative flex items-center overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all duration-300 ${searchQuery ? 'w-36 lg:w-48' : 'w-10 hover:w-36 lg:hover:w-48'}`}>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                  placeholder="Search all..."
                  className={`min-w-0 py-2 text-xs text-white placeholder-emerald-200 bg-transparent transition-all duration-300 focus:outline-none ${searchQuery ? 'w-full pl-3 pr-10 opacity-100' : 'w-0 pl-0 pr-0 opacity-0 group-hover:w-full group-hover:pl-3 group-hover:pr-10 group-hover:opacity-100'}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="absolute right-10 top-0 h-full w-7 items-center justify-center rounded-lg text-emerald-200 transition-colors hover:text-white group-hover:flex"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Search"
                  className="group absolute right-0 top-0 h-full w-10 flex items-center justify-center rounded-lg text-emerald-100 transition-all duration-200 hover:bg-white/10 hover:text-white"
                >
                  <Search className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                </button>
              </div>
              {searchOpen && (searchResults.length > 0 || searching || searchQuery.trim()) && (
                <SearchResultsList results={searchResults} searching={searching} />
              )}
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
              onClick={() => {
                setMobileSearchOpen((open) => !open)
                setSearchOpen(true)
                setMobileMenuOpen(false)
              }}
              className="group rounded-full p-1 text-emerald-100 transition-all duration-200 hover:bg-white/10 hover:text-white md:hidden"
            >
              <Search className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen((open) => !open)
                setMobileSearchOpen(false)
              }}
              className="md:hidden text-emerald-100 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="relative z-50 md:hidden border-t border-emerald-500 bg-emerald-800">
            <div className="px-4 py-3">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                    placeholder="Search all products..."
                    className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-white/15 text-white placeholder-emerald-200 border border-white/20 focus:outline-none focus:bg-white/25 focus:border-white/40 text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Clear search"
                      className="absolute right-10 top-1/2 -translate-y-1/2 rounded-full p-1 text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/15 px-2.5 py-1.5 text-emerald-100 transition-colors hover:bg-white/25 hover:text-white"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
            {searchOpen && (searchResults.length > 0 || searching || searchQuery.trim()) && (
              <SearchResultsList results={searchResults} searching={searching} />
            )}
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="relative z-50 w-full md:hidden border-t border-emerald-500 bg-emerald-800 pb-4 max-h-[80vh] overflow-y-auto">

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
              {staticCategories.map((cat) => {
                const slug = cat.slug
                return (
                <Link
                  key={cat.key}
                  to={`/category/${slug}`}
                  className={`block px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                    curCategory === slug
                      ? 'bg-white text-emerald-700 shadow-md'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat.label}
                </Link>
                )
              })}
              {categoriesLoading && (
                <div className="px-4 py-2.5 text-sm text-emerald-300" role="status">
                  Loading categories...
                </div>
              )}
              {!categoriesLoading && categoriesError && (
                <button
                  type="button"
                  onClick={refetchCategories}
                  className="block w-full px-4 py-2.5 text-left text-sm text-emerald-200 hover:bg-white/10"
                >
                  Categories unavailable. Tap to retry.
                </button>
              )}
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


