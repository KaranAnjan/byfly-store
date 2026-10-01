import { useProducts } from '../../hooks/useProducts'
import { useCategories } from '../../hooks/useCategories'
import { Package, FolderOpen, AlertTriangle, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const { products } = useProducts()
  const { categories } = useCategories()

  const totalProducts = products.length
  const totalCategories = categories.length
  const outOfStock = products.filter((p) => p.stock === 0).length
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Categories',
      value: totalCategories,
      icon: FolderOpen,
      color: 'bg-green-500',
    },
    {
      label: 'Out of Stock',
      value: outOfStock,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      label: 'Low Stock (≤10)',
      value: lowStock,
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4"
          >
            <div
              className={`${stat.color} p-3 rounded-lg text-white`}
            >
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent low stock items */}
      {lowStock > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">
            ⚠️ Low Stock Alert
          </h3>
          <div className="space-y-2">
            {products
              .filter((p) => p.stock > 0 && p.stock <= 10)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm text-yellow-700"
                >
                  <span>{p.product_name}</span>
                  <span className="font-bold">{p.stock} left</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard