import { useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { useCategories } from '../../hooks/useCategories'
import { getImageUrl } from '../../lib/supabaseClient'
import { toSlug, formatName } from '../../lib/utils'
import HeroSection from '../../components/public/HeroSection'
import ProductGrid from '../../components/public/ProductGrid'
import Loading from '../../components/common/Loading'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Shield, Truck, Award, Gem, Heart, ArrowRight } from 'lucide-react'

const Home = () => {
  const { products, loading } = useProducts()
  const { categories } = useCategories()
  const [selectedCategory, setSelectedCategory] = useState(null)

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products.slice(0, 8)

  const categoryImageMap = useMemo(() => {
    const map = {}
    for (const p of products) {
      if (p.category_id && p.image_url && !map[p.category_id]) {
        map[p.category_id] = getImageUrl(p.image_url)
      }
    }
    return map
  }, [products])

  const features = [
    {
      icon: Gem,
      title: 'Premium Quality',
      desc: 'Handpicked items with finest craftsmanship, ensuring every piece meets our standards.',
      bgLight: 'bg-emerald-50',
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      desc: 'Quick and reliable shipping nationwide with secure packaging and real-time tracking.',
      bgLight: 'bg-pink-50',
    },
    {
      icon: Shield,
      title: 'Authentic Products',
      desc: '100% genuine items guaranteed. Every purchase comes with our authenticity promise.',
      bgLight: 'bg-blue-50',
    },
    {
      icon: Award,
      title: 'Easy Returns',
      desc: 'Hassle-free returns within 7 days. Your satisfaction is our top priority.',
      bgLight: 'bg-amber-50',
    },
    {
      icon: Sparkles,
      title: 'Handcrafted Designs',
      desc: 'Each piece is uniquely designed by skilled artisans with attention to every detail.',
      bgLight: 'bg-emerald-50',
    },
    {
      icon: Heart,
      title: 'Customer Love',
      desc: 'Thousands of happy customers across India trust us for their special moments.',
      bgLight: 'bg-red-50',
    },
  ]

  return (
    <div className="bg-white min-h-screen">
      <HeroSection />

      {/* Featured Products */}
      <section id="featured" className="bg-gray-50 py-12 md:py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full mb-2">
                Featured
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Products</h2>
            </div>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group"
            >
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <ProductGrid products={filteredProducts} />
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/products"
              className="inline-flex items-center gap-1 text-sm text-emerald-600 font-semibold"
            >
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Browse Our Collections */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-8">
          <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">
            Shop by Category
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Our Collections</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/products"
            onClick={() => setSelectedCategory(null)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 p-5 md:p-6 text-white min-h-[140px] md:min-h-[160px] flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div>
              <h3 className="text-base md:text-lg font-bold">All Products</h3>
              <p className="text-emerald-100 text-xs mt-0.5">View entire collection</p>
            </div>
          </Link>

          {categories.map((cat) => {
            const slug = toSlug(cat.category_name)
            const bgImage = categoryImageMap[cat.id]
            return (
            <Link
              key={cat.id}
              to={`/category/${slug}`}
              className={`group relative overflow-hidden rounded-xl min-h-[140px] md:min-h-[160px] flex flex-col justify-end p-5 md:p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${bgImage ? '' : 'bg-gradient-to-br from-emerald-600 to-emerald-800'}`}
              style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/70 transition-all duration-300"></div>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10">
                <h3 className="text-base md:text-lg font-bold text-white drop-shadow-sm">
                  {formatName(cat.category_name)}
                </h3>
                <p className="text-white/80 text-xs mt-0.5 drop-shadow-sm">Explore →</p>
              </div>
            </Link>
            )
          })}
        </div>
      </section>

      {/* Why Choose Byfly */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">
              Why Us
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Why Choose Byfly?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  className="group relative bg-white p-5 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-emerald-100"
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${feature.bgLight} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-emerald-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>


    </div>
  )
}

export default Home
