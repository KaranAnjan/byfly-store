import { Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'
import { toSlug, formatName } from '../../lib/utils'

const Footer = () => {
  const { categories } = useCategories()

  return (
    <footer className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-base font-bold text-white mb-2">Byfly</h3>
            <p className="text-xs text-emerald-200 leading-relaxed mb-3">
              Premium fashion jewellery and curated gift collections.
            </p>
            <div className="space-y-1.5 text-xs text-emerald-200">
              <a href="tel:+919339746144" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5 text-emerald-300" />
                +91 9339746144
              </a>
              <a href="mailto:info@monimala.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="h-3.5 w-3.5 text-emerald-300" />
                info@monimala.com
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                India
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">Categories</h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/products" className="text-xs text-emerald-200 hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              {categories.map((cat) => {
                const slug = toSlug(cat.category_name)
                return (
                  <li key={cat.id}>
                    <Link to={`/category/${slug}`} className="text-xs text-emerald-200 hover:text-white transition-colors">
                      {formatName(cat.category_name)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-1.5">
              <li><Link to="/" className="text-xs text-emerald-200 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="text-xs text-emerald-200 hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/cart" className="text-xs text-emerald-200 hover:text-white transition-colors">Cart</Link></li>
              <li><Link to="/profile" className="text-xs text-emerald-200 hover:text-white transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">Follow Us</h4>
            <div className="flex gap-2 mb-3">
              <a href="#" className="bg-emerald-500 hover:bg-yellow-300 p-2 rounded-lg transition-colors group">
                <Facebook className="h-4 w-4 text-white group-hover:text-emerald-700" />
              </a>
              <a href="#" className="bg-emerald-500 hover:bg-yellow-300 p-2 rounded-lg transition-colors group">
                <Instagram className="h-4 w-4 text-white group-hover:text-emerald-700" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-emerald-500 pt-4 text-center">
          <p className="text-xs text-emerald-200">
            &copy; 2024 Byfly. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
