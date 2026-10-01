import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { useProducts, SKIP_FETCH } from '../../hooks/useProducts'
import { useCategories } from '../../hooks/useCategories'
import { toSlug, formatName } from '../../lib/utils'
import ProductGrid from '../../components/public/ProductGrid'
import Loading from '../../components/common/Loading'
import { Search, ChevronRight } from 'lucide-react'

const CATEGORY_NAMES = {
  'fashion-jewellery': 'Fashion Jewellery',
  gifts: 'Gifts',
  cosmetics: 'Cosmetics',
}

const Products = () => {
  const { slug: routeSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories, loading: catLoading } = useCategories()

  const categorySlug = routeSlug || searchParams.get('category')
  const urlSearch = searchParams.get('search') || ''

  const matchedCategory = useMemo(() => {
    if (!categorySlug || categories.length === 0) return null
    return categories.find((c) => toSlug(c.category_name) === categorySlug) || null
  }, [categorySlug, categories])

  const ready = !categorySlug || (!catLoading && categories.length > 0)
  const selectedCategory = ready ? (matchedCategory?.id || null) : SKIP_FETCH
  const { products, loading: prodLoading } = useProducts(selectedCategory)

  const [localSearch, setLocalSearch] = useState(urlSearch)

  useEffect(() => {
    setLocalSearch(urlSearch)
    window.scrollTo(0, 0)
  }, [urlSearch, categorySlug])

  const filteredProducts = products.filter((p) => {
    if (!localSearch) return true
    const q = localSearch.toLowerCase()
    return (
      p.product_name.toLowerCase().includes(q) ||
      p.product_code.toLowerCase().includes(q)
    )
  })

  const updateSearch = (value) => {
    setLocalSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value.trim()) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    setSearchParams(params, { replace: true })
  }

  const displayName = categorySlug
    ? CATEGORY_NAMES[categorySlug] || formatName(categorySlug.replace(/-/g, ' '))
    : 'All Products'

  const title = localSearch ? `Search: "${localSearch}"` : displayName

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb - static, no loading needed */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
          {categorySlug && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/category/${categorySlug}`} className="hover:text-emerald-600 transition-colors text-gray-600 font-medium">{displayName}</Link>
            </>
          )}
        </nav>

        {/* Header - static, shows immediately */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
            {!(prodLoading || (categorySlug && catLoading)) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => updateSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
            />
          </div>
        </div>

        {/* Product Grid - loading only affects this */}
        {prodLoading || (categorySlug && catLoading) ? <Loading /> : <ProductGrid products={filteredProducts} />}
      </div>
    </div>
  )
}

export default Products
