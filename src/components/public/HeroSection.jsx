import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, getImageUrl } from '../../lib/supabaseClient'

const HeroSection = () => {
  const [heroImages, setHeroImages] = useState([])
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    let active = true
    const fetchHeroImage = async () => {
      const { data } = await supabase
        .from('products')
        .select('image_url')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6)
      if (active && data) {
        const images = [...new Set(data.map((product) => product.image_url).filter(Boolean))]
          .map((imagePath) => getImageUrl(imagePath))
        setHeroImages(images)
      }
    }
    fetchHeroImage()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (heroImages.length < 2) return undefined
    const timer = setInterval(() => {
      setActiveImage((index) => (index + 1) % heroImages.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroImages.length])

  const showPreviousImage = () => {
    setActiveImage((index) => (index - 1 + heroImages.length) % heroImages.length)
  }

  const showNextImage = () => {
    setActiveImage((index) => (index + 1) % heroImages.length)
  }

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-950 text-white flex items-center">
      {heroImages.map((image, index) => (
        <img
          key={image}
          src={image}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-1000 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-emerald-950/65 to-black/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

      <div className="w-full max-w-7xl mx-auto px-6 py-20 md:py-24">
        <div className="max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Premium Fashion Jewellery House
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
            Little details.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">
              Lasting sparkle.
            </span>
          </h1>

          <p className="mt-6 max-w-xl mx-auto md:mx-0 text-base sm:text-lg text-emerald-50/90 leading-relaxed">
            Discover thoughtful gifts and jewellery made for every moment worth celebrating.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-emerald-800 shadow-lg transition hover:bg-yellow-200 hover:shadow-xl active:scale-95"
            >
              Explore Collection
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/products?category=gifts"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-black/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Gift Ideas
            </Link>
          </div>
        </div>
      </div>

      <a href="#featured" aria-label="Scroll to featured products" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/75 animate-bounce">
        <ChevronDown className="h-6 w-6" />
      </a>

      {heroImages.length > 1 && (
        <div className="absolute bottom-5 right-5 sm:right-8 flex items-center gap-3 rounded-full border border-white/20 bg-black/35 px-2 py-2 text-white backdrop-blur-md">
          <button
            type="button"
            onClick={showPreviousImage}
            aria-label="Previous hero image"
            className="rounded-full p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-10 text-center text-xs font-medium tabular-nums" aria-live="polite">
            {activeImage + 1} / {heroImages.length}
          </span>
          <button
            type="button"
            onClick={showNextImage}
            aria-label="Next hero image"
            className="rounded-full p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  )
}

export default HeroSection
