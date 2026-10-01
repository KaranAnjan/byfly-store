import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  BarChart3,
  Truck,
  Users,
  LogOut,
  ArrowLeft,
} from 'lucide-react'

const AdminSidebar = () => {
  const { signOut } = useAuth()
  const location = useLocation()

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/products', icon: Package, label: 'Products & Prices' },
    { to: '/admin/categories', icon: FolderOpen, label: 'Categories' },
    { to: '/admin/stock', icon: BarChart3, label: 'Stock' },
    { to: '/admin/delivery', icon: Truck, label: 'Delivery' },
    { to: '/admin/wholesale-accounts', icon: Users, label: 'Wholesale Accounts' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-emerald-400">Byfly Admin</h2>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              isActive(link.to)
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <link.icon className="h-5 w-5" />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-gray-700 pt-4">
        <Link
          to="/"
          className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Site</span>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition w-full"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export default AdminSidebar
